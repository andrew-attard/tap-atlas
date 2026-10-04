/*
 * File: js/panel/panel.js
 * Purpose: The report panel every chart sits in: title, takeaway, chart or table, legend, source line, controls.
 *          It builds the report for the current comparison and redraws on store changes. It keeps the chart
 *          type and measure for the session (the type is also remembered in the browser), and a few choices
 *          (builder options, the selected insight) only until the shared comparison changes. List reports and
 *          builder option clicks: ARCHITECTURE 17.4. A page may fix a panel's comparison with opts.cmp (#216).
 * Provides: TAP.panel (create)
 * Depends on: js/panel/panel-expand.js, js/panel/panel-*.js, js/engine/registry.js, scope.js, js/core/store.js, storage.js, content.js, format.js,
 *             sources.js, dom.js, icons.js, data.js, js/ui/layers.js, shell.js (label), js/theme.js (all at call time)
 * Used by: js/views/overview.js, js/views/industry.js, js/ui/view-head.js (mountPanel), and through it the Phase 2
 *          views: new-business.js, customers.js, partners.js, regions.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var REDRAW = ['cmp', 'industry', 'hiddenInsights', 'highlight', 'scopeEpoch', 'expanded'];

  function builderOf(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }

  // Choices that last only while the shared comparison stays the same (ARCHITECTURE section 5).
  function scoped() { return { opts: {}, highlight: null, selected: null, sentence: null, custom: null, editing: false }; }
  // Choices that last until "Reset all charts".
  function lasting(id) { return { type: remembered(id), measureId: null, sizeId: null, breakdown: firstBreakdown(id), table: false, sort: null }; }

  // A report may open with a breakdown already chosen (defaultBreakdown), if it is one the report offers.
  function firstBreakdown(id) {
    var d = TAP.reports.get(id), bd = d && d.defaultBreakdown;
    return bd && (d.breakdowns || []).indexOf(bd) >= 0 ? bd : null;
  }

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

  // The panel's comparison: its own override, else the one its page fixed (opts.cmp, #216), else the shared one.
  function cmpOf(p, s) { return p.st.custom || p.opts.cmp || s.cmp; }

  function highlightOf(p, s) {
    if (p.st.highlight) return p.st.highlight;
    return s.highlight && s.highlight.reportId === p.id ? s.highlight : null;
  }

  // Validates and builds. Returns {def, ctx, res, errors, types, ...}; every problem stays inside this panel.
  function build(p, s) {
    var def = TAP.reports.get(p.id), errors = TAP.reports.validate(def), cmp = cmpOf(p, s);
    var industryId = industryOf(p, def, s), entities = TAP.scope.entities(cmp);
    if (def && !errors.length) TAP.panelMenus.fitBreakdown(def, p.st);   // a breakdown the measure doesn't list is dropped
    var types = def && !errors.length ? TAP.panelMenus.types(def, entities.length, p.st) : null;
    var ctx = def ? { def: def, type: types ? types.current : def.defaultType, measureId: p.st.measureId,
      sizeId: p.st.sizeId, breakdown: p.st.breakdown, cmp: cmp, entities: entities, year: null, industryId: industryId,
      highlight: highlightOf(p, s), expanded: s.expanded === p.id, theme: window.TAP_THEME, opts: Object.assign({}, p.st.opts),
      size: p.size || null } : null;
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

  // A click in builder HTML: a list row opens its details only; anything else follows the usual rule.
  function pick(res, d) {
    var target = res.target ? res.target({ data: d }) : null;
    if (d.row) { if (target) TAP.layers.openDetails(target); } else follow(target);
  }

  // A [data-tap-opt] click in builder HTML (a list's sort headings, for example): a builder option, like its controls.
  function option(p) { return function (key, value) { p.st.opts[key] = value; render(p); }; }

  // The table view, unless the report is a list: a list is its own table (US-2.7.2).
  function tabled(p, b) { return !!(p.st.table && b.res && b.res.table && b.ctx.type !== 'list'); }

  /* ---------- drawing ---------- */

  // Fills the body once it is on the page, so the chart measures its real size on the first draw.
  function body(p, b, s, box) {
    var C = TAP.panelChart, res = b.res;
    if (b.errors.length || !res) { C.dispose(p.cs); C.error(box, b.errors); return box; }
    if (res.empty) { C.dispose(p.cs); C.empty(box, res.missing); return box; }
    if (b.ctx.type === 'list' && res.html) {
      C.dispose(p.cs);
      TAP.panelTable.list(box, res, { label: TAP.shell.label(), onPick: function (d) { pick(res, d); }, onOpt: option(p) });
      return box;
    }
    if (tabled(p, b)) {
      // The chart stays alive off the page, so going back to it is instant
      if (p.cs.el && p.cs.el.parentNode) p.cs.el.parentNode.removeChild(p.cs.el);
      TAP.panelTable.render(box, res.table, { sort: p.st.sort, label: TAP.shell.label(), onSort: function (key) {
        var s0 = p.st.sort;
        p.set({ sort: { key: key, dir: s0 && s0.key === key ? -s0.dir : 1 } });
      }, focusIds: b.ctx.entities.filter(function (e) { return e.role === 'focus'; }).map(function (e) { return e.id; }) });
      return box;
    }
    if (res.html) {
      C.dispose(p.cs);
      C.html(box, res.html, function (d) { pick(res, d); }, option(p));
    } else if (res.option) {
      C.render(p.cs, box, res.option, { label: b.title, tall: /bubble|scatter/.test(b.ctx.type || ''),
        scale: s.expanded === p.id ? 1.3 : 1, height: res.height || null, onClick: function (prm) { follow(res.target ? res.target(prm) : null); } });
      if (res.sized) remeasure(p, b.ctx.size);
    } else C.dispose(p.cs);
    return box;
  }

  // A builder that places labels for the chart's size (res.sized) is drawn again once that size is known or changes.
  function remeasure(p, used) {
    var el0 = p.cs.el, now = el0 && el0.clientWidth ? { w: el0.clientWidth, h: el0.clientHeight } : null;
    if (!now || (used && Math.abs(used.w - now.w) < 2 && Math.abs(used.h - now.h) < 2)) return;
    p.size = now;
    if (!p.measuring) { p.measuring = true; try { render(p); } finally { p.measuring = false; } }
  }

  function render(p) {
    if (!p.live) return;
    var s = TAP.store.get(), keep = TAP.panelChart.focusKey(p.root), I = TAP.panelInsights;
    p.seen = {};   // glossary terms are marked once per panel
    var b = build(p, s), info = I.get(cmpOf(p, s), p.id), ok = !b.errors.length && b.res && !b.res.empty;
    p.drewHl = !!(b.ctx && b.ctx.highlight);
    var big = s.expanded === p.id;
    if (p.root.isConnected) p.wasConnected = true;
    TAP.dom.clear(p.root);
    p.root.setAttribute('aria-label', b.title);
    p.root.className = 'tap-panel' + (big ? ' tap-panel--expanded' : '');

    var bodyBox = el('div', { class: 'tap-panel__body' });
    var takeaway = el('p', { class: 'tap-panel__takeaway', 'aria-live': 'polite', 'data-tour': 'takeaway' });
    TAP.dom.append(p.root, [
      big ? X().strip(p, s) : null,
      el('header', { class: 'tap-panel__head' }, [
        el('div', { class: 'tap-panel__titles' }, [
          el('h2', { class: 'tap-panel__title', html: TAP.content.mark(b.title, p.seen) }),
          I.takeaway(takeaway, ok ? info.top : null, p.seen, I.handlers(p).onHide),
          p.st.custom ? TAP.panelMenus.customBadge(p, p.st.custom) : null
        ]),
        TAP.panelMenus.tools(p, b, info)
      ]),
      p.st.editing && b.types ? TAP.panelMenus.compareEditor(p) : null,
      b.def && !b.errors.length ? TAP.panelMenus.render(TAP.panelMenus.spec(p, b)) : null,
      ok ? I.strip(p, highlightOf(p, s)) : null,
      bodyBox,
      ok && !tabled(p, b) ? TAP.panelChart.legend(b.res) : null,
      ok ? TAP.panelChart.notes(b.res) : null,
      TAP.panelChart.source(b.def),
      p.statusEl
    ]);
    X().syncScroll();   // before the chart is drawn: locking the page scroll changes the width the chart gets
    body(p, b, s, bodyBox);
    // Focus follows the change: into the expanded chart's Close button, and back to More when it closes
    if (big !== !!p.big) keep = big ? '[data-action="collapse"]' : '[data-action="more"]';
    p.big = big;
    var back = keep && TAP.dom.qs(keep, p.root);
    if (back && back.focus) back.focus();
  }

  // The expanded view (US-1.2.8) lives in js/panel/panel-expand.js.
  function X() { return TAP.panelExpand; }

  /* ---------- life cycle ---------- */

  function onStore(p, s, changed) {
    if (!p.live) return;
    if (p.wasConnected && !p.root.isConnected) { destroy(p); return; }   // removed without destroy()
    // A report with a default breakdown returns to it too (17.4); otherwise a chosen breakdown stays, as in Phase 1
    if (changed.indexOf('scopeEpoch') >= 0) Object.assign(p.st, scoped(), firstBreakdown(p.id) ? { breakdown: firstBreakdown(p.id) } : {});
    if (changed.indexOf('industry') >= 0) p.opts.industryId = null;
    var shown = changed.indexOf('highlight') >= 0 && s.highlight && s.highlight.reportId === p.id;   // "Show me" wins over the list
    if (shown) {
      Object.assign(p.st, { highlight: null, selected: null, sentence: null });
      delete p.st.opts.theme;   // a theme clicked earlier would hide the one the "Show me" points at (#72)
    }
    // A highlight for another chart changes nothing here, so only the chart it was or is for redraws
    var hl = highlightOf(p, s), mine = !!hl || !!p.drewHl;
    var only = changed.filter(function (k) { return REDRAW.indexOf(k) >= 0; });
    if (only.length && !(only.length === 1 && only[0] === 'highlight' && !mine)) render(p);
  }

  function destroy(p) {
    if (!p.live) return;
    p.live = false;
    p.off.forEach(function (fn) { fn(); });
    X().remove(p);
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
    function wkey(e) { X().keys(p, e); }
    // A chart whose labels were placed for its size is drawn again when the window changes its size
    function resized() { if (p.live && p.size) remeasure(p, p.size); }
    window.addEventListener('resize', resized);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('keydown', wkey);
    p.off.push(function () {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('keydown', wkey);
      window.removeEventListener('resize', resized);
    });
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
    p.cmp = function () { return cmpOf(p, TAP.store.get()); };
    p.toggle = function (name) { p.st.pop = name && p.st.pop !== name ? name : null; render(p); };
    p.set = function (patch) { Object.assign(p.st, patch); render(p); };
    p.setType = function (type) {
      var def = TAP.reports.get(reportId);
      remember(reportId, def && type === def.defaultType ? null : type);   // the default needs no memory
      p.set({ type: type, pop: null });
    };
    p.expand = function (on) { if (on) TAP.store.set({ expanded: reportId }); else X().collapse(); };
    p.fullscreen = function () { X().fullscreen(reportId); };
    p.statusEl = el('p', { class: 'tap-panel__status', role: 'status' });   // kept across redraws, so a message stays
    p.image = function (how) {
      p.set({ pop: null });
      TAP.panelExport[how === 'save' ? 'saveImage' : 'copyImage'](p.root).then(function (msg) { TAP.dom.text(p.statusEl, msg); });
    };
    p.root = el('section', { class: 'tap-panel', 'data-report': reportId, 'data-tour': 'panel' });
    host.appendChild(p.root);
    X().add(p);
    listen(p);
    render(p);
    return {
      id: reportId, el: p.root,
      refresh: p.render,
      highlight: function (target) { p.set({ highlight: target || null, selected: null, sentence: null }); },
      expand: p.expand,
      destroy: function () { destroy(p); }
    };
  }

  TAP.panel = { create: create };
})(window.TAP);
