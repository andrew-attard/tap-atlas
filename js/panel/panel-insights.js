/*
 * File: js/panel/panel-insights.js
 * Purpose: A panel's insights: the takeaway line (the top insight), the count, and the list of at most 3 with
 *          figures, rule, a highlight button and "Hide for this session" (US-1.2.2, US-1.7.11).
 * Provides: TAP.panelInsights (get, fits, target, handlers, strip, takeaway, render)
 * Depends on: js/insights/engine.js (read at call time; quiet while it is a stub), js/panel/panel-build.js, js/ui/showme.js, js/core/dom.js,
 *             js/core/icons.js, js/core/content.js, js/core/format.js, js/core/store.js
 * Used by: js/panel/panel.js, js/panel/panel-menus.js (the insights button)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var MAX = 3;

  /*
   * Whether an insight can be the takeaway for this comparison: every region it names is drawn on its own, or it
   * includes the focus region. So a region inside "the rest" or the organization total never leads the chart.
   */
  function fits(x, cmp) {
    var ents = TAP.scope.entities(cmp), own = ents.filter(function (e) { return e.kind === 'region'; }).map(function (e) { return e.regionIds[0]; });
    var focus = ents.filter(function (e) { return e.role === 'focus'; }).map(function (e) { return e.regionIds[0]; });
    var ids = x.regionIds || [];
    return ids.every(function (r) { return own.indexOf(r) >= 0; }) || ids.some(function (r) { return focus.indexOf(r) >= 0; });
  }

  // The insights for one chart in a comparison: {top, list (at most 3), count}. Nothing while insights is a stub.
  function get(cmp, reportId) {
    var I = TAP.insights, none = { top: null, list: [], count: 0 };
    if (!I || I.__stub) return none;
    var hidden = TAP.store.get().hiddenInsights || [];
    var shown = function (x) { return x && hidden.indexOf(x.id) < 0; };
    try {
      var all = (I.ranked(cmp, { reportId: reportId }) || []).filter(shown);
      var list = (I.top(cmp, reportId, MAX) || []).filter(shown);
      var lead = list.filter(function (x) { return fits(x, cmp); })[0] || null;
      return { top: lead, list: list, count: Math.max(all.length, list.length) };
    } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
      return none;
    }
  }

  // What selecting an insight highlights on this panel's chart: a Target (ARCHITECTURE section 11). An insight can
  // belong to several reports (attach), so the target names the panel's own report.
  function target(ins, reportId) {
    var hl = ins.highlight || {};   // the insight's own target (ARCHITECTURE section 12)
    var tg = { reportId: reportId, regionIds: (ins.regionIds || []).slice(), industryIds: (ins.industryIds || []).slice(),
      accountIds: (ins.accountIds || []).slice(), mark: hl.mark || null, quadrant: hl.quadrant || null };
    // Phase 2 targets may also name list rows (17.4) and a comment theme; copied only when there are some
    var items = hl.items || ins.items, theme = hl.theme || ins.theme, m = hl.measureId || ins.measureId;
    if (items) tg.items = items.map(function (x) { return Object.assign({}, x); });
    if (theme) tg.theme = theme;
    if (m) tg.measureId = m;   // the measure the sentence quotes (D79)
    // Every measure the insight's figures quote, so a chart showing several side by side marks just those (D102)
    var ms = hl.measureIds || (ins.figures || []).map(function (f) { return f.measureId; }).filter(function (id, i, all) { return id && all.indexOf(id) === i; });
    if (ms.length) tg.measureIds = ms.slice();
    return tg;
  }

  // What the takeaway and the list do, for panel p (see js/panel/panel.js).
  function handlers(p) {
    return {
      selected: p.st.selected, seen: p.seen,
      onSelect: function (ins) {
        // While drilled, the insights and their highlight are the current level's, so selecting one stays there
        var deep = !!(p.drill && p.drill.depth()), off = p.st.selected === ins.id, tg = target(ins, deep ? p.drill.current() : p.id);
        var sm = TAP.showme, ids = ins.regionIds;
        if (!off && TAP.panelBuild.ownMeasure(tg.reportId, tg.measureId)) p.st.measureId = tg.measureId;   // D79
        // A one-industry chart (the ratings) shows the insight's industry first, as its own picker would (D102)
        var o = (TAP.reports.get(tg.reportId) || {}).options || {};
        if (!off && o.industryPicker && tg.industryIds.length === 1) {
          p.opts.industryId = tg.industryIds[0];
          TAP.bus.emit('industry:select', { industryId: tg.industryIds[0] });
        }
        // A region the chart can't show on its own: the comparison widens first (top level only: a comparison change
        // returns the panel to its top level). The panel's own comparison goes first; a comparison its page fixed
        // (presentation, a profile) widens for this panel only, never the shared one (D74); else "Show me" widens it.
        if (!off && !deep && sm && !sm.__stub && sm.widen(tg, p.cmp(), ids)) {
          if (p.st.custom) Object.assign(p.st, { custom: null, editing: false });
          if (sm.widen(tg, p.cmp(), ids) && p.opts.cmp) {
            p.st.custom = Object.assign(TAP.store.defaults().cmp, { mode: 'all' });
          } else if (sm.widen(tg, p.cmp(), ids)) {
            p.st.pop = null;
            sm.go({ insightId: ins.id, target: tg });
            return;
          }
        }
        p.set({ selected: off ? null : ins.id, sentence: off ? null : ins.sentence, highlight: off ? null : tg });
      },
      onHide: function (ins) {
        if (p.st.selected === ins.id) Object.assign(p.st, { selected: null, sentence: null, highlight: null });
        TAP.insights.hide(ins.id);
        p.render();
      },
      onShowAll: function () { p.st.pop = null; TAP.store.set({ view: 'insights' }); },
      onClose: function () { p.toggle(null); }
    };
  }

  // The strip above the chart repeats what is highlighted, so it reads even without colour.
  function strip(p, hl) {
    if (!hl) return null;
    var mine = !!p.st.selected;
    return el('div', { class: 'tap-panel__strip', role: 'status' }, [
      el('span', { class: 'tap-panel__strip-label' }, [el('span', { class: 'tap-panel__ring', 'aria-hidden': 'true' }),
        t(mine ? 'highlighted' : 'highlightedTarget')]),
      mine ? el('span', { class: 'tap-panel__strip-text' }, p.st.sentence || '') : null,
      !mine && hl.widened ? el('span', { class: 'tap-panel__strip-text' }, t('widened')) : null,
      el('button', { type: 'button', class: 'tap-btn', 'data-action': 'clear-highlight', onclick: function () {
        if (p.st.highlight) p.set({ highlight: null, selected: null, sentence: null });
        else TAP.store.set({ highlight: null });
      } }, t('clear'))
    ]);
  }

  function hideButton(ins, onHide) {
    return el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-panel__hide', 'data-action': 'hide-insight',
      onclick: function () { onHide(ins); } }, [TAP.icons.svg('hide', { size: 16 }), t('hide')]);
  }

  // The takeaway line is always on the page; it stays empty, with no placeholder, when there is no insight.
  function takeaway(node, ins, seen, onHide) {
    TAP.dom.clear(node);
    if (!ins) return node;
    node.appendChild(el('span', { class: 'tap-panel__takeaway-text', html: TAP.content.mark(ins.sentence, seen) }));
    node.appendChild(document.createTextNode(' '));
    node.appendChild(hideButton(ins, onHide));
    return node;
  }

  /*
   * The list popover body. info: {list, count}. h: {selected, seen, onSelect(ins), onHide(ins), onShowAll(), onClose()}
   */
  function render(box, info, h) {
    box.appendChild(el('div', { class: 'tap-panel__pop-head' }, [
      el('h3', null, t('insightsTitle')),
      el('button', { type: 'button', class: 'tap-iconbtn', 'data-action': 'close-pop', 'aria-label': t('close'), onclick: h.onClose },
        TAP.icons.svg('x', { size: 18 }))
    ]));
    info.list.forEach(function (ins) {
      var on = h.selected === ins.id;
      box.appendChild(el('div', { class: 'tap-panel__insight' + (on ? ' is-selected' : '') }, [
        el('p', { class: 'tap-panel__insight-text', html: TAP.content.mark(ins.sentence, h.seen) }),
        figures(ins.figures || []),
        ins.description ? el('p', { class: 'tap-panel__rule' }, t('rule', { text: ins.description })) : null,
        el('div', { class: 'tap-panel__insight-actions' }, [
          el('button', { type: 'button', class: 'tap-btn', 'data-action': 'select-insight', 'aria-pressed': String(on),
            onclick: function () { h.onSelect(ins); } }, t(on ? 'highlightOff' : 'highlightOn')),
          hideButton(ins, h.onHide)
        ])
      ]));
    });
    box.appendChild(el('div', { class: 'tap-panel__pop-foot' }, el('button', { type: 'button', class: 'tap-btn tap-btn--ghost',
      'data-action': 'show-all', onclick: h.onShowAll }, [t('showAll'), TAP.icons.svg('arrow', { size: 18 })])));
    return box;
  }

  function figures(list) {
    if (!list.length) return null;
    return el('dl', { class: 'tap-panel__figures' }, list.map(function (f) {
      return [el('dt', null, f.label), el('dd', null, TAP.format.cell(f.cell, { exact: true, unit: f.unit, field: f.field }))];
    }).reduce(function (a, b) { return a.concat(b); }, []));
  }

  TAP.panelInsights = { get: get, fits: fits, target: target, handlers: handlers, strip: strip, takeaway: takeaway, render: render };
})(window.TAP);
