/*
 * File: js/reports/cg-builders.js
 * Purpose: Thin wrappers round the generic builders for the Customer growth reports: segment and risk colours (D131),
 *          the multiplier note, exposure reference lines from the rule thresholds, and bar targets that list accounts.
 * Provides: builders 'cgSegments', 'cgGrowth', 'cgExposure'; TAP.cgBuilders (SEGMENTS, segmentOf, refLines, accountItems)
 * Depends on: js/engine/build-parts.js, js/engine/build-compare.js, js/engine/prepare.js, js/engine/scope.js,
 *             js/engine/shapes.js, js/reports/stack-draw.js, js/core/data.js, js/core/content.js, js/core/format.js,
 *             config/insight-rules.js, js/theme.js (all at call time)
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

  /* ---------- US-2.2.2: segments in their own colours, risk levels in theirs (D131) ---------- */

  function segNames() {
    var names = {};
    (((TAP.data.lookups() || {}).segments) || []).forEach(function (s) { names[s.id] = s.name; });
    return names;
  }

  // Each segment takes its colour from the segment palette (options.partColors 'segment'), the same in every bar; the
  // region is named on the axis. The legend names the four segments as the lookups do, whatever the figure. Broken
  // down by risk, the bars are each region's segments and the risk levels take the risk palette (byRisk).
  function segments(ctx) {
    var th = window.TAP_THEME, res = TAP.builders.get('parts')(ctx), type = ctx.type || ctx.def.defaultType, names = segNames();
    if (res.error) return res;
    if (ctx.breakdown === 'risk' && type !== 'table' && !res.empty && th.risk) byRisk(ctx, type, res, names);
    else if (th.segments) res.legend = SEGMENTS.map(function (seg) { return { label: names[seg] || seg, color: th.segments[seg].bg, role: 'segment' }; });
    var target = res.target;
    // A click lists the segment thresholds of each region behind the bar, since they differ by region
    res.target = function (params) {
      var tg = target ? target(params) : null;
      if (!tg || !(tg.regionIds || []).length) return tg;
      return Object.assign({}, tg, { items: tg.regionIds.map(function (r) { return { section: 'customerGrowth', regionId: r, row: null }; }) });
    };
    return res;
  }

  // One bar per region and segment (just the segment with one region), split into the risk levels in their ordered
  // palette, so a bar reads as how much of the segment is flagged. The cells are the prepared report's risk columns.
  function byRisk(ctx, type, res, names) {
    var k = TAP.shapes.kit, th = k.th(), def = ctx.def, ds = TAP.prepare.run(def, ctx), m = TAP.prepare.selected(def, ctx);
    var parts = (def.parts || {})[m] || [], col = k.colOf(ds, m), levels = [];
    ds.columns.forEach(function (c) {
      var b = c.breakdown;
      if (b && b.dim === 'risk' && c.measureId === m) levels.push({ key: String(b.value), value: b.value, label: b.label });
    });
    var rows = k.visibleRows(ds, [m].concat(parts)), out = [];
    rows.forEach(function (r) {
      parts.forEach(function (p) {
        var seg = names[segmentOf(p)] || segmentOf(p), cells = {}, keys = {};
        levels.forEach(function (l) { keys[l.key] = p + '@risk:' + l.value; cells[l.key] = r.cells[keys[l.key]]; });
        out.push({ id: r.id + ':' + segmentOf(p), entityId: r.entityId, entity: r.entity, group: null, cells: cells, total: r.cells[p], keys: keys,
          label: rows.length === 1 ? seg : k.t('breakdown.entityValue', { entity: r.label, value: seg }), segment: seg, region: r.label });
      });
    });
    var paints = levels.map(function (l) { return th.risk[l.value] || th.risk.none; });
    res.option = TAP.stackDraw.bars({ label: col.label, unit: col.unit, parts: levels, rows: out, highlight: ctx.highlight, paints: paints }, type);
    res.option.series.filter(function (s) { return s.tapRole === 'value'; }).forEach(function (s, i) {
      s.tooltip = { formatter: function (prm) {
        var row = out.filter(function (r) { return r.id === (prm.data || {}).rowId; })[0];
        return row ? riskTip(k, col, levels, row, i) : '';
      } };
    });
    res.legend = levels.map(function (l, i) { return { label: l.label, color: paints[i].bg, role: 'risk' }; });
  }

  // "Strategic · High risk · Region A: 4, 40%", then the other levels, the segment's total and how it was combined.
  function riskTip(k, col, levels, row, i) {
    var l = levels[i], c = row.cells[l.key], tot = row.total;
    var share = c && c.state === 'value' && tot && tot.state === 'value' && tot.v ? TAP.format.pct(c.v / tot.v) : null;
    var title = TAP.content.text(share ? 'cgSegments.riskTip' : 'cgSegments.riskTipNoShare',
      { segment: row.segment, risk: l.label, region: row.region, value: k.exact(c, col), share: share });
    var lines = k.cellRows(c, { label: l.label, unit: col.unit, scale: col.scale }).slice(1);
    levels.forEach(function (x) { if (x !== l) lines.push([x.label, k.exact(row.cells[x.key], col)]); });
    lines.push([k.t('chart.total'), k.exact(tot, col)]);
    var how = TAP.agg.describe(tot);
    if (how) lines.push([k.t('chart.how'), how]);
    return k.tip(title, lines);
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
