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
  function scoped() { return { opts: {}, highlight: null, selected: null, sentence: null, custom: null, editing: false }; }
  // Choices that last until "Reset all charts".
  function lasting(id) { return { type: remembered(id), measureId: null, sizeId: null, table: false, sort: null }; }

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
    var def = TAP.reports.get(p.id), errors = TAP.reports.validate(def), cmp = p.st.custom || s.cmp;
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

  // Fills the body once it is on the page, so the chart measures its real size on the first draw.
  function body(p, b, s, box) {
    var C = TAP.panelChart, res = b.res;
    if (b.errors.length || !res) { C.dispose(p.cs); C.error(box, b.errors); return box; }
    if (res.empty) { C.dispose(p.cs); C.empty(box, res.missing); return box; }
    if (p.st.table && res.table) {
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
    var k = ['data-action', 'data-control', 'data-value', 'data-type', 'data-sort'].filter(function (n) { return a.hasAttribute(n); })
      .map(function (n) { return '[' + n + '="' + a.getAttribute(n) + '"]'; }).join('');
    return k || null;
  }

  function render(p) {
    if (!p.live) return;
    var s = TAP.store.get(), keep = focusKey(p), I = TAP.panelInsights;
    p.seen = {};   // glossary terms are marked once per panel
    var b = build(p, s), info = I.get(p.st.custom || s.cmp, p.id), ok = !b.errors.length && b.res && !b.res.empty;
    var big = s.expanded === p.id;
    if (p.root.isConnected) p.wasConnected = true;
    TAP.dom.clear(p.root);
    p.root.setAttribute('aria-label', b.title);
    p.root.className = 'tap-panel' + (big ? ' tap-panel--expanded' : '');

    var bodyBox = el('div', { class: 'tap-panel__body' });
    var takeaway = el('p', { class: 'tap-panel__takeaway', 'aria-live': 'polite', 'data-tour': 'takeaway' });
    TAP.dom.append(p.root, [
      big ? expandStrip(p, s) : null,
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
      ok && !(p.st.table && b.res.table) ? TAP.panelChart.legend(b.res) : null,
      ok ? TAP.panelChart.notes(b.res) : null,
      source(b.def),
      p.statusEl
    ]);
    body(p, b, s, bodyBox);
    // Focus follows the change: into the expanded chart's Close button, and back to More when it closes
    if (big !== !!p.big) keep = big ? '[data-action="collapse"]' : '[data-action="more"]';
    p.big = big;
    var back = keep && TAP.dom.qs(keep, p.root);
    if (back && back.focus) back.focus();
    syncScroll();
  }

  /* ---------- expanded view (US-1.2.8) ---------- */

  var live = [];   // panels on the page, in the order made: the charts the arrow keys step through

  function steps() { return live.filter(function (q) { return q.live && q.root.isConnected; }).map(function (q) { return q.id; }); }

  // Page scrolling is locked while any panel on the page is expanded.
  function syncScroll() {
    var id = TAP.store.get().expanded;
    var on = !!id && live.some(function (q) { return q.live && q.id === id; });
    document.documentElement.classList.toggle('tap-noscroll', on);
  }

  function collapse() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { /* already out */ });
    TAP.store.set({ expanded: null });
  }

  function fullscreen(id) {
    var r = document.documentElement;
    try {
      var asked = r.requestFullscreen ? r.requestFullscreen() : null;
      if (asked && asked.catch) asked.catch(function () { /* refused: expanded in the page still works */ });
    } catch (e) { /* refused */ }
    TAP.store.set({ expanded: id });
  }

  // The slim strip over an expanded chart: data label, comparison sentence, data date, position, Close.
  function expandStrip(p, s) {
    var list = steps(), lab = TAP.shell.label();
    return el('div', { class: 'tap-panel__expand-strip' }, [
      lab ? el('div', { class: 'tap-panel__expand-label tap-panel__expand-label--' + lab.kind, role: 'note' }, lab.text) : null,
      el('div', { class: 'tap-panel__expand-row' }, [
        el('span', { class: 'tap-panel__expand-sentence' }, TAP.scope.sentence(p.st.custom || s.cmp)),
        el('span', { class: 'tap-panel__date' }, t('dataDate', { date: TAP.format.date(TAP.sources.dataDate()) })),
        list.length > 1 ? el('span', { class: 'tap-muted' }, t('chartOf', { i: list.indexOf(p.id) + 1, n: list.length })) : null,
        el('button', { type: 'button', class: 'tap-btn tap-panel__tool', 'data-action': 'collapse', onclick: collapse },
          [TAP.icons.svg('x', { size: 18 }), el('span', null, t('closeExpanded'))])
      ])
    ]);
  }

  // Esc (after any popover or side panel) closes the expanded chart; the arrows step to the next or previous one.
  function expandKeys(p, e) {
    if (TAP.store.get().expanded !== p.id || e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (TAP.layers.top()) return;
      e.preventDefault();
      collapse();
      return;
    }
    var tag = ((e.target && e.target.tagName) || '').toLowerCase(), list = steps(), i = list.indexOf(p.id);
    if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || /^(input|select|textarea)$/.test(tag) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (list.length < 2) return;
    e.preventDefault();
    TAP.store.set({ expanded: list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length] });
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
    live = live.filter(function (q) { return q !== p; });
    syncScroll();
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
    function wkey(e) { expandKeys(p, e); }
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('keydown', wkey);
    p.off.push(function () {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('keydown', wkey);
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
    p.toggle = function (name) { p.st.pop = name && p.st.pop !== name ? name : null; render(p); };
    p.set = function (patch) { Object.assign(p.st, patch); render(p); };
    p.setType = function (type) {
      var def = TAP.reports.get(reportId);
      remember(reportId, def && type === def.defaultType ? null : type);   // the default needs no memory
      p.set({ type: type, pop: null });
    };
    p.expand = function (on) { if (on) TAP.store.set({ expanded: reportId }); else collapse(); };
    p.fullscreen = function () { fullscreen(reportId); };
    p.statusEl = el('p', { class: 'tap-panel__status', role: 'status' });   // kept across redraws, so a message stays
    p.image = function (how) {
      p.set({ pop: null });
      TAP.panelExport[how === 'save' ? 'saveImage' : 'copyImage'](p.root).then(function (msg) { TAP.dom.text(p.statusEl, msg); });
    };
    p.root = el('section', { class: 'tap-panel', 'data-report': reportId, 'data-tour': 'panel' });
    host.appendChild(p.root);
    live.push(p);
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
