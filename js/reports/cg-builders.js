/*
 * File: js/reports/cg-builders.js
 * Purpose: Thin wrappers round the generic builders for the Customer growth reports: segment shades, the multiplier
 *          note, exposure reference lines from the rule thresholds, and bar targets that list accounts.
 * Provides: builders 'cgSegments', 'cgGrowth', 'cgExposure'; TAP.cgBuilders (SEGMENTS, segmentOf)
 * Depends on: js/engine/build-parts.js, js/engine/build-compare.js, config/insight-rules.js, js/theme.js (all at call time)
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
    res.legend = (res.legend || []).filter(function (l) { return l.role === 'part'; });
    var target = res.target;
    // A click lists the segment thresholds of each region behind the bar, since they differ by region
    res.target = function (params) {
      var tg = target ? target(params) : null;
      if (!tg || !(tg.regionIds || []).length) return tg;
      return Object.assign({}, tg, { items: tg.regionIds.map(function (r) { return { section: 'customerGrowth', regionId: r, row: null }; }) });
    };
    return res;
  }

  TAP.builders.register('cgSegments', TAP.shapes.kit.safely(segments));
  TAP.stub.builder('cgGrowth', 205);
  TAP.stub.builder('cgExposure', 207);
  TAP.cgBuilders = { SEGMENTS: SEGMENTS, segmentOf: segmentOf };
})(window.TAP);
