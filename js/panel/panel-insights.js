/*
 * File: js/panel/panel-insights.js
 * Purpose: A panel's insights: the count, and the list of at most 3 with figures, rule, a highlight button and
 *          "Hide for this session" (US-1.7.11). Each listed insight shows its line on why it matters; context insights
 *          never reach a panel (D111). No insight sits under the chart's question: they stay behind the Insights
 *          button (D120).
 * Provides: TAP.panelInsights (get, target, handlers, strip, render, figureLines and figureBlock: the figures one line
 *           per region, shared with the Insights page, D121)
 * Depends on: js/insights/engine.js (read at call time; quiet while it is a stub), js/panel/panel-build.js, js/ui/showme.js, js/core/dom.js,
 *             js/core/icons.js, js/core/content.js, js/core/format.js, js/core/store.js
 * Used by: js/panel/panel.js, js/panel/panel-menus.js (the insights button)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  var MAX = 3;

  // The insights for one chart in a comparison: {list (at most 3), count}. Nothing while insights is a stub.
  // industryId: a chart that shows one industry (the ratings) lists only the insights about it, so its count and list
  // never borrow another industry's insight (D102). opts.broadOnly: insights for the organization as a whole only, as
  // the Overview's panel asks (D119).
  function get(cmp, reportId, industryId, opts) {
    var I = TAP.insights, none = { list: [], count: 0 };
    if (!I || I.__stub) return none;
    var hidden = TAP.store.get().hiddenInsights || [];
    var shown = function (x) { return x && hidden.indexOf(x.id) < 0 && (!industryId || (x.industryIds || []).indexOf(industryId) >= 0); };
    try {
      var more = opts && opts.broadOnly ? { broadOnly: true } : {};
      var all = (I.ranked(cmp, Object.assign({ reportId: reportId }, more)) || []).filter(shown);
      var list = industryId ? all.slice(0, MAX) : (I.top(cmp, reportId, MAX, more) || []).filter(shown);
      return { list: list, count: Math.max(all.length, list.length) };
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

  // What the list does, for panel p (see js/panel/panel.js).
  function handlers(p) {
    return {
      selected: p.st.selected, seen: p.seen,
      onSelect: function (ins) {
        // While drilled, the insights and their highlight are the current level's, so selecting one stays there
        var deep = !!(p.drill && p.drill.depth()), off = p.st.selected === ins.id, tg = target(ins, deep ? p.drill.current() : p.id);
        var sm = TAP.showme, ids = ins.regionIds;
        if (!off && TAP.panelBuild.ownMeasure(tg.reportId, tg.measureId)) p.st.measureId = tg.measureId;   // D79
        // A one-industry chart (the ratings) shows the insight's industry first, as a picker would (D102)
        if (!off && TAP.panelBuild.oneIndustry(TAP.reports.get(tg.reportId)) && tg.industryIds.length === 1) {
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
      box.appendChild(el('div', { class: 'tap-panel__insight' + (on ? ' is-selected' : ''), 'data-insight': ins.id }, [
        el('p', { class: 'tap-panel__insight-text', html: TAP.content.mark(ins.sentence, h.seen) }),
        ins.why ? why(ins) : null,
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

  // Why it matters (D111): one plain sentence under the insight, always shown (D24: nothing hover-only).
  function why(ins) { return el('p', { class: 'tap-panel__why' }, ins.why); }

  /*
   * D121: an insight's figures, one line per region, when they name two regions or more: each region's figures for the
   * insight's first two measures, at most 5 regions, then how many more. Figures for no single region (the others'
   * average) follow as rows. Null when the figures name one region or none: one row per figure, as before.
   * Returns {lines: [{regionId, name, parts: [{label, figure}]}], more, rest}. "Show me" still uses every figure.
   */
  var LINE_REGIONS = 5, LINE_MEASURES = 2;
  function figureLines(list) {
    var order = [], by = {}, rest = [], keys = [];
    (list || []).forEach(function (f) {
      var src = (f.cell && f.cell.src) || {}, r = src.combined ? null : src.regionId;
      if (!r) { rest.push(f); return; }
      if (!by[r]) { by[r] = []; order.push(r); }
      by[r].push(f);
    });
    if (order.length < 2) return null;
    var lines = order.map(function (r) {
      var name = TAP.content.regionName(TAP.data.region(r));
      var parts = by[r].map(function (f) {
        var label = shortLabel(f.label, name);
        return { key: f.measureId || f.unit + '|' + label, label: label, figure: f };
      });
      parts.forEach(function (p) { if (keys.indexOf(p.key) < 0) keys.push(p.key); });
      return { regionId: r, name: name, parts: parts };
    });
    var use = keys.slice(0, LINE_MEASURES);
    lines.forEach(function (ln) { ln.parts = ln.parts.filter(function (p) { return use.indexOf(p.key) >= 0; }); });
    return { lines: lines.slice(0, LINE_REGIONS), more: Math.max(0, lines.length - LINE_REGIONS), rest: rest };
  }
  // "Attractiveness, North America" reads "attractiveness" on North America's line; a label naming the region
  // elsewhere ("What North America wrote") gives way to the value alone.
  function shortLabel(label, name) {
    var s = String(label || ''), tail = ', ' + name;
    if (s.slice(-tail.length) === tail) s = s.slice(0, -tail.length);
    else if (s.indexOf(name) >= 0) return '';
    return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }
  // The lines as elements of class cls, each value drawn by val(figure), leftover figures by rows(list); null when
  // the figures name one region or none (the caller draws its rows).
  function figureBlock(list, cls, val, rows) {
    var g = figureLines(list);
    if (!g) return null;
    return g.lines.map(function (ln) {
      var bits = [el('strong', null, ln.name + ':'), ' '];
      ln.parts.forEach(function (p, i) { bits.push((i ? ', ' : '') + (p.label ? p.label + ' ' : ''), val(p.figure)); });
      return el('p', { class: cls, 'data-part': 'figline' }, bits);
    }).concat([g.more ? el('p', { class: cls, 'data-part': 'figmore' }, t(g.more === 1 ? 'figuresMoreOne' : 'figuresMore', { n: g.more })) : null,
      g.rest.length ? rows(g.rest) : null]);
  }

  function value(f) { return TAP.format.cell(f.cell, { exact: true, unit: f.unit, field: f.field }); }
  function rows(list) {
    return el('dl', { class: 'tap-panel__figures' }, list.map(function (f) {
      return [el('dt', null, f.label), el('dd', null, value(f))];
    }).reduce(function (a, b) { return a.concat(b); }, []));
  }
  function figures(list) {
    if (!list.length) return null;
    var lines = figureBlock(list, 'tap-panel__figline', value, rows);
    return lines ? el('div', { class: 'tap-panel__figures tap-panel__figures--lines' }, lines) : rows(list);
  }

  TAP.panelInsights = { get: get, target: target, handlers: handlers, strip: strip, render: render, figureLines: figureLines,
    figureBlock: figureBlock };
})(window.TAP);
