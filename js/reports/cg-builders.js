/*
 * File: js/reports/cg-builders.js
 * Purpose: Thin wrappers round the generic builders for the Customer growth reports: segment shades, the multiplier
 *          note, exposure reference lines from the rule thresholds, and bar targets that list accounts.
 * Provides: builders 'cgSegments', 'cgGrowth', 'cgExposure'; TAP.cgBuilders (SEGMENTS, segmentOf, refLines, accountItems)
 * Depends on: js/engine/build-parts.js, js/engine/build-compare.js, js/engine/prepare.js, js/engine/scope.js,
 *             js/core/data.js, js/core/content.js, js/core/format.js, config/insight-rules.js, js/theme.js (all at call time)
 * Used by: config/reports-customers.js
 * Owner: CGP stream (#204)
 */
(function (TAP) {
  'use strict';

  // Segments are always shown in this order (US-2.2.2).
  var SEGMENTS = ['strategic', 'growth', 'core', 'scaled'];

  // The segment a part measure stands for: 'cg.seg.core.arr' -> 'core'.
  function segmentOf(measureId) {
    var m = /^cg\.seg\.([a-z]+)\./.exec(String(measureId || ''));
    return m ? m[1] : null;
  }

  // Every item of every series, ignoring the placeholders ECharts keeps for gaps.
  function eachItem(series, fn) {
    (series.data || []).forEach(function (d) { if (d && typeof d === 'object' && d.key) fn(d); });
  }

  /* ---------- US-2.2.2: segments in neutral ink steps ---------- */

  // The segment bars take ink steps (darkest Strategic), not the region colour: the segment is what is compared,
  // and the region is named on the axis. The legend keeps only the segments, each named.
  function segments(ctx) {
    var th = window.TAP_THEME, res = TAP.builders.get('parts')(ctx);
    if (res.error) return res;
    var shade = function (seg) { return th.shade(th.ink, Math.max(0, SEGMENTS.indexOf(seg))); };
    ((res.option && res.option.series) || []).forEach(function (s) {
      if (s.tapRole !== 'value') return;
      var first = null;
      eachItem(s, function (d) {
        var seg = segmentOf(d.key);
        if (!seg) return;
        first = first || seg;
        d.itemStyle = Object.assign({}, d.itemStyle, { color: shade(seg) });
        d.label = Object.assign({}, d.label, { color: seg === SEGMENTS[0] ? th.onColour : th.ink });
      });
      if (first) s.itemStyle = Object.assign({}, s.itemStyle, { color: shade(first) });
    });
    // The key names each segment as the lookups do, the same whichever figure is shown
    var names = {};
    (((TAP.data.lookups() || {}).segments) || []).forEach(function (s) { names[s.id] = s.name; });
    res.legend = (res.legend || []).filter(function (l) { return l.role === 'part'; }).map(function (l, i) {
      return Object.assign({}, l, { label: names[SEGMENTS[i]] || l.label });
    });
    var target = res.target;
    // A click lists the segment thresholds of each region behind the bar, since they differ by region
    res.target = function (params) {
      var tg = target ? target(params) : null;
      if (!tg || !(tg.regionIds || []).length) return tg;
      return Object.assign({}, tg, { items: tg.regionIds.map(function (r) { return { section: 'customerGrowth', regionId: r, row: null }; }) });
    };
    return res;
  }

  /* ---------- US-2.2.3: growth, with a note on accounts planned with a multiplier ---------- */

  // Multiplier accounts count through the increments the workbook calculated (D60); the note says how many there
  // are and where, for the segment chosen, so nobody wonders where those accounts went.
  function growth(ctx) {
    var res = TAP.builders.get('compare')(ctx);
    if (res.error) return res;
    var seg = /^cg\.growth\.([a-z]+)$/.exec(TAP.prepare.selected(ctx.def, ctx) || ''), mctx = {};
    if (seg && seg[1] !== 'all') mctx.segment = seg[1];
    var count = TAP.measures.get('cg.multiplierAccounts'), found = [];
    TAP.scope.regionIds(ctx.cmp).forEach(function (r) {
      var c = count ? count(r, mctx) : null;
      if (c && c.state === 'value' && c.v > 0) found.push({ n: c.v, region: TAP.content.regionName(TAP.data.region(r)) });
    });
    var t = TAP.content.text;
    // One region gets a sentence; several share one line, so the notes stay short on a shared screen
    if (found.length === 1) res.notes.push(t(found[0].n === 1 ? 'cgGrowth.multiplierOne' : 'cgGrowth.multiplierMany', found[0]));
    else if (found.length) {
      res.notes.push(t('cgGrowth.multiplierList', { list: TAP.format.list(found.map(function (f) { return t('cgGrowth.multiplierIn', f); })) }));
    }
    return res;
  }

  /* ---------- US-2.2.5: exposure, with the insight thresholds as reference lines ---------- */

  function ruleParams(id) {
    var r = ((window.TAP_RULES || {}).rules || []).filter(function (x) { return x.id === id; })[0];
    return (r && r.params) || {};
  }

  // The reference line for the selected measure, read from its insight rule when the chart is built, so a changed
  // threshold moves the line. options.thresholds maps a measure id to {rule, param}.
  function refLines(def, ctx) {
    var spec = ((def.options || {}).thresholds || {})[TAP.prepare.selected(def, ctx || {})];
    var v = spec ? ruleParams(spec.rule)[spec.param] : null;
    if (typeof v !== 'number') return [];
    return [{ value: v, label: TAP.content.text('cgExposure.refLine', { value: TAP.format.pct(v) }) }];
  }

  // Three-year incremental ARR of an account: the sum of the years with a number, or null when none has one.
  function incr3(acc) {
    var nums = (acc.incrementalArr || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    return nums.length ? nums.reduce(function (t, v) { return t + v; }, 0) : null;
  }

  // The accounts behind a bar, exactly as cg.top3Share and cg.riskShare count them (js/engine/measures-p2.js): the
  // 3 largest by three-year incremental ARR across the bar's regions, or every account flagged high or medium, largest
  // first. Accounts with no incremental ARR count in neither. Each becomes a row item for the details panel.
  function accountItems(regionIds, measureId) {
    var all = [];
    regionIds.forEach(function (r) {
      (((TAP.data.region(r) || {}).customerGrowth || {}).accounts || []).forEach(function (acc) {
        var v = incr3(acc);
        if (v != null) all.push({ regionId: r, row: acc.sourceRow, acc: acc, incr: v });
      });
    });
    all.sort(function (x, y) { return y.incr - x.incr; });
    var picked = measureId === 'cg.riskShare'
      ? all.filter(function (x) { return x.acc.riskLevel === 'high' || x.acc.riskLevel === 'medium'; })
      : all.slice(0, 3);
    return picked.map(function (x) { return { section: 'customerGrowth', regionId: x.regionId, row: x.row }; });
  }

  function exposure(ctx) {
    var def = Object.assign({}, ctx.def);
    def.options = Object.assign({}, def.options, { refLines: refLines(ctx.def, ctx) });
    var res = TAP.builders.get('compare')(Object.assign({}, ctx, { def: def })), target = res.target;
    if (res.error) return res;
    res.target = function (params) {
      var tg = target ? target(params) : null;
      if (!tg || !(tg.regionIds || []).length) return tg;
      var items = accountItems(tg.regionIds, TAP.prepare.selected(ctx.def, ctx));
      return items.length ? Object.assign({}, tg, { reportId: ctx.def.id, items: items }) : tg;
    };
    return res;
  }

  TAP.builders.register('cgSegments', TAP.shapes.kit.safely(segments));
  TAP.builders.register('cgGrowth', TAP.shapes.kit.safely(growth));
  TAP.builders.register('cgExposure', TAP.shapes.kit.safely(exposure));
  TAP.cgBuilders = { SEGMENTS: SEGMENTS, segmentOf: segmentOf, refLines: refLines, accountItems: accountItems };
})(window.TAP);
