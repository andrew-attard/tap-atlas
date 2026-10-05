/*
 * File: tests/test-measures-p4.js
 * Purpose: Tests for the Phase 4 measures and breakdowns, checked against the hand calculations in
 *          tests/fixtures/mini-p4-expected.js (never against the measures' own output).
 * Provides: test cases TPV-TC-667 to 675 and 677, X-p4-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: ENGINE4 stream
 */
(function (TAP) {
  'use strict';

  var X = window.TEST_EXPECT.miniP4;
  var TOL = 1e-6;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'], TYPES = ['arr', 'services', 'swPerpetual', 'hardware'];
  var NEW_DIMS = ['solution', 'category', 'route', 'maturity', 'partnerType'];
  var RATIOS = ['bk.gapShare', 'sp.variancePct', 'by.growth', 'by.coverage', 'rv.share'];

  // Every id in ARCHITECTURE 19.2, with its value kind, source kind and dims as the table gives them.
  // by.coverage is the workbook's figure when it gives one, so its cells may also be PRE. nb.oi.sol is a sum of
  // two workbook figures made by this app (as nb.oi is), so it reads APP.
  function catalogue() {
    var c = {}, YCM = ['year', 'channel', 'motion'], YC = ['year', 'category'];
    function add(id, valueKind, kind, dims) { c[id] = { valueKind: valueKind, kind: kind, dims: dims }; }
    add('bk.oi', 'amount', 'DER', YCM);
    TYPES.forEach(function (t) { add('bk.' + t, 'amount', 'DER', YCM); add('sp.' + t, 'amount', 'PRE', YC); });
    CH.forEach(function (ch) { add('bk.oi.' + ch, 'amount', 'DER', ['year', 'motion']); });
    add('cv.oi', 'amount', 'DER', YCM);
    add('bk.gap', 'amount', 'APP', ['year', 'channel']);
    add('bk.gapShare', 'rate', 'APP', ['year', 'channel']);
    add('sp.oi', 'amount', 'PRE', YC);
    add('sp.plan', 'amount', 'DER', YC);
    add('sp.variance', 'amount', 'APP', YC);
    add('sp.variancePct', 'rate', 'APP', YC);
    ['budget', 'forecast', 'actuals', 'pipeline'].forEach(function (f) { add('by.' + f, 'amount', 'PRE', ['category']); });
    add('by.growth', 'rate', 'APP', ['category']);
    add('by.coverage', 'rate', 'APP', ['category']);
    ['nb', 'cg', 'all'].forEach(function (m) {
      ['arr', 'services', 'oi'].forEach(function (t) { add('rv.' + m + '.' + t, 'amount', 'DER', m === 'all' ? YCM : ['year', 'channel']); });
    });
    add('rv.share', 'rate', 'APP', ['year', 'channel']);
    add('nb.arr.sol', 'amount', 'DER', ['year', 'solution']);
    add('nb.services.sol', 'amount', 'DER', ['year', 'solution']);
    add('nb.oi.sol', 'amount', 'APP', ['year', 'solution']);
    add('oi.cat', 'amount', 'DER', YC);
    add('rt.oi', 'amount', 'DER', ['year', 'route', 'solution']);
    add('pt.count.maturity', 'count', 'IN', ['maturity', 'partnerType']);
    add('pt.oi.maturity', 'amount', 'IN', ['maturity', 'partnerType']);
    return c;
  }
  var CAT = catalogue(), IDS = Object.keys(CAT);

  function load(name) { return TAP.data.load(window.T_FIXTURE(name || 'miniP4')); }
  function cmp(c) { return Object.assign(TAP.store.defaults().cmp, c); }
  function org() { return TAP.scope.entities(cmp({ mode: 'org' }))[0]; }
  function rest(focus, how) { return TAP.scope.entities(cmp({ mode: 'one', focus: focus, restAgg: how }))[1]; }
  function entity(name) {
    if (name === 'org' || name === 'orgTotal') return org();
    if (name === 'restOfAlphaAverage') return rest('alpha', 'average');
    return TAP.scope.entities(cmp({ mode: 'all' })).filter(function (e) { return e.id === name; })[0];
  }
  function parse(key) {
    var y = /^(.*)\.y(\d)$/.exec(key);
    return { id: y ? y[1] : key, year: y ? +y[2] : null };
  }

  // Checks a cell against a hand-calculated value: a number, null (not provided) or 'na' (not applicable).
  function expectCell(a, c, exp, what) {
    a.ok(c && c.src, what + ' returns a cell with a source');
    if (exp === null) { a.equal(c.state, 'notProvided', what + ' is not provided'); a.equal(c.v, null); return; }
    if (exp === 'na') { a.equal(c.state, 'notApplicable', what + ' is not applicable'); return; }
    a.equal(c.state, 'value', what + ' has a value');
    if (typeof exp === 'string') a.equal(c.v, exp, what); else a.near(c.v, exp, TOL, what);
  }
  // Region and combined figures for the ids matching a pattern, then the figures in another context
  function check(a, re) {
    var n = 0;
    Object.keys(X.region).forEach(function (r) {
      Object.keys(X.region[r]).forEach(function (key) {
        var k = parse(key);
        if (!re.test(k.id)) return;
        var fn = TAP.measures.get(k.id);
        a.ok(fn, k.id + ' is defined');
        if (fn) expectCell(a, fn(r, { year: k.year }), X.region[r][key], r + ' ' + key);
        n++;
      });
    });
    X.context.filter(function (x) { return re.test(x.id); }).forEach(function (x) {
      var fn = TAP.measures.get(x.id);
      a.ok(fn, x.id + ' is defined');
      if (fn) expectCell(a, fn(x.region, x.ctx), x.v, x.region + ' ' + x.id + ' ' + JSON.stringify(x.ctx));
    });
    a.ok(n > 0, 'some figures were checked');
  }
  function checkCombined(a, re) {
    Object.keys(X.combined).forEach(function (name) {
      Object.keys(X.combined[name]).forEach(function (key) {
        var k = parse(key);
        if (re.test(k.id)) expectCell(a, TAP.measures.combined(k.id, entity(name), { year: k.year }), X.combined[name][key], name + ' ' + key);
      });
    });
    X.combinedContext.filter(function (x) { return re.test(x.id); }).forEach(function (x) {
      expectCell(a, TAP.measures.combined(x.id, entity(x.entity), x.ctx), x.v, x.entity + ' ' + x.id + ' ' + JSON.stringify(x.ctx));
    });
  }
  function def(ids, bds) {
    return { id: 'x-p4', view: 'overview', title: 'Test', explain: { shows: 's', read: 'r', lookFor: 'l' }, shape: 'compare',
      defaultType: 'bar', types: ['bar', 'groupedBar', 'dot', 'table'], measures: ids.map(function (id) { return { id: id }; }),
      breakdowns: bds || TAP.reports.BREAKDOWNS.slice(), sources: ['DER'], options: {} };
  }
  function bdCols(id, dim, ent) {
    var ds = TAP.prepare.run(def([id]), { entities: [entity(ent)], breakdown: dim });
    return { row: ds.rows[0], cols: ds.columns.filter(function (c) { return c.breakdown && c.breakdown.dim === dim; }) };
  }
  function byId(list, id) { return list.filter(function (o) { return o.measureId === id; })[0]; }

  T.suite('measures-p4', function () {
    T.test('TPV-TC-667', 'Every Phase 4 measure is in the registry with its label, unit, value kind, source kind and dims', function (a) {
      load();
      IDS.forEach(function (id) {
        var m = TAP.measures.meta(id), want = CAT[id];
        a.ok(m, id + ' is defined');
        if (!m) return;
        a.ok(m.label && m.label.charAt(0) !== '[', id + ' has a label');
        a.ok(m.short && m.short.charAt(0) !== '[', id + ' has a short label');
        a.equal(m.unit, want.valueKind === 'rate' ? 'pct' : want.valueKind === 'count' ? 'count' : 'money', id + ' unit');
        a.equal(m.valueKind, want.valueKind, id + ' value kind');
        a.equal(m.kind, want.kind, id + ' source kind');
        a.deepEqual(m.dims, want.dims, id + ' dims');
        if (m.valueKind === 'rate') a.equal(m.combine, 'ratioOfSums', id + ' is combined from summed parts');
        var c = TAP.measures.get(id)('alpha', {});
        a.ok(c && c.src && c.src.regionId === 'alpha', id + ' carries its source');
        if (id !== 'by.coverage') a.equal(c.kind, m.kind, id + ' cell kind matches its meta');
      });
      // Build a chart lists measures by label, so no Phase 4 label repeats another measure's
      var labels = TAP.measures.list().map(function (id) { return TAP.measures.meta(id).label; });
      IDS.forEach(function (id) {
        var l = (TAP.measures.meta(id) || {}).label;
        a.equal(labels.filter(function (x) { return x === l; }).length, 1, id + ': no other measure is called "' + l + '"');
      });
    });

    T.test('TPV-TC-668', 'Strategic plan, the plan on the same basis and the variance equal the hand figures', function (a) {
      load();
      check(a, /^sp\./);
    });

    T.test('TPV-TC-669', 'Base year figures, year 1 growth and pipeline coverage equal the hand figures', function (a) {
      load();
      check(a, /^by\./);
      X.kinds.forEach(function (x) {
        a.equal(TAP.measures.get(x.id)(x.region, x.ctx).kind, x.kind, x.region + ' ' + x.id + ' ' + JSON.stringify(x.ctx) + ' kind');
      });
    });

    T.test('TPV-TC-670', 'Revenue by year, channel and motion, and revenue as a share of order intake, equal the hand figures', function (a) {
      load();
      check(a, /^rv\./);
    });

    T.test('TPV-TC-671', 'Solutions, product categories, books and customer value, routes and partner maturity equal the hand figures', function (a) {
      load();
      check(a, /^(nb\..*\.sol|oi\.cat|bk\.|cv\.|rt\.|pt\..*\.maturity)/);
    });

    T.test('TPV-TC-672', 'Combined shares and ratios are the ratio of the summed parts; money and counts sum', function (a) {
      load();
      checkCombined(a, /./);
      RATIOS.forEach(function (id) {
        var c = TAP.measures.combined(id, org(), {});
        a.equal(c.src.how, 'ratio', id + ' is combined from summed parts');
        a.ok(c.ratio && c.ratio.den > 0, id + ' carries its summed parts');
        a.near(c.v, c.ratio.num / c.ratio.den, TOL, id + ' is its parts divided');
        a.ok(Math.abs(c.v - X.meanOfRatios[id]) > 1e-4, id + ' is not the mean of the regions’ ratios');
        a.deepEqual(c.src.excluded, ['charlie'], id + ': Region C is left out and named');
        a.match(TAP.agg.describe(c), /Region C not included/, id + ': the note names it');
        a.ok(TAP.agg.describe(c).indexOf('[') < 0, id + ': the note reads as words');
        var r = TAP.measures.get(id)('alpha', {});
        a.ok(r.ratio && Math.abs(r.v - r.ratio.num / r.ratio.den) < TOL, id + ': a region’s cell carries its parts too');
      });
      ['bk.oi', 'sp.oi', 'sp.variance', 'by.forecast', 'rv.all.oi', 'rt.oi', 'pt.count.maturity'].forEach(function (id) {
        var c = TAP.measures.combined(id, org(), {});
        a.equal(c.src.how, 'sum', id + ' is summed');
        a.deepEqual(c.src.excluded, ['charlie'], id + ': Region C is left out and named');
      });
    });

    T.test('TPV-TC-673', 'A report may allow the five new breakdowns; an unknown one fails validation', function (a) {
      load();
      NEW_DIMS.forEach(function (d) { a.ok(TAP.reports.BREAKDOWNS.indexOf(d) >= 0, d + ' is a breakdown'); });
      a.deepEqual(TAP.reports.validate(def(['rt.oi'], NEW_DIMS)), [], 'solution, category, route, maturity and partnerType are accepted');
      var errs = TAP.reports.validate(def(['rt.oi'], ['solution', 'flavour']));
      a.equal(errs.length, 1, 'one error');
      a.match(errs[0], /flavour/, 'it names the unknown breakdown');
    });

    T.test('TPV-TC-674', 'A new breakdown is offered only for a measure that lists it, and follows the measure switch', function (a) {
      load();
      var d = def(['nb.arr.sol', 'oi.cat', 'rt.oi', 'pt.count.maturity', 'rv.all.oi', 'nb.arr', 'cg.arr']);
      function offered(id) { return TAP.prepare.breakdowns(d, { measureId: id }); }
      a.deepEqual(offered('nb.arr.sol'), ['year', 'solution']);
      a.deepEqual(offered('oi.cat'), ['year', 'category']);
      a.deepEqual(offered('rt.oi'), ['year', 'solution', 'route']);
      a.deepEqual(offered('pt.count.maturity'), ['maturity', 'partnerType']);
      a.deepEqual(offered('rv.all.oi'), ['year', 'channel', 'motion'], 'a measure without them is offered none of the five');
      a.deepEqual(offered('cg.arr'), ['year', 'industry'], 'an existing measure keeps its own');
      a.deepEqual(offered('nb.arr'), ['year', 'industry', 'solution'], 'new business ARR can be split by solution too');
      a.deepEqual(TAP.prepare.breakdowns(def(['rt.oi'], ['route']), {}), ['route'], 'and only those the report allows');
      var ds = TAP.prepare.run(d, { entities: [org()], measureId: 'rv.all.oi', breakdown: 'solution' });
      a.equal(ds.columns.filter(function (c) { return c.breakdown; }).length, 0, 'an unsupported breakdown adds no columns');
      NEW_DIMS.forEach(function (x) { a.ok(TAP.content.text('panel.breakdowns.' + x).charAt(0) !== '[', x + ' has a menu label'); });
    });

    T.test('TPV-TC-675', 'Build a chart lists every Phase 4 measure with its dims, and never sums a share or ratio', function (a) {
      load();
      var opts = TAP.custom.options();
      IDS.forEach(function (id) {
        var o = byId(opts, id), m = TAP.measures.meta(id);
        a.ok(o, id + ' is offered');
        if (!o) return;
        a.deepEqual(o.dims, m.dims, id + ' dims');
        a.deepEqual(o.by, ['entity'].concat(m.dims), id + ' can be shown by regions and each of its dims');
        o.by.forEach(function (by) {
          var d = TAP.custom.definition({ measure: id, by: by });
          a.ok(!d.errors, id + ' by ' + by + ' gives a definition' + (d.errors ? ': ' + d.errors.join(' ') : ''));
        });
      });
      RATIOS.forEach(function (id) {
        var d = TAP.custom.definition({ measure: id, by: 'entity', type: 'bar' });
        a.equal(d.explain.lookFor, TAP.content.text('custom.explain.combine.ratio'), id + ' says how it is combined');
        var ds = TAP.prepare.run(d, { cmp: cmp({ mode: 'one', focus: 'alpha', restAgg: 'total' }) });
        var cell = ds.rows.filter(function (r) { return r.entityId === 'rest'; })[0].cells[id];
        // The rest as a total gives the same ratio of sums as the rest as an average: a ratio is never added up
        a.near(cell.v, X.combined.restOfAlphaAverage[id], TOL, id + ' for the rest as a total');
      });
      a.equal(TAP.custom.definition({ measure: 'bk.oi', by: 'entity' }).explain.lookFor, TAP.content.text('custom.explain.combine.sum'));
      NEW_DIMS.forEach(function (x) { a.ok(TAP.custom.byLabel(x).charAt(0) !== '[', x + ' has a By label'); });
    });

    T.test('TPV-TC-677', 'Every Phase 4 measure has a hand-worked figure in the expected file', function (a) {
      var seen = {};
      Object.keys(X.region).forEach(function (r) {
        Object.keys(X.region[r]).forEach(function (key) { if (X.region[r][key] !== null) seen[parse(key).id] = true; });
      });
      IDS.forEach(function (id) { a.ok(seen[id], id + ' has a hand-worked figure for some region'); });
      TAP.measures.list().forEach(function (id) {
        if (TAP.measures.meta(id).optional) a.ok(!!CAT[id], id + ' is in the catalogue this file checks');
      });
    });

    T.test('X-p4-sources', 'A Phase 4 figure names its file, sheet and cell', function (a) {
      load();
      X.sources.forEach(function (x) {
        var c = TAP.measures.get(x.id)(x.region, x.ctx);
        a.equal(TAP.sources.address(c.src).text, x.text, x.id + ' ' + JSON.stringify(x.ctx));
      });
      var der = TAP.sources.address(TAP.measures.get('rv.nb.arr')('alpha', { channel: 'direct', year: 1 }).src);
      a.equal(der.calculated, true, 'revenue is calculated in the workbook');
      // A sum over a block of cells names the block; cells that leave gaps name the first and last and how many
      a.equal(TAP.sources.address(TAP.measures.get('sp.oi')('bravo', {}).src).text, 'Region B plan.xlsx › 5. Recap › E90:G91');
      a.equal(TAP.sources.address(TAP.measures.get('sp.oi')('delta', {}).src).text, 'Region D plan.xlsx › 5. Recap › E90 to G93 (8 cells)');
      // A recap sum reads as before: file and sheet
      a.equal(TAP.sources.address(TAP.measures.get('rc.nb.arr')('alpha', {}).src).text, 'Region A plan.xlsx › 4. Partner');
    });

    T.test('X-p4-partial', 'A blank inside a Phase 4 sum or ratio marks the figure partly provided', function (a) {
      load();
      Object.keys(X.partial).forEach(function (name) {
        ['yes', 'no'].forEach(function (want) {
          X.partial[name][want].forEach(function (id) {
            var c = name === 'orgTotal' ? TAP.measures.combined(id, org(), {}) : TAP.measures.get(id)(name, {});
            a.equal(c.state, 'value', name + ' ' + id + ' has a value');
            a.equal(!!c.partial, want === 'yes', name + ' ' + id + (want === 'yes' ? ' is' : ' is not') + ' partly provided');
            if (c.partial) a.ok(c.note && c.note.charAt(0) !== '[', name + ' ' + id + ' says why');
          });
        });
      });
    });

    T.test('X-p4-fixture', 'The miniP4 fixture passes the contract check, and the earlier fixtures are unchanged', function (a) {
      var res = load();
      a.ok(res.ok, 'miniP4 loads');
      a.deepEqual(res.errors, [], 'no contract errors');
      a.equal(TAP.measures.get('rc.all.oi')('alpha', {}).v, window.TEST_EXPECT.miniP2.region.alpha['rc.all.oi'], 'the recap is miniP2’s');
      load('miniP2');
      a.equal(TAP.measures.get('pt.count')('bravo', {}).v, 1, 'miniP2 keeps its one partner in Region B');
    });
  });

  /* ---------- breakdown values (ARCHITECTURE 19.2) ---------- */

  T.suite('breakdowns-p4', function () {
    T.test('X-p4-breakdown-values', 'Each breakdown gives one column per lookup value, in its order, adding up to the total', function (a) {
      load();
      X.breakdowns.forEach(function (b) {
        var x = bdCols(b.id, b.dim, b.entity), sum = 0, what = b.dim + ' ' + b.id + ' ' + b.entity;
        a.deepEqual(x.cols.map(function (c) { return String(c.breakdown.value); }).filter(function (v) { return v in b.values; }),
          Object.keys(b.values), what + ': the values in the lookup’s order');
        Object.keys(b.values).forEach(function (v) {
          var col = x.cols.filter(function (c) { return String(c.breakdown.value) === v; })[0];
          a.ok(col, what + ': a column for ' + v);
          if (!col) return;
          a.equal(col.key, b.id + '@' + b.dim + ':' + v, what + ' column key');
          expectCell(a, x.row.cells[col.key], b.values[v], what + ' ' + v);
        });
        x.cols.forEach(function (c) { if (x.row.cells[c.key].state === 'value') sum += x.row.cells[c.key].v; });
        a.near(sum, b.total, TOL, what + ': the parts add up');
        a.near(x.row.cells[b.id].v, b.total, TOL, what + ': the total without a breakdown');
      });
    });

    T.test('X-p4-breakdown-values', 'Columns are named from the lookups; "none" appears only when a row has no value', function (a) {
      load();
      function labels(id, dim, ent) { return bdCols(id, dim, ent).cols.map(function (c) { return c.breakdown.label; }); }
      a.deepEqual(labels('nb.arr.sol', 'solution', 'org'), ['Solution 1', 'Solution 2', 'Solution 3', TAP.content.text('breakdown.solution.none')]);
      a.deepEqual(labels('oi.cat', 'category', 'org'), ['Software perpetual', 'Recurring', 'Hardware', 'Services']);
      a.deepEqual(labels('rt.oi', 'route', 'org'), ['Own sales force', 'Customer success', 'Alliance B as reseller', 'Other resellers',
        'System integrators', 'Partner existing business']);
      a.deepEqual(labels('pt.count.maturity', 'maturity', 'org'), ['Recruit', 'Onboard', 'Enable', 'Skill', 'Strategic',
        TAP.content.text('breakdown.maturity.none')]);
      a.deepEqual(labels('pt.count.maturity', 'partnerType', 'org'), ['Value-added reseller', 'System integrator', 'Referral partner',
        TAP.content.text('breakdown.partnerType.none')]);
      NEW_DIMS.forEach(function (d) { a.ok(TAP.content.text('breakdown.' + d + '.none').charAt(0) !== '[', d + ': "none" has its words'); });
      X.noNone.forEach(function (b) {
        a.deepEqual(bdCols(b.id, b.dim, b.entity).cols.map(function (c) { return c.breakdown.value; }), b.values, b.id + ' by ' + b.dim + ' for ' + b.entity);
      });
    });

    T.test('X-p4-breakdown-values', 'Maturity columns follow the lookup’s rank, whatever order the file lists it in', function (a) {
      var p = window.T_FIXTURE('miniP4');
      p.lookups.partnerMaturity.reverse();
      TAP.data.load(p);
      a.deepEqual(bdCols('pt.count.maturity', 'maturity', 'org').cols.map(function (c) { return c.breakdown.value; }),
        ['recruit', 'onboard', 'enable', 'skill', 'strategic', 'none']);
    });

    T.test('X-p4-nb-solution', 'The existing new business figures are unchanged, and their solution columns add up to them', function (a) {
      load();
      var M1 = window.TEST_EXPECT.mini, M2 = window.TEST_EXPECT.miniP2;
      ['alpha', 'bravo', 'charlie', 'delta'].forEach(function (r) {
        a.ok('nb.arr' in M1.region[r], r + ' has a hand figure for nb.arr');
        ['nb.arr', 'nb.services', 'nb.targetAccounts', 'nb.hitRate'].forEach(function (id) {
          if (id in M1.region[r]) expectCell(a, TAP.measures.get(id)(r, {}), M1.region[r][id], r + ' ' + id + ' as in mini-expected');
        });
      });
      a.near(TAP.measures.get('nb.oi')('alpha', {}).v, M2.region.alpha['nb.oi'], TOL, 'nb.oi as in mini-p2-expected');
      a.near(TAP.measures.combined('nb.arr', org(), {}).v, M1.combined.orgTotal['nb.arr'], TOL, 'the organization total as in mini-expected');
      ['nb.arr', 'nb.services', 'nb.oi'].forEach(function (id) {
        a.ok(TAP.measures.meta(id).dims.indexOf('solution') >= 0, id + ' lists solution');
        a.deepEqual(TAP.measures.meta(id).dims.slice(0, 2), ['year', 'industry'], id + ' keeps year and industry');
      });
      ['cg.arr', 'amb.arr', 'nb.hitRate'].forEach(function (id) { a.ok(TAP.measures.meta(id).dims.indexOf('solution') < 0, id + ' does not'); });
      X.nbBySolution.forEach(function (b) {
        var x = bdCols(b.id, 'solution', b.entity), sum = 0, what = b.id + ' by solution for ' + b.entity;
        a.deepEqual(x.cols.map(function (c) { return c.breakdown.value; }), Object.keys(b.values), what + ': the columns');
        x.cols.forEach(function (c) {
          expectCell(a, x.row.cells[c.key], b.values[c.breakdown.value], what + ' ' + c.breakdown.value);
          sum += x.row.cells[c.key].v;
        });
        a.near(sum, b.total, TOL, what + ': the columns add up');
        a.near(x.row.cells[b.id].v, b.total, TOL, what + ': to the figure without a breakdown');
      });
      X.nbSolutionContext.forEach(function (x) {
        expectCell(a, TAP.measures.get(x.id)(x.region, x.ctx), x.v, x.region + ' ' + x.id + ' ' + JSON.stringify(x.ctx));
      });
    });

    T.test('X-p4-nb-solution', 'On a file that names no solution, new business is not offered by solution', function (a) {
      ['mini', 'miniP2'].forEach(function (name) {
        load(name);
        a.deepEqual(byId(TAP.custom.options(), 'nb.arr').by, ['entity', 'year', 'industry'], name + ': Build a chart');
        a.deepEqual(TAP.prepare.breakdowns(def(['nb.arr', 'nb.oi']), { measureId: 'nb.oi' }), ['year', 'industry'], name + ': the breakdown menu');
      });
      load();
      a.deepEqual(byId(TAP.custom.options(), 'nb.arr').by, ['entity', 'year', 'industry', 'solution'], 'miniP4 names solutions: offered');
      var p = window.T_FIXTURE('miniP4');
      p.regions.forEach(function (r) { (r.newBusiness || []).forEach(function (row) { row.solution = null; }); });
      TAP.data.load(p);   // the lookup is there, but no row names a solution
      a.deepEqual(byId(TAP.custom.options(), 'nb.arr').by, ['entity', 'year', 'industry'], 'a lookup alone is not data');
      a.deepEqual(byId(TAP.custom.options(), 'rt.oi').by, ['entity', 'year', 'route', 'solution'], 'routes still name solutions');
    });

    T.test('X-p4-against', 'A report passes its choice of base-year figure to the growth measure', function (a) {
      load();
      var d = def(['by.growth'], []);
      function alpha(ctx) { return TAP.prepare.run(d, Object.assign({ entities: [entity('alpha')] }, ctx)).rows[0].cells['by.growth'].v; }
      a.near(alpha({}), X.region.alpha['by.growth'], TOL, 'the forecast unless told otherwise');
      a.near(alpha({ opts: { against: 'budget' } }), 0.1381579, TOL, 'the budget, chosen in the panel: (865 - 760) / 760');
      d.options = { against: 'budget' };
      a.near(alpha({}), 0.1381579, TOL, 'or set by the report');
      a.near(alpha({ opts: { against: 'forecast' } }), X.region.alpha['by.growth'], TOL, 'the panel’s choice wins');
    });
  });

  /* ---------- a file without Phase 4 parts, Build a chart and the partner list ---------- */

  T.suite('p4-additions', function () {
    T.test('X-p4-no-data', 'On a file with no Phase 4 part every Phase 4 measure is not provided and nothing else changes', function (a) {
      ['mini', 'miniP2'].forEach(function (name) {
        load(name);
        IDS.forEach(function (id) {
          if (id === 'cv.oi') return;   // customer value is the recap, which these files have
          TAP.data.regions().forEach(function (r) {
            a.equal(TAP.measures.get(id)(r.id, {}).state, 'notProvided', name + ': ' + id + ' for ' + r.id);
          });
          a.equal(TAP.measures.combined(id, org(), {}).state, 'notProvided', name + ': ' + id + ' combined');
        });
        var opts = TAP.custom.options();
        // Customer value is offered with the books value it is compared with, not on its own
        IDS.forEach(function (id) {
          a.ok(!byId(opts, id), name + ': Build a chart does not offer ' + id);
          a.equal(TAP.measures.available(id), false, name + ': ' + id + ' is not available');
        });
        a.ok(!!byId(opts, 'nb.arr') && !!byId(opts, 'rc.all.oi'), name + ': the existing measures are still offered');
        a.deepEqual(TAP.rows.columns('partners').map(function (c) { return c.key; }), ['region', 'name', 'channel', 'maturity', 'expertiseGeo',
          'expertiseProduct', 'fteSales', 'fteConsultants', 'fte', 'centralSupportPct', 'arr3', 'services3', 'oiPerFte', 'alsoNamed'],
          name + ': the partner list has the columns it had');
        a.equal(TAP.rows.cell('partners', 'maturity', { regionId: 'alpha', sourceRow: 10 }).v, 'Developing', name + ': maturity reads as written');
      });
      load('miniP2');
      var all = def(['rc.all.arr', 'cg.currentArr', 'nb.arr']);
      a.deepEqual(TAP.prepare.breakdowns(all, { measureId: 'rc.all.arr' }), ['year', 'channel', 'motion'], 'breakdown menus are as before');
      a.deepEqual(TAP.prepare.breakdowns(all, { measureId: 'cg.currentArr' }), ['segment', 'risk']);
      a.deepEqual(TAP.prepare.breakdowns(all, { measureId: 'nb.arr' }), ['year', 'industry']);
    });

    T.test('X-p4-custom-gate', 'Build a chart offers a Phase 4 measure only when some region has a value for it', function (a) {
      var p = window.T_FIXTURE('miniP4');
      p.regions.forEach(function (r) { delete r.routes; if (r.id !== 'delta') delete r.strategicPlan; });
      TAP.data.load(p);
      var opts = TAP.custom.options();
      a.ok(!byId(opts, 'rt.oi'), 'no region has routes: not offered');
      a.equal(TAP.measures.available('rt.oi'), false, 'and the registry says so');
      a.equal(TAP.measures.available('sp.oi'), true);
      a.equal(TAP.measures.available('nb.arr'), true, 'an earlier measure is always available');
      a.equal(TAP.measures.available('no.such'), false);
      a.ok(!!byId(opts, 'sp.oi') && !!byId(opts, 'sp.variancePct'), 'one region has a strategic plan: offered');
      a.ok(!byId(opts, 'sp.swPerpetual'), 'no region’s strategic plan gives software perpetual: not offered');
      a.ok(!!byId(opts, 'rv.all.oi'), 'the other parts stay');
    });

    T.test('X-p4-build-a-chart', 'A Phase 4 measure in Build a chart: its own dimensions, and a source on every value', function (a) {
      load();
      a.deepEqual(byId(TAP.custom.options(), 'rv.all.oi').by, ['entity', 'year', 'channel', 'motion']);
      var d = TAP.custom.definition({ measure: 'rv.all.oi', by: 'year' }), all = cmp({ mode: 'all' });
      var ds = TAP.prepare.run(d, { cmp: all, breakdown: 'year' }), n = 0;
      ds.rows.forEach(function (r) {
        ds.columns.forEach(function (c) {
          var cell = r.cells[c.key];
          if (cell.state !== 'value') return;
          n++;
          a.match(TAP.sources.address(cell.src).text, /plan\.xlsx › 5\. Recap/, r.entityId + ' ' + c.key + ' names its file and sheet');
        });
      });
      a.equal(n, 12, 'three regions, the total and three plan years each');
      a.deepEqual(ds.missing, ['Region C'], 'the region without revenue is named');
      var res = TAP.builders.get('compare')({ def: d, type: 'groupedBar', breakdown: 'year', cmp: all, entities: TAP.scope.entities(all) });
      a.ok(!res.error && res.empty === false, 'the chart draws');
    });

    // As X-review-PP-1 does on the sample data, here on the fixture that has every Phase 4 part
    T.test('X-p4-custom-draws', 'Every Phase 4 measure, dimension and chart type in Build a chart draws a non-empty chart', function (a) {
      load();
      var all = cmp({ mode: 'all' }), one = cmp({ mode: 'one', focus: 'alpha', restAgg: 'average' }), n = 0;
      TAP.custom.options().filter(function (o) { return !!CAT[o.measureId]; }).forEach(function (o) {
        o.by.forEach(function (by) {
          TAP.custom.types(by).forEach(function (type) {
            [all, one].forEach(function (c) {
              var d = TAP.custom.definition({ measure: o.measureId, by: by, type: type });
              var res = TAP.builders.get(d.builder || d.shape)({ def: d, type: type, measureId: null, sizeId: null, breakdown: d.defaultBreakdown,
                cmp: c, entities: TAP.scope.entities(c), year: null, industryId: null, highlight: null, expanded: false,
                theme: window.TAP_THEME, opts: {}, size: null, drill: null });
              n += 1;
              a.ok(res && !res.error && res.empty === false, o.measureId + ' by ' + by + ' as ' + type + ' (' + c.mode + ') has data' +
                (res && res.error ? ': ' + res.error : ''));
            });
          });
        });
      });
      a.ok(n > 200, 'every choice was tried (' + n + ')');
    });

    T.test('X-p4-partner-list', 'The partner list gains type, maturity and distribution, named from the lookups', function (a) {
      load();
      var cols = TAP.rows.columns('partners');
      function col(key) { return cols.filter(function (c) { return c.key === key; })[0]; }
      ['type', 'maturity', 'distribution'].forEach(function (k) {
        a.ok(col(k) && col(k).label.charAt(0) !== '[', k + ' is a column with a heading');
      });
      a.equal(col('distribution').unit, 'money');
      X.partnerList.forEach(function (x) {
        var id = x[0].split(':'), row = { regionId: id[0], sourceRow: +id[1] };
        ['type', 'maturity', 'distribution'].forEach(function (k, i) {
          expectCell(a, TAP.rows.cell('partners', k, row), x[i + 1], x[0] + ' ' + k);
        });
      });
      a.equal(TAP.rows.cell('partners', 'distribution', { regionId: 'alpha', sourceRow: 11 }).partial, true, 'A2’s year 3 is blank');
      var src = TAP.rows.cell('partners', 'type', { regionId: 'alpha', sourceRow: 10 }).src;
      a.equal(TAP.sources.address(src).text, 'Region A plan.xlsx › 4. Partner › P10');
    });

    T.test('X-p4-partner-list', 'Maturity sorts in the lookup’s order, not alphabetically, both ways', function (a) {
      load();
      var d = { id: 'x-p4-list', view: 'partners', title: 'Test', explain: { shows: 's', read: 'r', lookFor: 'l' }, shape: 'list',
        defaultType: 'list', types: ['list'], rows: 'partners', columns: [{ key: 'name' }, { key: 'type' }, { key: 'maturity' }, { key: 'distribution' }],
        sort: null, sources: ['IN'], breakdowns: [], options: {} };
      function ids(sort) {
        var c = cmp({ mode: 'all' });
        var res = TAP.builders.get('list')({ def: d, type: 'list', cmp: c, entities: TAP.scope.entities(c), opts: { sort: sort } });
        a.equal(res.error, null, sort + ' builds');
        a.deepEqual(res.notes, [], sort + ': no column is refused');
        return res.table.rows.map(function (r) { return r.id; });
      }
      a.deepEqual(ids('maturity:asc'), X.byMaturity, 'Recruit first, then Onboard, Enable, Strategic; none last');
      // Highest first; the two Enable partners keep their file order, and the blank stays last
      a.deepEqual(ids('maturity:desc'), ['alpha:11', 'alpha:10', 'bravo:11', 'bravo:10', 'delta:10', 'alpha:12']);
      a.deepEqual(ids('distribution:desc').slice(0, 2), ['alpha:10', 'delta:10'], 'distribution sorts as money: 900, then 300');
      a.deepEqual(ids('type:asc').slice(0, 1), ['delta:10'], 'type sorts by name: Referral partner first');
    });

    T.test('X-p4-partner-list', 'A maturity that is not in the lookup shows as written and sorts after the levels', function (a) {
      load();
      TAP.data.region('alpha').partners[0].maturity = 'Long-standing';   // A1, changed after loading
      var c = TAP.rows.cell('partners', 'maturity', { regionId: 'alpha', sourceRow: 10 });
      a.equal(c.v, 'Long-standing');
      var strategic = TAP.rows.cell('partners', 'maturity', { regionId: 'alpha', sourceRow: 11 });
      a.equal(strategic.v, 'Strategic', 'a name given as text reads as the level');
      a.ok(c.rank > strategic.rank, 'after the highest level');
      a.equal(TAP.measures.get('pt.count.maturity')('alpha', { maturity: 'none' }).v, 2, 'and counts with the partners without a level');
    });

    T.test('X-p4-partner-list', 'A list column the file has no data for is left out without a note', function (a) {
      load('miniP2');
      var d = { id: 'x-p4-list2', view: 'partners', title: 'Test', explain: { shows: 's', read: 'r', lookFor: 'l' }, shape: 'list',
        defaultType: 'list', types: ['list'], rows: 'partners', columns: [{ key: 'name' }, { key: 'type' }, { key: 'maturity' }, { key: 'distribution' }],
        sort: null, sources: ['IN'], breakdowns: [], options: {} }, c = cmp({ mode: 'all' });
      var res = TAP.builders.get('list')({ def: d, type: 'list', cmp: c, entities: TAP.scope.entities(c), opts: {} });
      a.deepEqual(res.table.columns.map(function (x) { return x.key; }), ['name', 'maturity'], 'type and distribution are not shown');
      a.deepEqual(res.notes, [], 'and nothing is said about them');
      d.columns.push({ key: 'colour' });
      res = TAP.builders.get('list')({ def: d, type: 'list', cmp: c, entities: TAP.scope.entities(c), opts: {} });
      a.equal(res.notes.length, 1, 'a column that does not exist is still named');
    });
  });
})(window.TAP);
