/*
 * File: js/panel/panel.js
 * Purpose: The report panel every chart sits in: title, takeaway, chart or table, legend, source line, controls.
 *          It builds the report for the current comparison and redraws on store changes. It keeps the chart
 *          type and measure for the session (the type is also remembered in the browser), and a few choices
 *          (builder options, the selected insight) only until the shared comparison changes.
 * Provides: TAP.panel (create)
 * Depends on: js/panel/panel-*.js, js/engine/registry.js, js/engine/scope.js, js/core/store.js, js/core/storage.js,
 *             js/core/content.js, js/core/format.js, js/core/sources.js, js/ui/layers.js (all read at call time)
 * Used by: every view
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var REDRAW = ['cmp', 'industry', 'hiddenInsights', 'highlight', 'scopeEpoch', 'expanded'];

  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }

  // Choices that last only while the shared comparison stays the same (ARCHITECTURE section 5).
  function scoped() { return { opts: {}, highlight: null, selected: null, sentence: null }; }
  // Choices that last until "Reset all charts".
  function lasting(id) { return { type: remembered(id), measureId: null, sizeId: null }; }

  // The browser may block storage, or the storage module may fail: the panel then simply uses defaults.
  function remembered(id) { try { return TAP.storage.get('chart:' + id, null); } catch (e) { return null; } }
  function remember(id, type) { try { if (type) TAP.storage.set('chart:' + id, type); else TAP.storage.remove('chart:' + id); } catch (e) { /* defaults */ } }

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

  // Validates and builds. Returns {def, ctx, res, errors, types, ...}; every problem stays inside this panel.
  function build(p, s) {
    var def = TAP.reports.get(p.id), errors = TAP.reports.validate(def), cmp = s.cmp;
    var industryId = industryOf(p, def, s), entities = TAP.scope.entities(cmp);
    var types = def && !errors.length ? TAP.panelMenus.types(def, entities.length, p.st) : null;
    var ctx = def ? { def: def, type: types ? types.current : def.defaultType, measureId: p.st.measureId,
      sizeId: p.st.sizeId, breakdown: null, cmp: cmp, entities: entities, year: null, industryId: industryId,
      highlight: highlightOf(p, s), expanded: s.expanded === p.id, theme: window.TAP_THEME, opts: Object.assign({}, p.st.opts) } : null;
    var res = null, fn = !errors.length && builderOf(def);
    if (!errors.length && !fn) errors = [t('noBuilder', { shape: def.shape })];
    if (fn) {
      try { res = fn(ctx) || {}; } catch (e) { errors = [e.message]; }
      if (res && res.error) errors = [res.error];
    }
    return { def: def, ctx: ctx, res: res, errors: errors, types: types, title: titleOf(def, industryId), industryId: industryId };
  }

  // One industry named: select it. A region named too: open its details (ARCHITECTURE section 10).
  function follow(target) {
    if (!target) return;
    var inds = target.industryIds || [];
    if (inds.length === 1) TAP.bus.emit('industry:select', { industryId: inds[0] });
    if ((target.regionIds || []).length) TAP.layers.openDetails(target);
  }

  /* ---------- drawing ---------- */

  function source(def) {
    var kinds = ((def && def.sources) || []).map(function (k) { return TAP.format.kind(k); });
    return el('footer', { class: 'tap-panel__source' }, kinds.map(function (k) {
      return el('span', { class: 'tap-kind' }, [el('span', { class: 'tap-kind__glyph', 'aria-hidden': 'true' }, k.glyph), ' ', k.label]);
    }).concat([el('span', { class: 'tap-panel__date' }, t('dataDate', { date: TAP.format.date(TAP.sources.dataDate()) }))]));
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
    var k = ['data-action', 'data-control', 'data-value', 'data-type'].filter(function (n) { return a.hasAttribute(n); })
      .map(function (n) { return '[' + n + '="' + a.getAttribute(n) + '"]'; }).join('');
    return k || null;
  }

  function render(p) {
    if (!p.live) return;
    var s = TAP.store.get(), keep = focusKey(p), I = TAP.panelInsights;
    p.seen = {};   // glossary terms are marked once per panel
    var b = build(p, s), info = I.get(s.cmp, p.id), ok = !b.errors.length && b.res && !b.res.empty;
    if (p.root.isConnected) p.wasConnected = true;
    TAP.dom.clear(p.root);
    p.root.setAttribute('aria-label', b.title);

    var takeaway = el('p', { class: 'tap-panel__takeaway', 'aria-live': 'polite', 'data-tour': 'takeaway' });
    TAP.dom.append(p.root, [
      el('header', { class: 'tap-panel__head' }, [
        el('div', { class: 'tap-panel__titles' }, [
          el('h2', { class: 'tap-panel__title', html: TAP.content.mark(b.title, p.seen) }),
          I.takeaway(takeaway, ok ? info.top : null, p.seen, I.handlers(p).onHide)
        ]),
        TAP.panelMenus.tools(p, b, info)
      ]),
      b.def && !b.errors.length ? TAP.panelMenus.render(TAP.panelMenus.spec(p, b)) : null,
      ok ? I.strip(p, highlightOf(p, s)) : null,
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
      if (p.st.pop && !(box && box.contains(e.target))) p.toggle(null);
    }
    function key(e) {
      if (e.key !== 'Escape' || e.defaultPrevented || !p.st.pop) return;
      e.preventDefault();
      p.toggle(null);
    }
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    p.off.push(function () { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); });
    p.off.push(TAP.store.on(function (s, changed) { onStore(p, s, changed); }));
    // "Reset all charts" (the Guide): every chart back to its default type and settings, nothing remembered
    p.off.push(TAP.bus.on('charts:reset', function () {
      remember(p.id, null);
      Object.assign(p.st, lasting(p.id), scoped(), { pop: null });
      render(p);
    }));
  }

  function create(host, reportId, opts) {
    var p = { id: reportId, opts: Object.assign({}, opts || {}), cs: {}, off: [], live: true };
    p.st = Object.assign({ pop: null }, lasting(reportId), scoped());
    p.render = function () { render(p); };
    p.toggle = function (name) { p.st.pop = name && p.st.pop !== name ? name : null; render(p); };
    p.set = function (patch) { Object.assign(p.st, patch); render(p); };
    p.setType = function (type) {
      var def = TAP.reports.get(reportId);
      remember(reportId, def && type === def.defaultType ? null : type);   // the default needs no memory
      p.set({ type: type, pop: null });
    };
    p.root = el('section', { class: 'tap-panel', 'data-report': reportId, 'data-tour': 'panel' });
    host.appendChild(p.root);
    listen(p);
    render(p);
    return {
      id: reportId, el: p.root,
      refresh: p.render,
      highlight: function (target) { p.set({ highlight: target || null, selected: null, sentence: null }); },
      expand: function (on) { TAP.store.set({ expanded: on ? reportId : null }); },
      destroy: function () { destroy(p); }
    };
  }

  TAP.panel = { create: create };
})(window.TAP);
