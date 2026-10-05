/*
 * File: js/reports/stack-draw.js
 * Purpose: Drawing shared by the reports that split a figure into named parts (solutions, routes, maturity levels):
 *          stacked bars with every part numbered and keyed, and a heatmap grid with the parts down and the regions
 *          across. It draws the rows and parts it is handed and works out no figure itself.
 * Provides: TAP.stackDraw (bars, legend, grid, gridLegend, tone)
 * Depends on: js/engine/shapes.js (drawing kit), js/engine/aggregate.js (describe), js/core/dom.js, js/core/format.js,
 *             js/core/content.js, js/theme.js (all at call time)
 * Used by: js/reports/dim-stack.js, js/reports/pt-books.js
 * Owner: NBPT stream (#449)
 *
 * What it draws, d:
 *   label, unit      the figure's name and unit
 *   parts            [{key, value, label}] in stacking order
 *   rows             [{id, entityId, entity, label, group, cells: {<part key>: cell}, total: cell, after, keys}]; one per
 *                    bar. group is the breakdown value the row stands for, or null; after is text for the end of the
 *                    bar; keys, when a row's figures have their own, maps a part key to the figure key a click names
 *   entities, groups the scope entities, and the breakdown values [{value, label}] (empty without a breakdown): the grid
 *   numbered         true: segments and key carry each part's number, so many parts are told apart without colour
 *   highlight        a Target; by: the dimension the parts are values of
 *   right, tip       optional: room right of the bars (px) for long closing texts; tip(row, part) gives more tooltip lines
 */
