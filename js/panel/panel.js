/*
 * File: js/panel/panel.js
 * Purpose: The report panel every chart sits in: title, takeaway, chart or table, legend, source line, controls.
 *          It builds the report for the current comparison, redraws on store changes, and keeps a few choices
 *          of its own (builder options, the selected insight) until the shared comparison changes.
 * Provides: TAP.panel (create)
 * Depends on: js/panel/panel-*.js, js/engine/registry.js, js/engine/scope.js, js/core/store.js, js/core/content.js,
 *             js/core/format.js, js/core/sources.js, js/ui/layers.js, js/ui/explain.js (all read at call time)
 * Used by: every view
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var REDRAW = ['cmp', 'industry', 'hiddenInsights', 'highlight', 'scopeEpoch', 'expanded'];

  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }

  // Choices that last only while the shared comparison stays the same (ARCHITECTURE section 5).
  function scoped() { return { opts: {}, highlight: null, selected: null }; }

  /* ---------- what to build ---------- */

  // The industry a one-industry report shows: the view's choice, else the one selected, else the first rated.
  function industryOf(p, def, s) {
    var o = (def && def.options) || {};
    if (!def || (!o.industryPicker && def.dimension !== 'rating' && def.title.indexOf('{industry}') < 0)) return null;
    var rated = TAP.data.industries({ rated: true }), id = p.opts.industryId || s.industry;
    var ok = rated.some(function (d) { return d.id === id; });
    return ok ? id : (rated[0] ? rated[0].id : null);
  }

  function titleOf(def, industryId) {
    if (!def || !def.title) return def ? def.id : '';
    var ind = industryId ? TAP.data.industry(industryId) : null;
    return def.title.replace(/\{industry\}/g, ind ? ind.name : '');
  }

  function highlightOf(p, s) {
    if (p.st.highlight) return p.st.highlight;
    return s.highlight && s.highlight.reportId === p.id ? s.highlight : null;
  }

  // Validates and builds. Returns {def, ctx, res, errors}; every problem stays inside this panel.
  function build(p, s) {
    var def = TAP.reports.get(p.id), errors = TAP.reports.validate(def), cmp = s.cmp;
    var industryId = industryOf(p, def, s);
    var ctx = def ? { def: def, type: def.defaultType, measureId: null, sizeId: null, breakdown: null, cmp: cmp,
      entities: TAP.scope.entities(cmp), year: null, industryId: industryId, highlight: highlightOf(p, s),
      expanded: s.expanded === p.id, theme: window.TAP_THEME, opts: Object.assign({}, p.st.opts) } : null;
    var res = null, fn = !errors.length && builderOf(def);
    if (!errors.length && !fn) errors = [t('noBuilder', { shape: def.shape })];
    if (fn) {
      try { res = fn(ctx) || {}; } catch (e) { errors = [e.message]; }
      if (res && res.error) errors = [res.error];
    }
    return { def: def, ctx: ctx, res: res, errors: errors, title: titleOf(def, industryId), industryId: industryId };
  }

  /* ---------- what a click does ---------- */

  // One industry named: select it. A region named too: open its details (ARCHITECTURE section 10).
  function follow(target) {
    if (!target) return;
    var inds = target.industryIds || [];
    if (inds.length === 1) TAP.bus.emit('industry:select', { industryId: inds[0] });
    if ((target.regionIds || []).length) TAP.layers.openDetails(target);
  }

  function explain(def) {
    if (TAP.explain && !TAP.explain.__stub) { TAP.explain.open(def.id); return; }
    TAP.layers.open('explain', { title: t('aboutLabel'), render: function (body) {
      var seen = {};
      ['shows', 'read', 'lookFor'].forEach(function (k) {
        body.appendChild(el('section', { class: 'tap-panel__explain' }, [
          el('h3', null, t(k)), el('p', { html: TAP.content.mark((def.explain || {})[k] || '', seen) })
        ]));
      });
    } });
  }

  /* ---------- drawing ---------- */

  function source(def) {
    var kinds = ((def && def.sources) || []).map(function (k) { return TAP.format.kind(k); });
    return el('footer', { class: 'tap-panel__source' }, kinds.map(function (k) {
      return el('span', { class: 'tap-kind' }, [el('span', { class: 'tap-kind__glyph', 'aria-hidden': 'true' }, k.glyph), ' ', k.label]);
    }).concat([el('span', { class: 'tap-panel__date' }, t('dataDate', { date: TAP.format.date(TAP.sources.dataDate()) }))]));
  }

  function tools(p, b, info) {
    var box = el('div', { class: 'tap-panel__tools', role: 'toolbar', 'aria-label': t('tools') }), M = TAP.panelMenus;
    box.appendChild(M.button('insights', 'insight', t('insights'), { count: info.count, expanded: p.st.pop === 'ins',
      aria: t('insightsCount', { n: info.count }), disabled: !info.count, onclick: function () { toggle(p, 'ins'); } }));
    box.appendChild(M.button('about', 'info', t('about'), { aria: t('aboutLabel'),
      onclick: function () { if (b.def) explain(b.def); } }));
    if (p.st.pop === 'ins' && info.count) {
      var box2 = M.pop(t('insightsTitle'));
      TAP.panelInsights.render(box2, info, insightHandlers(p, b));
      box.appendChild(box2);
    }
    return box;
  }

  function insightHandlers(p, b) {
    return {
      selected: p.st.selected, seen: p.seen,
      onSelect: function (ins) {
        var off = p.st.selected === ins.id;
        p.st.selected = off ? null : ins.id;
        p.st.sentence = off ? null : ins.sentence;
        p.st.highlight = off ? null : TAP.panelInsights.target(ins, p.id);
        render(p);
      },
      onHide: function (ins) {
        if (p.st.selected === ins.id) { p.st.selected = null; p.st.highlight = null; }
        TAP.insights.hide(ins.id);
        render(p);
      },
      onShowAll: function () { p.st.pop = null; TAP.store.set({ view: 'insights' }); },
      onClose: function () { toggle(p, null); }
    };
  }

  function toggle(p, name) { p.st.pop = p.st.pop === name ? null : name; render(p); }

  // The strip above the chart repeats what is highlighted, so it reads even without colour.
  function strip(p, s) {
    var mine = !!p.st.selected, hl = highlightOf(p, s);
    if (!hl) return null;
    return el('div', { class: 'tap-panel__strip', role: 'status' }, [
      el('span', { class: 'tap-panel__strip-label' }, [el('span', { class: 'tap-panel__ring', 'aria-hidden': 'true' }),
        mine ? t('highlighted') : t('highlightedTarget')]),
      mine ? el('span', { class: 'tap-panel__strip-text' }, p.st.sentence || '') : null,
      el('button', { type: 'button', class: 'tap-btn', 'data-action': 'clear-highlight', onclick: function () {
        if (p.st.highlight) { p.st.highlight = null; p.st.selected = null; render(p); } else TAP.store.set({ highlight: null });
      } }, t('clear'))
    ]);
  }

  function controls(p, b) {
    var o = (b.def && b.def.options) || {};
    return TAP.panelMenus.render({
      industry: o.industryPicker ? { value: b.industryId, onPick: function (id) {
        p.opts.industryId = id;   // shown at once; the view may then move state.industry, which wins
        TAP.bus.emit('industry:select', { industryId: id });
        render(p);
      } } : null,
      builder: (b.res && b.res.controls) || [],
      onBuilder: function (key, v) { p.st.opts[key] = v; render(p); }
    });
  }

  function body(p, b, s) {
    var box = el('div', { class: 'tap-panel__body' }), C = TAP.panelChart, res = b.res;
    if (b.errors.length || !res) { C.dispose(p.cs); C.error(box, b.errors); return box; }
    if (res.empty) { C.dispose(p.cs); C.empty(box, res.missing); return box; }
    if (res.html) {
      C.dispose(p.cs);
      C.html(box, res.html, function (d) { follow(res.target ? res.target({ data: d }) : null); });
    } else if (res.option) {
      C.render(p.cs, box, res.option, { label: b.title, tall: /bubble|scatter/.test(b.ctx.type || ''),
        scale: s.expanded === p.id ? 1.3 : 1, onClick: function (prm) { follow(res.target ? res.target(prm) : null); } });
    } else C.dispose(p.cs);
    return box;
  }

  // Keeps keyboard focus on the same control across a redraw.
  function focusKey(p) {
    var a = document.activeElement;
    if (!a || !p.root.contains(a)) return null;
    var k = ['data-action', 'data-control', 'data-value'].filter(function (n) { return a.hasAttribute(n); })
      .map(function (n) { return '[' + n + '="' + a.getAttribute(n) + '"]'; }).join('');
    return k || null;
  }

  function render(p) {
    if (!p.live) return;
    var s = TAP.store.get(), keep = focusKey(p);
    p.seen = {};   // glossary terms are marked once per panel
    var b = build(p, s), info = TAP.panelInsights.get(s.cmp, p.id), ok = !b.errors.length && b.res && !b.res.empty;
    if (p.root.isConnected) p.wasConnected = true;
    TAP.dom.clear(p.root);
    p.root.setAttribute('aria-label', b.title);

    var takeaway = el('p', { class: 'tap-panel__takeaway', 'aria-live': 'polite', 'data-tour': 'takeaway' });
    TAP.dom.append(p.root, [
      el('header', { class: 'tap-panel__head' }, [
        el('div', { class: 'tap-panel__titles' }, [
          el('h2', { class: 'tap-panel__title', html: TAP.content.mark(b.title, p.seen) }),
          TAP.panelInsights.takeaway(takeaway, ok ? info.top : null, p.seen, insightHandlers(p, b).onHide)
        ]),
        tools(p, b, info)
      ]),
      b.def && !b.errors.length ? controls(p, b) : null,
      ok ? strip(p, s) : null,
      body(p, b, s),
      ok ? TAP.panelChart.legend(b.res) : null,
      ok ? TAP.panelChart.notes(b.res) : null,
      source(b.def)
    ]);
    var back = keep && TAP.dom.qs(keep, p.root);
    if (back && back.focus) back.focus();
  }

  /* ---------- life cycle ---------- */

  function onStore(p, s, changed) {
    if (!p.live) return;
    if (p.wasConnected && !p.root.isConnected) { destroy(p); return; }   // removed without destroy()
    if (changed.indexOf('scopeEpoch') >= 0) Object.assign(p.st, scoped());
    if (changed.indexOf('industry') >= 0) p.opts.industryId = null;
    if (REDRAW.some(function (k) { return changed.indexOf(k) >= 0; })) render(p);
  }

  function destroy(p) {
    if (!p.live) return;
    p.live = false;
    p.off.forEach(function (fn) { fn(); });
    TAP.panelChart.dispose(p.cs);
    if (p.root.parentNode) p.root.parentNode.removeChild(p.root);
  }

  // Popovers close on an outside click or Esc. Esc is marked as handled so side panels leave it alone.
  function listen(p) {
    function down(e) {
      var box = TAP.dom.qs('.tap-panel__tools', p.root);
      if (p.st.pop && !(box && box.contains(e.target))) { p.st.pop = null; render(p); }
    }
    function key(e) {
      if (e.key !== 'Escape' || e.defaultPrevented || !p.st.pop) return;
      e.preventDefault();
      p.st.pop = null;
      render(p);
    }
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    p.off.push(function () { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); });
    p.off.push(TAP.store.on(function (s, changed) { onStore(p, s, changed); }));
  }

  function create(host, reportId, opts) {
    var p = { id: reportId, opts: Object.assign({}, opts || {}), st: Object.assign({ pop: null }, scoped()), cs: {}, off: [], live: true };
    p.root = el('section', { class: 'tap-panel', 'data-report': reportId, 'data-tour': 'panel' });
    host.appendChild(p.root);
    listen(p);
    render(p);
    return {
      id: reportId, el: p.root,
      refresh: function () { render(p); },
      highlight: function (target) { p.st.highlight = target || null; p.st.selected = null; render(p); },
      expand: function (on) { TAP.store.set({ expanded: on ? reportId : null }); },
      destroy: function () { destroy(p); }
    };
  }

  TAP.panel = { create: create };
})(window.TAP);
