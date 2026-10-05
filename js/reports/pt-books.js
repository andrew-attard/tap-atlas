/*
 * File: js/reports/pt-books.js
 * Purpose: Customer value next to books value (US-4.5.1): two bars per region, order intake at the price the customer
 *          pays and the part that runs through the organization's books, each split by channel or, with the switch,
 *          by product category, with the difference in money and as a share of customer value. One plan year or the
 *          three years together. Every figure is an engine measure (ARCHITECTURE 19.2); nothing is worked out here.
 * Provides: builder 'ptBooks' (registered with TAP.builders); TAP.ptBooks (model)
 * Depends on: js/reports/stack-draw.js, js/engine/prepare.js, js/engine/measures.js, measures-p4.js (kit4: the
 *             product categories), js/engine/scope.js, js/engine/shapes.js (drawing kit), js/core/data.js,
 *             js/core/content.js, js/core/format.js, js/theme.js (all at call time)
 * Used by: config/reports-partners.js (pt-books), js/panel/panel.js (through TAP.builders)
 * Owner: NBPT stream (#453)
 *
 * Panel options (builder controls): opts.year 'all' | '1' | '2' | '3', opts.split 'channel' | 'category'.
 */
(function (TAP) {
  'use strict';

  function k() { return TAP.shapes.kit; }
  function t(key, vars) { return TAP.content.text('ptBooks.' + key, vars); }
  function text(v) { return { v: v, state: 'value', kind: null }; }
  var CV = 'cv.oi', BK = 'bk.oi', GAP = 'bk.gap', SHARE = 'bk.gapShare';
  // Customer value holds ARR and services only: its measure for each product category, where it has one
  var CV_CAT = { recurring: 'rc.all.arr', services: 'rc.all.services' };
  var BOOKS_ONLY = ['bk.swPerpetual', 'bk.hardware'];
  // Text cells and gaps in the table carry no kind, so they are never read as a figure
  var NA = { v: null, state: 'notApplicable', kind: null };

  function yearOf(ctx) { var y = Number((ctx.opts || {}).year); return y >= 1 && y <= 3 ? y : null; }
  function splitOf(ctx) { return (ctx.opts || {}).split === 'category' ? 'category' : 'channel'; }
  function yearLabel(y) {
    var ys = (TAP.data.meta() || {}).years;
    return ys && ys[y - 1] ? String(ys[y - 1]) : TAP.content.text('chart.year', { n: y });
  }
  function partsOf(split) {
    var list = split === 'category' ? TAP.measures.kit4.lookup('productCategories') : (TAP.data.lookups() || {}).channels || [];
    return list.map(function (x) { return { value: x.id, label: x.name, key: x.id }; });
  }

  // Per entity: the customer value bar and the books value bar, a cell per part, and the differences.
  function model(ctx) {
    var def = ctx.def, year = yearOf(ctx), split = splitOf(ctx), parts = partsOf(split);
    var entities = ctx.entities || TAP.scope.entities(ctx.cmp);
    function at(id, e, x) { return TAP.measures.combined(id, e, Object.assign({ year: year }, x)); }
    var items = entities.map(function (e) {
      var it = { e: e, cv: { total: at(CV, e), cells: {}, keys: {} }, bk: { total: at(BK, e), cells: {}, keys: {} },
        gap: at(GAP, e), share: at(SHARE, e), gaps: {}, shares: {} };
      parts.forEach(function (p) {
        var x = {};
        x[split] = p.value;
        if (split === 'channel') {
          it.cv.cells[p.key] = at(CV, e, x);
          it.cv.keys[p.key] = CV + '@channel:' + p.value;
          it.bk.cells[p.key] = at(BK, e, x);
          it.bk.keys[p.key] = BK + '@channel:' + p.value;
          it.gaps[p.key] = at(GAP, e, x);
          it.shares[p.key] = at(SHARE, e, x);
        } else {
          it.cv.cells[p.key] = CV_CAT[p.value] ? at(CV_CAT[p.value], e) : NA;
          it.cv.keys[p.key] = CV_CAT[p.value] || CV;
          it.bk.cells[p.key] = at('oi.cat', e, x);
          it.bk.keys[p.key] = 'oi.cat@category:' + p.value;
        }
      });
      return it;
    });
    // Whether a region has books value at all decides "not provided" and the empty state
    var d2 = Object.assign({}, def, { shape: 'compare', builder: null, measures: [{ id: BK }], breakdowns: [], options: {} });
    var ds = TAP.prepare.run(d2, Object.assign({}, ctx, { def: d2, measureId: BK, breakdown: null, year: year }));
    return { def: def, year: year, split: split, parts: parts, entities: entities, items: items, ds: ds };
  }

  function money(c) { return TAP.format.cell(c, { unit: 'money' }); }

  // The two bars of each entity, as js/reports/stack-draw.js draws them.
  function rowsOf(mo) {
    var rows = [], kit = k();
    mo.items.forEach(function (it) {
      [['cv', t('customer')], ['bk', t('books')]].forEach(function (b) {
        var side = it[b[0]], after = null;
        if (b[0] === 'bk' && it.gap.state === 'value') {
          after = it.share.state === 'value' ? t('after', { gap: money(it.gap), share: TAP.format.pct(it.share.v) }) : t('afterGap', { gap: money(it.gap) });
        }
        rows.push({ id: it.e.id + ':' + b[0], entityId: it.e.id, entity: it.e, group: b[0], cells: side.cells, keys: side.keys,
          total: side.total, after: after, label: kit.t('breakdown.entityValue', { entity: it.e.label, value: b[1] }) });
      });
    });
    return rows;
  }

  // One line per entity and part, then the entity's line for every part together: both values and the difference.
  function table(mo) {
    var C = function (key, label, unit) { return { key: key, label: label, unit: unit, align: unit === 'text' ? 'left' : 'right' }; };
    var M = TAP.measures.meta, kit = k();
    var cols = [C('entity', kit.t('chart.entityColumn'), 'text'), C('part', TAP.content.text('panel.breakdowns.' + mo.split), 'text'),
      C(CV, M(CV).short, 'money'), C(BK, M(BK).short, 'money'), C(GAP, M(GAP).short, 'money'), C(SHARE, M(SHARE).short, 'pct')];
    var rows = [];
    function line(it, id, label, cv, bk, gap, share) {
      var cells = { entity: text(it.e.label), part: text(label) };
      cells[CV] = cv; cells[BK] = bk; cells[GAP] = gap || NA; cells[SHARE] = share || NA;
      rows.push({ id: it.e.id + ':' + id, entityId: it.e.id, part: id, cells: cells, src: bk.src || null });
    }
    mo.items.forEach(function (it) {
      mo.parts.forEach(function (p) { line(it, p.value, p.label, it.cv.cells[p.key], it.bk.cells[p.key], it.gaps[p.key], it.shares[p.key]); });
      line(it, 'all', t('all.' + mo.split), it.cv.total, it.bk.total, it.gap, it.share);
    });
    return { columns: cols, rows: rows };
  }

  function controls(mo) {
    return [
      { key: 'year', label: t('year'), kind: 'segmented', value: mo.year ? String(mo.year) : 'all',
        options: [{ value: 'all', label: t('allYears') }].concat([1, 2, 3].map(function (y) { return { value: String(y), label: yearLabel(y) }; })) },
      { key: 'split', label: t('split'), kind: 'segmented', value: mo.split,
        options: ['channel', 'category'].map(function (s) { return { value: s, label: TAP.content.text('panel.breakdowns.' + s) }; }) }
    ];
  }

  // Says so when some books value in scope is software perpetual or hardware, which the difference leaves out.
  function notes(mo) {
    var out = k().notes(mo.ds, [BK]);
    var only = mo.entities.some(function (e) {
      return BOOKS_ONLY.some(function (id) { var c = TAP.measures.combined(id, e, { year: mo.year }); return c.state === 'value' && c.v !== 0; });
    });
    return only ? out.concat([t('booksOnly')]) : out;
  }

  // A segment opens its details. With one plan year chosen the figure named is the bar's total for that year.
  function targetFn(mo) {
    return function (params) {
      var d = params && params.data, e = d && mo.entities.filter(function (x) { return x.id === d.entityId; })[0];
      if (!e) return null;
      var books = /:bk$/.test(d.rowId || ''), key = mo.year ? (books ? BK : CV) + '@y' + mo.year : d.key || (books ? BK : CV);
      return { reportId: mo.def.id, regionIds: e.regionIds.slice(), industryIds: [], accountIds: [], mark: 'bar',
        figure: { key: key, how: e.kind === 'combined' ? e.how : null } };
    };
  }

  // On a books value segment by channel, the tooltip adds that channel's difference in money and %.
  function tipFn(mo) {
    return function (row, part) {
      var it = mo.items.filter(function (x) { return x.e.id === row.entityId; })[0], M = TAP.measures.meta;
      if (!it || row.group !== 'bk' || !it.gaps[part.key]) return [];
      return [[M(GAP).short, TAP.format.cell(it.gaps[part.key], { unit: 'money', exact: true })],
        [M(SHARE).short, TAP.format.cell(it.shares[part.key], { unit: 'pct', exact: true })]];
    };
  }

  function build(ctx) {
    var def = ctx.def, kit = k(), D = TAP.stackDraw, mo = model(ctx), th = kit.th();
    var res = kit.result(def, mo.ds, { table: table(mo), notes: notes(mo), controls: controls(mo), target: targetFn(mo) });
    if (mo.ds.empty) { res.empty = true; return res; }
    if ((ctx.type || def.defaultType) === 'table') return res;
    var d = { label: TAP.measures.meta(BK).short, unit: 'money', parts: mo.parts, rows: rowsOf(mo), entities: mo.entities, groups: [],
      numbered: false, highlight: ctx.highlight, right: th.space[12] * 5, tip: tipFn(mo) };
    res.option = D.bars(d, 'stackedBar');
    res.legend = D.legend(d);
    if (d.rows.length > 8) res.height = th.space[12] * 2 + d.rows.length * th.space[8];
    return res;
  }

  TAP.builders.register('ptBooks', TAP.shapes.kit.safely(build));
  TAP.ptBooks = { model: model };
})(window.TAP);
