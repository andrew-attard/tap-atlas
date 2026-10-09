/*
 * File: js/ui/present-screen.js
 * Purpose: Presenting the screen (D141): the charts on the page as they are on screen, in screen order, each with
 *          its own measure, chart type or table, breakdown, industry and comparison; the page after this one (the
 *          next data view in menu order, or the next region on a profile) and the marker step that leads to it; and
 *          the presentation layer's progress row. Presentation mode (js/ui/present.js) plays what this gives.
 * Provides: TAP.presentScreen (panels, stepOf, page, nextOf, go, marker, markerEl, bar)
 * Depends on: js/panel/panel-expand.js (panels), js/ui/present-record.js (stepOf), js/ui/present-steps.js (resolve),
 *             js/engine/scope.js, js/engine/registry.js (TAP.views), config/views.js (groups), js/core/data.js,
 *             js/core/store.js, js/core/content.js, js/core/dom.js, js/ui/shell.js (viewEl) (all at call time)
 * Used by: js/ui/present.js (startScreen, the marker, continuation)
 * Owner: PRESENT stream (#570)
 *
 * Accepted gaps (D141): a step does not carry the Partners channel dropdown, a drill level below the top, a list
 * sort or an insight highlight.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('present.' + key, vars); }

  // The live panels inside the view area, in screen order. The presentation's own panel and any panel drawn
  // elsewhere (a test sandbox) are not on the page.
  function panels() {
    var view;
    try { view = TAP.shell.viewEl(); } catch (e) { return []; }
    return TAP.panelExpand.panels().filter(function (p) { return view.contains(p.root); }).sort(function (a, b) {
      if (a.root === b.root) return 0;
      return a.root.compareDocumentPosition(b.root) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  // The step for panel p as it is on screen, resolved as a file step is, or null when it can't be presented: no
  // build yet, an error, or a step that doesn't resolve. A comparison the page fixed (opts.cmp: the region profile,
  // D62; a one-region custom chart) stays with the step, so D118 drops it for the Overview page only.
  function stepOf(p, i) {
    var b = p.built;
    if (!b || !b.def || (b.errors && b.errors.length)) return null;
    try {
      var out = TAP.presentSteps.resolve(TAP.presentRecord.stepOf(p, b));
      if (p.opts.cmp) out.cmp = TAP.scope.upgrade(p.cmp());
      out.index = i;
      return out;
    } catch (e) { return null; }
  }

  // The page as a presentation: its steps, the step to start at (the expanded chart, else the first) and the page
  // after it.
  function page() {
    var s = TAP.store.get(), steps = [], at = 0;
    panels().forEach(function (p) { var st = stepOf(p, steps.length); if (st) steps.push(st); });
    steps.forEach(function (st, i) { if (s.expanded && st.reportId === s.expanded) at = i; });
    return { steps: steps, startAt: at, next: nextOf(s) };
  }

  function dataViews() {
    var group = ((window.TAP_VIEWS || {}).groups || {}).data || [];
    return TAP.views.order().filter(function (id) { return group.indexOf(id) >= 0; });
  }

  // The page after this one: the Overview continues to the first data view, a data view to the next in menu order
  // (Other sections only when the data has it), a region profile to the next region in file order. Null after the
  // last data view, the last region, and on any other page (the Regions picker, Insights, Build a chart, the Guide).
  function nextOf(state) {
    if (state.view === 'regions') {
      if (!state.region) return null;
      var ids = TAP.data.regions().map(function (r) { return r.id; }), at = ids.indexOf(state.region);
      return at >= 0 && ids[at + 1] ? { view: 'regions', region: ids[at + 1] } : null;
    }
    var views = dataViews(), i = views.indexOf(state.view);
    var next = state.view === 'overview' ? views[0] : i >= 0 ? views[i + 1] : null;
    return next ? { view: next } : null;
  }

  // Opens the next page, with nothing expanded, in one change.
  function go(next) {
    TAP.store.set(next.region ? { view: 'regions', region: next.region, expanded: null } : { view: next.view, expanded: null });
  }

  function nameOf(next) {
    return next.region ? TAP.content.regionName(TAP.data.region(next.region)) : TAP.views.title(next.view);
  }

  // The marker step after a page's last chart: no panel, a title naming the page it leads to.
  function marker(next) { return { kind: 'marker', title: t('nextPage', { name: nameOf(next) }), next: next, index: -1 }; }

  function markerEl(step) {
    return el('div', { class: 'tap-present__marker', role: 'note' }, [
      el('p', { class: 'tap-present__marker-title' }, step.title),
      el('p', { class: 'tap-present__marker-hint' }, t('markerHint'))
    ]);
  }

  // The thin progress row: where we are, the step title, and buttons for anyone not using the keys (D24).
  // on: {prev, next, leave}, the presentation's own functions.
  function bar(on) {
    function nav(id, fn, label, keys) {
      return el('button', { type: 'button', class: 'tap-btn tap-present__nav', 'data-present': id, onclick: fn },
        [el('span', null, label), el('kbd', { class: 'tap-present__kbd' }, keys)]);
    }
    return el('div', { class: 'tap-present__bar', role: 'navigation', 'aria-label': t('barLabel') }, [
      el('p', { class: 'tap-present__where', 'aria-live': 'polite' }),
      el('div', { class: 'tap-present__navs' }, [
        nav('prev', on.prev, t('prev'), t('prevKeys')),
        nav('next', on.next, t('next'), t('nextKeys')),
        nav('leave', on.leave, t('leave'), t('leaveKeys'))
      ])
    ]);
  }

  TAP.presentScreen = { panels: panels, stepOf: stepOf, page: page, nextOf: nextOf, go: go, marker: marker,
    markerEl: markerEl, bar: bar };
})(window.TAP);
