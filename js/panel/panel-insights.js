/*
 * File: js/panel/panel-insights.js
 * Purpose: A panel's insights: the takeaway line (the top insight), the count, and the list of at most 3 with
 *          figures, rule, a highlight button and "Hide for this session" (US-1.2.2, US-1.7.11).
 * Provides: TAP.panelInsights (get, target, takeaway, render)
 * Depends on: js/insights/engine.js (read at call time; quiet while it is a stub), js/core/dom.js,
 *             js/core/icons.js, js/core/content.js, js/core/format.js, js/core/store.js
 * Used by: js/panel/panel.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var MAX = 3;

  // The insights for one chart in a comparison: {top, list (at most 3), count}. Nothing while insights is a stub.
  function get(cmp, reportId) {
    var I = TAP.insights, none = { top: null, list: [], count: 0 };
    if (!I || I.__stub) return none;
    var hidden = TAP.store.get().hiddenInsights || [];
    var shown = function (x) { return x && hidden.indexOf(x.id) < 0; };
    try {
      var all = (I.ranked(cmp, { reportId: reportId }) || []).filter(shown);
      var list = (I.top(cmp, reportId, MAX) || []).filter(shown);
      return { top: list[0] || null, list: list, count: Math.max(all.length, list.length) };
    } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
      return none;
    }
  }

  // What selecting an insight highlights on the chart: a Target (ARCHITECTURE section 11).
  function target(ins, reportId) {
    return { reportId: ins.reportId || reportId, regionIds: (ins.regionIds || []).slice(), industryIds: (ins.industryIds || []).slice(),
      accountIds: (ins.accountIds || []).slice(), mark: ins.highlight || null };
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

  TAP.panelInsights = { get: get, target: target, takeaway: takeaway, render: render };
})(window.TAP);
