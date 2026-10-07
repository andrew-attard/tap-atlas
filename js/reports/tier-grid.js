/*
 * File: js/reports/tier-grid.js
 * Purpose: Draws the tier grid (US-1.5.4): industries against the regions in scope, the tier each leader chose,
 *          group priorities marked as set centrally, and a column counting regions per tier. Offers the four row
 *          sorts and a bubble grid where colour is the tier and size a system figure.
 * Provides: chart builder 'tierGrid' (registered with TAP.builders)
 * Depends on: js/reports/tier-stats.js, js/engine/registry.js, js/engine/scope.js, js/engine/measures.js, js/engine/shapes.js (drawing kit),
 *             js/core/dom.js, js/core/format.js, js/core/content.js, js/core/data.js, js/core/store.js
 * Used by: config/reports-industry.js (ind-tiers), js/views/industry.js (default industry)
 */
(function (TAP) {
  'use strict';

  function k() { return TAP.shapes.kit; }
  function t(key, vars) { return TAP.content.text(key, vars); }
  function esc(s) { return TAP.dom.esc(s); }
  function rname(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function tierCell(regionId, industryId) { return TAP.measures.get('ind.tier')(regionId, { industryId: industryId }); }
  function has(list, x) { return (list || []).indexOf(x) >= 0; }

  // Tier statistics live in js/reports/tier-stats.js; read them at call time.
  function all(regionIds) { return TAP.tierStats.all(regionIds); }
  function sortFns() { return TAP.tierStats.SORTS; }

  /* ---------- columns, highlights ---------- */

  // The regions in scope, focus first. With one region against the rest, the others are muted.
  function columns(ctx) {
    var ents = ctx.entities || TAP.scope.entities(ctx.cmp), focus = ents[0] && ents[0].role === 'focus' ? ents[0].regionIds[0] : null;
    var muted = ents.some(function (e) { return e.role === 'muted' || e.role === 'combined'; }) && !!focus;
    var ids = TAP.scope.regionIds(ctx.cmp);
    if (focus) ids = [focus].concat(ids.filter(function (id) { return id !== focus; }));
    return ids.map(function (id) {
      var role = id === focus ? 'focus' : muted ? 'muted' : 'region';
      return { id: id, role: role, label: rname(id), color: role === 'muted' ? k().th().focusGrey : TAP.scope.colorOf(id) };
    });
  }

  function marker(hl) {
    var regs = (hl && hl.regionIds) || [], inds = (hl && hl.industryIds) || [];
    var mark = hl && hl.mark || (regs.length && inds.length ? 'cell' : inds.length ? 'industryRow' : regs.length ? 'regionColumn' : null);
    return {
      row: function (i) { return mark === 'industryRow' && has(inds, i); },
      cell: function (r, i) {
        if (mark === 'regionColumn') return has(regs, r) && (!inds.length || has(inds, i));
        return mark !== 'industryRow' && has(regs, r) && has(inds, i);
      }
    };
  }

  /* ---------- the grid's data ---------- */

  function model(ctx) {
    var def = ctx.def, cols = columns(ctx), ids = cols.map(function (c) { return c.id; });
    var sorts = (def.options && def.options.sorts) || Object.keys(sortFns());
    var sort = ctx.opts && has(sorts, ctx.opts.sort) ? ctx.opts.sort : sorts[0];
    var rows = all(ids).sort(sortFns()[sort] || sortFns().groupPriority);
    rows.forEach(function (r) { r.cells = ids.map(function (id) { return tierCell(id, r.industryId); }); });
    return { def: def, cols: cols, ids: ids, rows: rows, sort: sort, sorts: sorts, hl: marker(ctx.highlight),
      selected: ctx.industryId || TAP.store.get().industry };
  }

  function countCell(v, m, r) {
    return { v: v, state: 'value', kind: 'APP',
      src: { combined: true, how: 'count', regionIds: m.ids.slice(), excluded: r.np.slice(), notApplicable: [] } };
  }
  function textCell(v) { return { v: v, state: 'value', kind: null }; }
  function plName(id) {
    var pl = (TAP.data.lookups().productLines || []).filter(function (p) { return p.id === id; })[0];
    return pl ? pl.name : t('tierGrid.noProductLine');
  }

  // The table for the heatmap and table views: one row per industry, one column per region, then the counts.
  function matrix(m) {
    var C = function (key, label, unit, align) { return { key: key, label: label, unit: unit, align: align }; };
    var cols = [C('industry', t('chart.industryColumn'), 'text', 'left'), C('productLine', t('tierGrid.columns.productLine'), 'text', 'left'),
      C('groupPriority', t('tierGrid.columns.groupPriority'), 'text', 'left')]
      .concat(m.cols.map(function (c) { return C('tier:' + c.id, c.label, 'tier', 'left'); }))
      .concat(['t1', 't2', 't3', 'np'].map(function (x) { return C(x, t('tierGrid.columns.' + x), 'count', 'right'); }));
    return { columns: cols, rows: m.rows.map(function (r) {
      var cells = { industry: textCell(r.ind.name), productLine: textCell(plName(r.ind.productLine)),
        groupPriority: textCell(t(r.ind.groupPriority ? 'tierGrid.groupYes' : 'tierGrid.groupNo')),
        t1: countCell(r.n[1], m, r), t2: countCell(r.n[2], m, r), t3: countCell(r.n[3], m, r), np: countCell(r.np.length, m, r) };
      m.ids.forEach(function (id, i) { cells['tier:' + id] = r.cells[i]; });
      return { entityId: null, industryId: r.industryId, cells: cells, src: (r.cells[0] || {}).src || null };
    }) };
  }

  /* ---------- heatmap (HTML) ---------- */

  function cellHtml(m, r, c, i) {
    var cell = r.cells[i], ok = cell.state === 'value', tier = ok ? TAP.format.tier(cell.v) : t('states.notProvided');
    var central = ok && cell.v === 1 && r.ind.groupPriority;
    var aria = t('tierGrid.cellAria', { region: c.label, industry: r.ind.name, tier: central ? t('tierGrid.cellCentral', { tier: tier }) : tier });
    var cls = 'tap-tg__cell ' + (ok ? 'tap-tg__cell--t' + cell.v : 'tap-tg__cell--np') + (c.role === 'muted' ? ' is-muted' : '') +
      (c.role === 'focus' ? ' is-focus' : '') + (m.hl.cell(c.id, r.industryId) ? ' is-hl' : '');
    return '<button type="button" role="cell" class="' + cls + '" data-tap-region="' + esc(c.id) + '" data-tap-industry="' +
      esc(r.industryId) + '" data-tap-value="' + (ok ? esc(cell.v) : '') + '" aria-label="' + esc(aria) + '">' + (ok ? '<span class="tap-tg__word">' + esc(tier.replace(/\s*\S+$/, '')) + ' </span>' + esc(cell.v)
        : '<span class="tap-tg__npword">' + esc(tier) + '</span><span class="tap-tg__npdash" aria-hidden="true">–</span>') +
      (central ? ' <span class="tap-tg__cstar" aria-hidden="true">' + esc(t('tierGrid.star')) + '</span>' : '') + '</button>';
  }

  function agreeHtml(r) {
    var parts = [1, 2, 3].map(function (x) {
      return '<span class="tap-tg__part tap-tg__part--t' + x + '" style="width:' + (r.provided ? (r.n[x] / r.provided * 100) : 0).toFixed(2) + '%"></span>';
    }).join('');
    return '<div class="tap-tg__agree" role="cell" data-tap-agree="' + esc(r.industryId) + '"><span class="tap-tg__parts" aria-hidden="true">' + parts +
      '</span><span class="tap-tg__counts">' + esc(t('tierGrid.agreeCounts', { t1: r.n[1], t2: r.n[2], t3: r.n[3] })) + '</span>' +
      (r.np.length ? '<span class="tap-tg__npcount">' + esc(t('tierGrid.agreeNp', { n: r.np.length })) + '</span>' : '') + '</div>';
  }

  function rowHtml(m, r) {
    var sel = r.industryId === m.selected;
    var name = '<button type="button" role="rowheader" class="tap-tg__name" data-tap-industry="' + esc(r.industryId) + '" aria-pressed="' + sel + '">' +
      '<span class="tap-tg__pick" aria-hidden="true">' + (sel ? '▸' : '') + '</span><span class="tap-tg__label">' + esc(r.ind.name) + '</span>' +
      (r.ind.groupPriority ? '<span class="tap-tg__star">' + esc(t('tierGrid.star') + ' ' + t('tierGrid.central')) + '</span>' : '') +
      (sel ? '<span class="tap-tg__selword">' + esc(t('tierGrid.selected')) + '</span>' : '') + '</button>';
    // The industry in focus (D105): a bar, the marker and a word, apart from the "Show me" outline (is-hl)
    return '<div class="tap-tg__row' + (sel ? ' is-selected' : '') + (m.hl.row(r.industryId) ? ' is-hl' : '') + '" role="row" aria-selected="' + sel + '">' + name +
      m.cols.map(function (c, i) { return cellHtml(m, r, c, i); }).join('') + agreeHtml(r) + '</div>';
  }

  function heatmap(m) {
    var head = '<div class="tap-tg__row tap-tg__row--head" role="row"><span class="tap-tg__corner" role="columnheader">' + esc(t('tierGrid.corner')) + '</span>' +
      m.cols.map(function (c) {
        return '<span class="tap-tg__col is-' + c.role + '" role="columnheader" data-tap-column="' + esc(c.id) + '"><span class="tap-tg__bar" style="background:' +
          esc(c.color) + '"></span><span class="tap-tg__colname">' + esc(c.label) + '</span></span>';
      }).join('') + '<span class="tap-tg__agree-head" role="columnheader">' + esc(t('tierGrid.agreeHead')) + '<br>' + esc(t('tierGrid.agreeSub')) + '</span></div>';
    var body = '', lastPl;
    m.rows.forEach(function (r) {
      if (m.sort === 'productLine' && r.ind.productLine !== lastPl) {
        lastPl = r.ind.productLine;
        body += '<div class="tap-tg__group" role="row"><span role="rowheader">' + esc(plName(lastPl)) + '</span></div>';
      }
      body += rowHtml(m, r);
    });
    return '<div class="tap-tg" role="table" aria-label="' + esc(m.def.title) + '" style="--tap-tg-cols:' + m.cols.length + '">' + head + body + '</div>';
  }

  /* ---------- bubble grid (ECharts) ---------- */

  function bubbleGrid(m, ctx) {
    var K = k(), th = K.th(), sizeId = ctx.sizeId || (m.def.size && m.def.size.default) || 'ind.pipeline';
    var meta = TAP.measures.meta(sizeId), scol = { key: sizeId, label: K.lower(meta.label), unit: meta.unit, kind: meta.kind };
    var vals = [], gaps = [], notes = [], ring = [], max = 0, rowsT = [];
    m.rows.forEach(function (r, ri) {
      m.cols.forEach(function (c, ci) {
        var tc = r.cells[ci], sc = TAP.measures.get(sizeId)(c.id, { industryId: r.industryId });
        var base = { entityId: c.id, industryId: r.industryId, r: r, c: c, tc: tc, sc: sc, at: [ci, ri] };
        rowsT.push(base);
        if (tc.state !== 'value') { if (tc.state === 'notProvided') gaps.push(base); return; }
        if (sc.state === 'value' && sc.v > max) max = sc.v;
        else if (sc.state === 'notProvided') notes.push(t('tierGrid.sizeMissing', { region: c.label, industry: r.ind.name, measure: scol.label }));
        vals.push(base);
      });
    });
    // Bubbles fit inside one row of the grid, so sizes run smaller than on the other bubble charts.
    var lo = th.space[2], hi = th.space[8] - th.space[1];
    var size = function (v) { return lo + (hi - lo) * Math.sqrt(Math.max(v, 0) / (max || 1)); };
    var data = vals.map(function (p) {
      var d = p.sc.state === 'value' ? size(p.sc.v) : lo;
      if (m.hl.row(p.industryId) || m.hl.cell(p.entityId, p.industryId)) ring.push({ value: p.at, entityId: p.entityId, size: d });
      return { value: p.at, raw: [p.tc.v, p.sc.state === 'value' ? p.sc.v : null], keys: ['ind.tier', sizeId], entityId: p.entityId,
        industryId: p.industryId, symbolSize: d, label: { show: true, position: 'right', fontSize: th.type.chart, color: th.ink, formatter: String(p.tc.v) },
        itemStyle: { color: th.tiers[p.tc.v] ? th.tiers[p.tc.v].bg : th.muted, borderColor: th.ink,
          borderWidth: th.border.control, opacity: p.c.role === 'muted' ? 0.6 : 1 } };
    });
    function tip(prm) {
      var d = prm.data, p = rowsT.filter(function (x) { return x.entityId === d.entityId && x.industryId === d.industryId; })[0];
      var tier = p.tc.state === 'value' ? TAP.format.tier(p.tc.v) : t('states.notProvided');
      if (p.tc.state === 'value' && p.tc.v === 1 && p.r.ind.groupPriority) tier = t('tierGrid.cellCentral', { tier: tier });
      return K.tip(p.r.ind.name + ' · ' + p.c.label, [[t('tierGrid.tierTip'), tier], [meta.label, K.exact(p.sc, scol)], [t('chart.kind'), TAP.format.kind(meta.kind).text]]);
    }
    var np = K.npSeries(gaps.map(function (p) { return { value: p.at, entityId: p.entityId, industryId: p.industryId, text: '', title: p.r.ind.name + ' · ' + p.c.label, what: t('tierGrid.tierTip') }; }));
    np.label.show = false;
    var catLabel = { interval: 0, fontSize: th.type.chart, color: th.ink };
    var option = { tooltip: { trigger: 'item' }, grid: K.grid({ top: th.space[12], right: th.space[6] }),
      xAxis: { type: 'category', position: 'top', data: m.cols.map(function (c) { return c.label; }), axisLine: { show: false },
        axisLabel: Object.assign({}, catLabel, { width: th.space[12] * 2, overflow: 'break', color: function (v, i) { return m.cols[i] && m.cols[i].role === 'muted' ? th.muted : th.ink; } }) },
      yAxis: { type: 'category', inverse: true, axisLine: { show: false }, axisLabel: catLabel,
        data: m.rows.map(function (r) { return (r.ind.groupPriority ? t('tierGrid.star') + ' ' : '') + r.ind.name; }) },
      series: [{ type: 'scatter', tapRole: 'value', data: data, tooltip: { formatter: tip } }, np].concat(ring.length ? [K.ringSeries(ring)] : []) };
    var table = { columns: [{ key: 'entity', label: t('chart.entityColumn'), unit: 'text', align: 'left' },
      { key: 'industry', label: t('chart.industryColumn'), unit: 'text', align: 'left' },
      { key: 'ind.tier', label: TAP.measures.meta('ind.tier').label, unit: 'tier', align: 'left' },
      { key: sizeId, label: meta.label, unit: meta.unit, align: 'right' }],
      rows: rowsT.map(function (p) {
        var cells = { entity: textCell(p.c.label), industry: textCell(p.r.ind.name), 'ind.tier': p.tc };
        cells[sizeId] = p.sc; return { entityId: p.entityId, industryId: p.industryId, cells: cells, src: p.tc.src };
      }) };
    var legend = [{ label: t('tierGrid.legendColour'), color: null, role: 'note' }].concat(tierLegend());
    var sl = max > 0 ? { label: t('tierGrid.sizeLegend', { measure: scol.label }), kind: TAP.format.kind(meta.kind).text,
      items: [max, max / 4, max / 16].map(function (v) { return { d: Math.round(size(v)), text: TAP.format.cell({ v: v, state: 'value' }, { unit: meta.unit }) }; }) } : null;
    return { option: option, table: table, legend: legend, sizeLegend: sl, notes: notes,
      height: th.space[12] * 2 + m.rows.length * th.space[8] };
  }

  function tierLegend() {
    var th = k().th();
    return [1, 2, 3].map(function (x) { return { label: th.tiers[x].label, color: th.tiers[x].bg, role: 'tier' }; })
      .concat([{ label: t('tierGrid.legendGroup'), color: null, role: 'note' }, { label: t('tierGrid.legendNp'), color: null, role: 'notProvided' }]);
  }

  /* ---------- takeaway, missing, target ---------- */

  // Says what this comparison shows, never more than the regions on screen.
  function takeaway(m) {
    if (!m.rows.length) return null;
    if (m.cols.length === 1) {
      var tot = { 2: 0, 3: 0 };
      m.rows.forEach(function (r) { tot[2] += r.n[2]; tot[3] += r.n[3]; });
      return t('tierGrid.takeawayOne', { region: m.cols[0].label, t2: tot[2], t3: tot[3] });
    }
    var focus = m.cols[0].role === 'focus' ? m.cols[0] : null;
    if (focus) {
      var apart = m.rows.filter(function (r) { var c = r.cells[0], o = othersMode(r); return c.state === 'value' && o != null && o !== c.v; });
      if (apart.length) return t('tierGrid.takeawayFocus', { region: focus.label, n: apart.length, total: m.rows.length, industry: apart[0].ind.name });
    }
    var split = m.rows.slice().sort(sortFns().disagreement)[0];
    if (split.distinct <= 1) return t('tierGrid.takeawaySame');
    var same = m.rows.filter(function (r) { return r.distinct === 1; }).length;
    var counts = [1, 2, 3].filter(function (x) { return split.n[x]; }).map(function (x) { return t('tierGrid.countPart', { tier: x, n: split.n[x] }); });
    return t('tierGrid.takeawaySplit', { same: same, total: m.rows.length, industry: split.ind.name, counts: counts.join(', ') });
  }

  // The tier most of the other regions chose, or null when no single tier leads.
  function othersMode(r) {
    var n = { 1: 0, 2: 0, 3: 0 };
    r.cells.slice(1).forEach(function (c) { if (c.state === 'value' && n[c.v] != null) n[c.v]++; });
    var top = Math.max(n[1], n[2], n[3]), lead = [1, 2, 3].filter(function (x) { return n[x] === top; });
    return top && lead.length === 1 ? lead[0] : null;
  }

  function missing(m) {
    var ids = m.ids.filter(function (id, i) { return m.rows.length && m.rows.every(function (r) { return r.cells[i].state === 'notProvided'; }); });
    var any = m.rows.some(function (r) { return r.provided > 0; });
    return { names: ids.map(rname), empty: !any };
  }

  function targetFn(def) {
    return function (params) {
      var d = params && params.data;
      if (!d) return null;
      var r = d.regionId || d.entityId || null, i = d.industryId || null;
      if (!r && !i) return null;
      return { reportId: def.id, regionIds: r ? [r] : [], industryIds: i ? [i] : [], accountIds: [], mark: r && i ? 'cell' : 'industryRow' };
    };
  }

  function build(ctx) {
    var K = k(), m = model(ctx), gap = missing(m), type = ctx.type || ctx.def.defaultType;
    var res = K.result(ctx.def, null, { missing: gap.names, empty: gap.empty, target: targetFn(ctx.def), takeaway: takeaway(m),
      controls: [{ key: 'sort', label: t('tierGrid.sortLabel'), kind: 'segmented', value: m.sort,
        options: m.sorts.map(function (s) { return { value: s, label: t('tierGrid.sorts.' + s) }; }) }] });
    if (type === 'bubbleGrid') Object.assign(res, bubbleGrid(m, ctx));
    else {
      res.table = matrix(m);
      res.legend = tierLegend();
      if (type !== 'table') res.html = heatmap(m);
    }
    res.notes = combinedNote(ctx).concat(res.notes || []);
    return res;
  }

  // A tier is a choice, not a number, so it can't be averaged or summed: say so when the comparison combines regions.
  function combinedNote(ctx) {
    var ents = ctx.entities || TAP.scope.entities(ctx.cmp);
    if (!ents.some(function (e) { return e.kind === 'combined'; })) return [];
    return [t(ents.some(function (e) { return e.role === 'focus'; }) ? 'tierGrid.notCombinedRest' : 'tierGrid.notCombinedAll')];
  }

  TAP.builders.register('tierGrid', TAP.shapes.kit.safely(build));
})(window.TAP);