(function (TAP) {
  'use strict';

  function k() { return TAP.shapes.kit; }
  function esc(s) { return TAP.dom.esc(s); }
  function t(key, vars) { return TAP.content.text('dimStack.' + key, vars); }
  function has(list, x) { return (list || []).indexOf(x) >= 0; }
  function chartValue(v, unit) { return TAP.format.cell({ v: v, state: 'value' }, { unit: unit }); }

  // How far part i of n is mixed toward white: the theme's steps up to four parts, even steps beyond.
  function tone(i, n) {
    var steps = k().th().shadeSteps;
    return n <= steps.length ? steps[i] : 0.85 * i / (n - 1);
  }
  function shade(color, i, n) { var x = tone(i, n); return x ? k().th().mix(color, x) : color; }

  /* ---------- stacked bars ---------- */

  // Tooltip: the part hovered (exact value, kind, how combined), the other parts, then the total.
  function tipFor(d, row, part) {
    var kit = k(), col = { label: part.label, unit: d.unit }, lines = kit.cellRows(row.cells[part.key], col);
    d.parts.forEach(function (p) { if (p !== part) lines.push([p.label, kit.exact(row.cells[p.key], col)]); });
    lines.push([kit.t('chart.total'), kit.exact(row.total, col)]);
    var how = TAP.agg.describe(row.total);
    if (how) lines.push([kit.t('chart.how'), how]);
    if (d.tip) lines = lines.concat(d.tip(row, part) || []);
    return kit.tip(row.label, lines);
  }

  // The label on a segment: its part's number, and the value where there is room for it.
  function segmentLabel(d, pi, pct, maxT) {
    return function (prm) {
      var x = prm.data;
      if (!x || x.raw == null) return '';
      var share = pct ? prm.value / 100 : (maxT ? x.raw / maxT : 0), num = d.numbered ? '{n|' + (pi + 1) + '}' : '';
      var text = pct ? TAP.format.pct(prm.value / 100) : chartValue(x.raw, d.unit);
      if (share >= (num ? 0.12 : 0.09)) return num ? num + ' ' + text : text;
      return share >= 0.03 ? num : '';
    };
  }

  // type: 'stackedBar' or 'stacked100'. Colour shows the region, shade and number the part.
  function bars(d, type) {
    var kit = k(), th = kit.th(), hl = th.echarts.tap.highlight, pct = type === 'stacked100', n = d.parts.length;
    var totals = d.rows.map(function (r) { return r.total; }), np = [];
    var maxT = Math.max.apply(null, totals.map(function (c) { return c.state === 'value' ? c.v : 0; }).concat([0]));
    d.rows.forEach(function (r, i) {
      if (totals[i].state === 'notProvided') {
        np.push({ value: [0, i], entityId: r.entityId, text: kit.t('states.notProvided'), title: r.label, what: d.label });
      }
    });
    var badge = { backgroundColor: th.paper, color: th.ink, borderColor: th.ink, borderWidth: th.border.control,
      borderRadius: th.space[3], padding: [2, 6], fontSize: th.type.chartMin, fontWeight: 700 };
    var series = d.parts.map(function (p, pi) {
      return { type: 'bar', tapRole: 'value', name: p.label, stack: 'parts', barMaxWidth: th.space[12],
        data: d.rows.map(function (r, i) {
          var c = r.cells[p.key], tot = totals[i].state === 'value' ? totals[i].v : 0;
          if (!c || c.state !== 'value') return { value: null };
          var on = kit.highlighted(r.entity, d.highlight), dark = tone(pi, n) < 0.4 && r.entity.role !== 'muted';
          return { value: pct ? (tot ? c.v / tot * 100 : 0) : c.v, raw: c.v, key: (r.keys || {})[p.key] || p.key, part: p.value, entityId: r.entityId, rowId: r.id,
            name: r.label, mark: 'bar',
            itemStyle: { color: shade(r.entity.color, pi, n), borderColor: on ? hl.color : th.ground, borderWidth: on ? hl.width : th.border.control },
            label: { color: dark ? th.onColour : th.ink } };
        }),
        label: { show: true, position: 'inside', fontSize: th.type.chart, formatter: segmentLabel(d, pi, pct, maxT), rich: { n: badge } },
        tooltip: { formatter: function (prm) {
          var row = d.rows.filter(function (r) { return r.id === (prm.data || {}).rowId; })[0];
          return row ? tipFor(d, row, p) : '';
        } } };
    });
    if (!pct) series.push(totalSeries(d, totals));
    if (np.length) series.push(kit.npSeries(np));
    var vax = pct ? { type: 'value', max: 100, axisLabel: { fontSize: th.type.chart, formatter: function (v) { return TAP.format.pct(v / 100); } } }
      : kit.valueAxis({ unit: d.unit });
    return { grid: kit.grid({ right: d.right || th.space[12] * 2 }), tooltip: { trigger: 'item' }, xAxis: vax,
      yAxis: { type: 'category', inverse: true, data: d.rows.map(function (r) { return r.label; }),
        axisLabel: { fontSize: th.type.chart, interval: 0 } },
      series: series };
  }

  // An invisible bar at the end of each stack that carries the total (and the row's own closing text) as its label.
  function totalSeries(d, totals) {
    var kit = k(), th = kit.th();
    return { type: 'bar', tapRole: 'total', stack: 'parts', silent: true, data: d.rows.map(function () { return 0; }),
      itemStyle: { color: th.echarts.backgroundColor }, tooltip: { show: false },
      label: { show: true, position: 'right', fontSize: th.type.chart, color: th.ink, formatter: function (prm) {
        var c = totals[prm.dataIndex], row = d.rows[prm.dataIndex];
        if (!c || c.state !== 'value') return '';
        return chartValue(c.v, d.unit) + (c.partial ? ' ' + kit.t('chart.partialMark') : '') + (row.after ? '  ' + row.after : '');
      } } };
  }

  // The key: each region once, then the parts. Numbered parts get a numbered key in the same ink steps as the stack.
  function legend(d) {
    var kit = k(), th = kit.th(), seen = [], n = d.parts.length;
    d.rows.forEach(function (r) { if (seen.indexOf(r.entity) < 0) seen.push(r.entity); });
    return kit.legendOf({ entities: seen }).concat(d.parts.map(function (p, i) {
      if (!d.numbered) return { label: p.label, color: th.shade(th.ink, i), role: 'part' };
      return { label: p.label, color: shade(th.ink, i, n), mark: i + 1, role: tone(i, n) < 0.4 ? 'key' : 'muted' };
    }));
  }

  /* ---------- heatmap grid ---------- */

  // One cell: the value written out and shaded by size. o: {part, label, group, total}
  function cellHtml(g, col, cell, o) {
    var th = k().th(), ok = cell.state === 'value', np = cell.state === 'notProvided';
    var value = ok ? TAP.format.cell(cell, { unit: g.d.unit }) : '';
    var s = ok && !o.total && g.max > 0 ? Math.max(cell.v, 0) / g.max : 0;
    var words = ok ? value : np ? TAP.content.text('states.notProvided') : t('notApplicable');
    var aria = t('cellAria', { region: col.label, part: o.label, value: words }) + (o.group ? ', ' + o.group.label : '');
    var cls = 'tap-nbg__cell' + (np ? ' tap-nbg__cell--np' : ok ? '' : ' tap-nbg__cell--na') + (o.total ? ' tap-nbg__cell--total' : '') +
      (ok && cell.v === 0 ? ' tap-nbg__cell--zero' : '') + (g.marked(col, o.part) ? ' is-hl' : '') + (col.role === 'focus' && (ok || np) ? ' is-focus' : '');
    var style = ok && !o.total ? ' style="background:' + esc(th.mix(col.color, 0.92 - 0.47 * s)) + ';--tap-nbg-shade:' + s.toFixed(3) + '"' : '';
    return '<button type="button" role="cell" class="' + cls + '" data-tap-region="' + esc(col.id) + '"' +
      (o.part ? ' data-tap-row="' + esc(g.d.by + ':' + o.part.value) + '"' : '') + ' data-tap-value="' + (ok ? esc(cell.v) : '') +
      '" aria-label="' + esc(aria) + '"' + style + '>' + (ok ? '<span class="tap-nbg__value">' + esc(value) + '</span>' :
        np ? '<span class="tap-nbg__np">' + esc(words) + '</span>' : '') + '</button>';
  }

  // A line of the grid, or with a breakdown a heading and one line per breakdown value. pick(row) gives the cell.
  function lineHtml(g, o, pick) {
    var name = '<span class="tap-nbg__name tap-nbg__name--plain" role="rowheader"><span class="tap-nbg__label">' + esc(o.label) + '</span></span>';
    var cls = 'tap-nbg__row' + (o.total ? ' tap-nbg__row--total' : '');
    function cells(group) {
      return g.cols.map(function (col) {
        var row = g.d.rows.filter(function (r) { return r.entityId === col.id && r.group === (group ? group.value : null); })[0];
        return row ? cellHtml(g, col, pick(row), Object.assign({ group: group }, o)) : '<span role="cell"></span>';
      }).join('');
    }
    if (!g.d.groups.length) return '<div class="' + cls + '" role="row">' + name + cells(null) + '</div>';
    return '<div class="' + cls + ' tap-nbg__row--group" role="row">' + name + '</div>' + g.d.groups.map(function (group) {
      return '<div class="' + cls + ' tap-nbg__row--year" role="row"><span class="tap-nbg__year" role="rowheader">' + esc(group.label) +
        '</span>' + cells(group) + '</div>';
    }).join('');
  }

  // The parts down, the scope entities across, then each entity's total. A cell names its region (data-tap-region)
  // and its part (data-tap-row="<dimension>:<value>"), which the builder's target reads.
  function grid(d, title) {
    var th = k().th(), hl = d.highlight || {}, regs = hl.regionIds || [], max = 0;
    var cols = d.entities.map(function (e) {
      return { id: e.id, e: e, label: e.label, role: e.role, color: e.role === 'muted' ? th.focusGrey : e.color };
    });
    d.rows.forEach(function (r) {
      d.parts.forEach(function (p) { var c = r.cells[p.key]; if (c && c.state === 'value' && c.v > max) max = c.v; });
    });
    var g = { d: d, cols: cols, max: max,
      // A highlighted region marks its column (a combined column when it holds the region), or one cell when the
      // highlight names a value of the dimension too
      marked: function (col, part) {
        if (!regs.length || !(has(regs, col.id) || col.e.regionIds.some(function (r) { return has(regs, r); }))) return false;
        return hl[d.by] == null || (!!part && String(part.value) === String(hl[d.by]));
      } };
    var head = '<div class="tap-nbg__row tap-nbg__row--head" role="row"><span class="tap-nbg__corner" role="columnheader">' +
      esc(TAP.content.text('panel.breakdowns.' + d.by)) + '</span>' + cols.map(function (c) {
        return '<span class="tap-nbg__col is-' + esc(c.role) + '" role="columnheader"><span class="tap-nbg__bar" style="background:' + esc(c.color) +
          '"></span><span class="tap-nbg__colname">' + esc(c.label) + '</span></span>';
      }).join('') + '</div>';
    return '<div class="tap-nbg" role="table" aria-label="' + esc(title) + '" style="--tap-nbg-cols:' + cols.length + '">' + head +
      d.parts.map(function (p) { return lineHtml(g, { part: p, label: p.label }, function (row) { return row.cells[p.key]; }); }).join('') +
      lineHtml(g, { total: true, label: k().t('chart.total') }, function (row) { return row.total; }) + '</div>';
  }

  function gridLegend() {
    return [{ label: t('legendShade'), color: null, role: 'note' }, { label: t('legendNp'), color: null, role: 'notProvided' }];
  }

  TAP.stackDraw = { bars: bars, legend: legend, grid: grid, gridLegend: gridLegend, tone: tone };
})(window.TAP);
