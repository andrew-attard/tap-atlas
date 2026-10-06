/*
 * File: js/reports/outlook-side-draw.js
 * Purpose: Draws the side-by-side chart of js/reports/outlook-side.js: for each row, one bar per figure with its name
 *          and value written beside it, then a closing line of text (variance, growth, share). Every bar is named
 *          in words, so nothing is told apart by shade alone (D24).
 * Provides: TAP.olSideDraw (option, endText)
 * Depends on: js/engine/shapes.js (kit, passed in), js/core/format.js, js/core/content.js, js/reports/outlook-side.js
 *             (sliceKey, at call time), js/theme.js
 * Used by: js/reports/outlook-side.js
 * Owner: OUTLOOK stream (#442)
 */
(function (TAP) {
  'use strict';

  function t(key, vars) { return TAP.content.text('olSide.' + key, vars); }
  function shown(c, col, signed) {
    var s = TAP.format.cell(c, { unit: col.unit });
    return signed && c.v > 0 ? '+' + s : s;
  }
  function colOf(d, id) { return d.cols.filter(function (c) { return c.key === id; })[0]; }

  // The closing line of a row: "Variance -€125k (-4.6%)". Says "not provided" when the bars have values but the
  // comparison has none; empty when it doesn't apply.
  function endText(d, row) {
    var end = d.end, a = end.amount ? row.cells[end.amount] : null, r = end.rate ? row.cells[end.rate] : null;
    var av = !!a && a.state === 'value', rv = !!r && r.state === 'value';
    if (!av && !rv) {
      var gap = (a && a.state === 'notProvided') || (r && r.state === 'notProvided');
      return gap ? d.k.t('chart.npFor', { name: d.endLabel }) : '';
    }
    var amount = av ? shown(a, colOf(d, end.amount), end.signed) : '', rate = rv ? shown(r, colOf(d, end.rate), end.signed) : '';
    var text = av && rv ? t('endBoth', { label: d.endLabel, amount: amount, rate: rate }) : t('endOne', { label: d.endLabel, value: av ? amount : rate });
    return text + ((av && a.partial) || (rv && r.partial) ? ' ' + d.k.t('chart.partialMark') : '');
  }

  // Tooltip: the figure pointed at (exact value, kind, how combined), then the row's other figures.
  function tipFor(d, item, col) {
    var k = d.k, row = d.rows.filter(function (r) { return r.id === (item || {}).rowId; })[0];
    if (!row) return '';
    var lines = k.cellRows(row.cells[col.key], col);
    d.cols.forEach(function (c) {
      if (c.key !== col.key && row.cells[c.key].state !== 'notApplicable') lines.push([c.label, k.exact(row.cells[c.key], c)]);
    });
    return k.tip(row.label, lines);
  }

  // d: {k, ctx, rows, bars, cols, end, endLabel}. Returns {option, height}.
  function option(d) {
    var k = d.k, th = k.th(), hl = th.echarts.tap.highlight, rows = d.rows, n = d.bars.length, np = [], longest = 0;
    var hasEnd = !!(d.end.amount || d.end.rate);
    // A row with no bar at all gets the outlined "not provided" mark; a single missing bar says so on its own line
    var blank = rows.map(function (r) { return d.bars.every(function (c) { return r.cells[c.key].state !== 'value'; }); });
    rows.forEach(function (r, i) {
      if (!blank[i] || !d.bars.some(function (c) { return r.cells[c.key].state === 'notProvided'; })) return;
      np.push({ value: [0, i], entityId: r.entityId, text: k.t('states.notProvided'), title: r.label,
        what: TAP.format.list(d.bars.map(function (c) { return c.label; })) });
    });
    var series = d.bars.map(function (col, bi) {
      return { type: 'bar', tapRole: 'value', name: col.label, barMaxWidth: th.space[6], barGap: '12%',
        data: rows.map(function (r, i) {
          var c = r.cells[col.key], on = k.highlighted(r.entity, d.ctx.highlight), text;
          if (c.state !== 'value') {
            var gap = !blank[i] && c.state === 'notProvided';
            text = gap ? k.t('chart.npFor', { name: col.label }) : '';
            longest = Math.max(longest, text.length);
            return { value: gap ? 0 : null, text: text, rowId: r.id, entityId: r.entityId };
          }
          text = col.label + '  ' + shown(c, col) + (c.partial ? ' ' + k.t('chart.partialMark') : '');
          longest = Math.max(longest, text.length);
          return { value: c.v, raw: c.v, text: text, key: TAP.olSide.sliceKey(col.key, r.cut), entityId: r.entityId, rowId: r.id, name: r.label, mark: 'bar',
            itemStyle: { color: th.shade(r.entity.color, n - 1 - bi), borderColor: on ? hl.color : th.ground, borderWidth: on ? hl.width : th.border.control } };
        }),
        label: { show: true, position: 'right', fontSize: th.type.chart, color: th.ink, formatter: function (p) { return (p.data && p.data.text) || ''; } },
        tooltip: { formatter: function (p) { return tipFor(d, p.data, col); } } };
    });
    if (hasEnd) {
      // A bar of no length that carries the closing line as its label, so it sits under the row's bars
      series.push({ type: 'bar', tapRole: 'total', silent: true, name: d.endLabel, barMaxWidth: th.space[6], barGap: '12%',
        data: rows.map(function () { return 0; }), itemStyle: { color: th.echarts.backgroundColor }, tooltip: { show: false },
        label: { show: true, position: 'right', fontSize: th.type.chart, fontWeight: 700, color: th.ink,
          formatter: function (p) { return blank[p.dataIndex] ? '' : endText(d, rows[p.dataIndex]); } } });
    }
    if (np.length) series.push(k.npSeries(np));
    var lines = rows.length * (n + (hasEnd ? 1 : 0));
    return { height: lines * (th.space[6] + th.space[1]) + th.space[12],
      option: { grid: k.grid({ right: Math.round((longest + 2) * th.type.chart * 0.56) }), tooltip: { trigger: 'item' }, xAxis: k.valueAxis(d.bars[0]),
        yAxis: { type: 'category', inverse: true, data: rows.map(function (r) { return r.label; }), axisLabel: { fontSize: th.type.chart, interval: 0 } },
        series: series } };
  }

  TAP.olSideDraw = { option: option, endText: endText };
})(window.TAP);
