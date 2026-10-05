/*
 * File: tests/test-data.js
 * Purpose: Tests for the sample data file: shape, consistency and planted gaps (TPV-TC-193 to 196, 199).
 * Provides: test cases for DATA stories (#25, #26, #27): TPV-TC-193 to 196, TPV-TC-199, TPV-TC-020 (sample), X-data-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, data/sample-plan-data.js (window.PLAN_DATA),
 *             tests/fixtures/sample-expected.js (window.SAMPLE_EXPECT)
 * Used by: tests.html
 *
 * Consistency is recomputed here from the raw rows, independently of the app's code.
 * Money is rounded to one decimal in the file, so formulas are checked to within that rounding.
 */
(function (TAP) {
  'use strict';

  var P = window.PLAN_DATA;
  var X = window.SAMPLE_EXPECT;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'];
  var RATINGS = ['growthPotential', 'criticality', 'competitiveIntensity', 'references', 'expertise', 'productFit'];
  var ROUND = 0.051;   // one-decimal rounding, plus floating-point slack

  // docs/PLANTED-CASES.md: regions and industries, in file order.
  var REGIONS = [['na', 'North America'], ['latam', 'Latin America'], ['neu', 'Northern Europe'], ['seu', 'Southern Europe'],
    ['ceu', 'Central Europe'], ['mea', 'Middle East & Africa'], ['apac', 'Asia Pacific']];
  var INDUSTRIES = 'busServices:pl3 culture:pl3 utilities:pl2 media:pl3 finance:pl1 government:pl1 healthcare:pl1:G ' +
    'hospitality:pl3 infotech:pl1 ifm:pl2:G manufacturing:pl2 pharma:pl1 retail:pl3 transport:pl2 datacenters:pl2:G ' +
    'education:pl1 fsm:pl2 property:pl3 other:-:U unapplied:-:U';

  function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function mcOf(r, ind) { return r.marketCoverage.filter(function (m) { return m.industryId === ind; })[0]; }

  T.suite('sample data', function () {
    T.test('X-data-names-vetted', 'Account and partner names come only from the vetted stems, with 30% spare stems', function (a) {
      var V = X.vettedNames;
      var flagged = ['Draxwell', 'Embervale', 'Nimbrook', 'Kestrelwick', 'Hollowmere', 'Xanthorpe', 'Zelmora', 'Bonkersby', 'Hiccupvale'];
      var used = [];
      P.regions.forEach(function (r) {
        r.customerGrowth.accounts.concat(r.partners).forEach(function (x) {
          var stem = x.name.split(' ')[0];
          used.push(stem);
          a.ok(V.stems.indexOf(stem) !== -1, 'vetted stem: ' + x.name);
          a.ok(V.kinds.indexOf(x.name.slice(stem.length + 1)) !== -1, 'known kind of business: ' + x.name);
          a.ok(flagged.indexOf(stem) === -1, 'not a flagged name: ' + x.name);
        });
      });
      a.ok(V.stems.length >= used.length * 1.3, V.stems.length + ' stems for ' + used.length + ' names');
      flagged.forEach(function (f) { a.equal(V.stems.indexOf(f), -1, f + ' is not in the vetted list'); });
    });

    T.test('X-data-generated-pair', 'The sample file and its expected figures come from the same generator run', function (a) {
      a.ok(X && X.regions && X.totals, 'SAMPLE_EXPECT has regions and totals');
      a.deepEqual(P.regions.map(function (r) { return r.id; }), X.regions, 'same regions in the same order');
      P.regions.forEach(function (r) {
        var arr = sum(r.marketCoverage.map(function (m) { return m.currentArr || 0; }));
        a.equal(X.totals[r.id]['base.arr'], arr, r.id + ' current ARR total');
      });
    });

    T.test('TPV-TC-193', 'The sample data file passes the contract check with no errors', function (a) {
      var res = TAP.check.run(copy(P));
      a.deepEqual(res.errors.map(function (e) { return e.message; }), []);
      a.equal(TAP.data.load(copy(P)).ok, true, 'it loads');
    });

    T.test('TPV-TC-194', 'Seven regions in order, isSample true, the template industries and all four sections filled', function (a) {
      a.equal(P.meta.isSample, true, 'isSample');
      a.deepEqual(P.regions.map(function (r) { return [r.id, r.name]; }), REGIONS, 'regions and names in file order');
      var want = INDUSTRIES.split(' ').map(function (s) { var p = s.split(':'); return [p[0], p[1] === '-' ? null : p[1], p[2] === 'G', p[2] !== 'U']; });
      a.deepEqual(P.lookups.industries.map(function (d) { return [d.id, d.productLine, d.groupPriority, d.rated]; }), want, 'industries');
      a.deepEqual(P.lookups.productLines.map(function (d) { return d.name; }), ['Product line 1', 'Product line 2', 'Product line 3']);
      a.deepEqual(P.lookups.channels.map(function (d) { return d.name; }), ['Direct', 'Partner', 'Alliance A', 'Alliance B']);
      P.regions.forEach(function (r) {
        var id = r.id;
        a.equal(r.source.fileName, r.name + ' plan.xlsx', id + ' file name');
        a.deepEqual(r.marketCoverage.map(function (m) { return m.industryId; }), want.map(function (w) { return w[0]; }), id + ' every industry once');
        a.ok(r.newBusiness.length >= 10 && r.newBusiness.length <= 25, id + ' 10 to 25 New Business rows: ' + r.newBusiness.length);
        a.ok(r.partners.length >= 3 && r.partners.length <= 6, id + ' a handful of partners: ' + r.partners.length);
        a.ok(r.recap.length > 0, id + ' recap filled');
        var n = r.customerGrowth.accounts.length;
        if (id === 'ceu') a.equal(n, 0, 'ceu: the planted empty Customer Growth section (G2)');
        else a.ok(n >= 20 && n <= 30, id + ' 20 to 30 accounts: ' + n);
      });
    });

    T.test('X-data-plausible', 'Each region has current ARR in the low tens of millions (values in thousands)', function (a) {
      P.regions.forEach(function (r) {
        var arr = sum(r.marketCoverage.map(function (m) { return m.currentArr || 0; }));
        a.ok(arr >= 5000 && arr <= 50000, r.id + ': ' + arr);
      });
    });

    T.test('X-data-names', 'Account and partner names are unique, and source files have plausible names', function (a) {
      var names = [];
      P.regions.forEach(function (r) {
        r.customerGrowth.accounts.forEach(function (x) { names.push(x.name); });
        r.partners.forEach(function (x) { names.push(x.name); });
      });
      var seen = {};
      // Q04 plants one partner named by two regions (shared targets, US-2.5.3); account names stay unique
      var shared = [];
      (X.q04 ? X.q04.shared : []).forEach(function (e) { shared = shared.concat(e.names); });
      P.regions.forEach(function (r) { r.partners.forEach(function (x) { if (shared.indexOf(x.name) >= 0) names.splice(names.indexOf(x.name), 1); }); });
      a.equal(shared.length, 1, 'one planted shared partner name');
      names.forEach(function (n) { a.ok(!seen[n], 'used once: ' + n); seen[n] = true; });
      a.ok(names.length > 100, 'plenty of names: ' + names.length);
    });

    T.test('TPV-TC-195', 'New Business: derived values match their formulas, splits sum to 100%, tiers match Market Coverage', function (a) {
      P.regions.forEach(function (r) {
        r.newBusiness.forEach(function (row) {
          var at = r.id + ' row ' + row.sourceRow;
          a.near(sum(CH.map(function (c) { return row.channelSplit[c]; })), 1, 1e-9, at + ' split');
          var mc = mcOf(r, row.industryId);
          a.equal(row.tier, mc.tier, at + ' tier matches Market Coverage');
          a.ok(row.tier === 1 || row.tier === 2, at + ' tier is never 3');
          if (!num(row.hitRate)) {
            a.deepEqual(row.arrPotential.concat(row.servicesPotential), [null, null, null, null, null, null], at + ' blank inputs give blanks');
            return;
          }
          var y = row.arrPotential;
          a.near(y[0], row.targetAccounts * row.hitRate * row.avgDealSize, ROUND, at + ' year 1');
          a.near(y[1], y[0] * (1 + row.growth.year2), ROUND, at + ' year 2');
          a.near(y[2], y[1] * (1 + row.growth.year3), ROUND, at + ' year 3');
          [0, 1, 2].forEach(function (i) { a.near(row.servicesPotential[i], y[i] * row.servicesRatio, ROUND, at + ' services ' + i); });
        });
        r.marketCoverage.filter(function (m) { return m.tier === 3 || m.tier === null; }).forEach(function (m) {
          a.ok(!r.newBusiness.some(function (row) { return row.industryId === m.industryId; }), r.id + ' no New Business rows for ' + m.industryId);
        });
      });
    });

    T.test('TPV-TC-195', 'Customer Growth: incremental ARR, services, cumulative order intake and segments follow the rules', function (a) {
      P.regions.forEach(function (r) {
        var t = r.customerGrowth.thresholds;
        r.customerGrowth.accounts.forEach(function (x) {
          var at = r.id + ' ' + x.id;
          var want;
          if (x.growthPct) {
            var base = x.currentArr;
            want = x.growthPct.map(function (g) { var inc = base * g; base += inc; return inc; });
            a.equal(x.multiplier3y, null, at + ' one method only');
          } else {
            var each = x.currentArr * (x.multiplier3y - 1) / 3;
            want = [each, each, each];
          }
          [0, 1, 2].forEach(function (i) {
            a.near(x.incrementalArr[i], want[i], ROUND, at + ' incremental ' + i);
            a.near(x.servicesOrderIntake[i], x.incrementalArr[i] * x.servicesRatio, ROUND, at + ' services ' + i);
          });
          a.near(x.cumulativeOrderIntake, sum(x.incrementalArr) + sum(x.servicesOrderIntake), ROUND, at + ' cumulative');
          var seg = x.currentArr > t.strategicArr ? 'strategic' : x.currentArr < t.scaledArr ? 'scaled' :
            x.cumulativeOrderIntake > t.growthOrderIntake && x.currentArr > t.growthArr ? 'growth' : 'core';
          a.equal(x.segment, seg, at + ' segment');
        });
      });
    });

    T.test('TPV-TC-195', 'Totals reconcile: the recap matches New Business and Customer Growth, partners match their channel', function (a) {
      P.regions.forEach(function (r) {
        P.meta.years.forEach(function (year, y) {
          var cell = function (motion, type, ch) {
            return r.recap.filter(function (c) { return c.year === year && c.motion === motion && c.type === type && c.channel === ch; })[0];
          };
          CH.forEach(function (ch) {
            ['arr', 'services'].forEach(function (type) {
              var key = type === 'arr' ? 'arrPotential' : 'servicesPotential';
              var nb = sum(r.newBusiness.filter(function (row) { return num(row[key][y]); }).map(function (row) { return row[key][y] * row.channelSplit[ch]; }));
              a.near(cell('newBusiness', type, ch).value, nb, ROUND, r.id + ' ' + year + ' NB ' + type + ' ' + ch);
              var partners = r.partners.filter(function (p) { return p.channel === ch; });
              if (ch !== 'direct' && partners.length) {
                a.near(sum(partners.map(function (p) { return p[type === 'arr' ? 'arr' : 'services'][y]; })), cell('newBusiness', type, ch).value,
                  0.06 * partners.length, r.id + ' ' + year + ' partners ' + type + ' ' + ch);
              }
            });
          });
          var acc = r.customerGrowth.accounts;
          if (!acc.length) return;
          a.near(cell('customerGrowth', 'arr', 'direct').value, sum(acc.map(function (x) { return x.incrementalArr[y]; })), ROUND, r.id + ' ' + year + ' CG ARR');
          a.near(cell('customerGrowth', 'services', 'direct').value, sum(acc.map(function (x) { return x.servicesOrderIntake[y]; })), ROUND, r.id + ' ' + year + ' CG services');
        });
      });
    });

    T.test('TPV-TC-196', 'Every list item has sourceRow, recap items have sourceCell, and the sourceMap covers every field', function (a) {
      P.regions.forEach(function (r) {
        ['marketCoverage', 'newBusiness', 'partners'].forEach(function (s) {
          r[s].forEach(function (x, i) { a.ok(num(x.sourceRow) && x.sourceRow % 1 === 0, r.id + ' ' + s + '[' + i + '] sourceRow'); });
        });
        r.customerGrowth.accounts.forEach(function (x, i) { a.ok(num(x.sourceRow), r.id + ' accounts[' + i + '] sourceRow'); });
        r.recap.forEach(function (x, i) { a.match(x.sourceCell, /^[A-Z]+\d+$/, r.id + ' recap[' + i + '] sourceCell'); });
      });
      var map = P.meta.sourceMap;
      // Phase 4 only adds to the map (US-4.1.1): without its additions, the sample's map is still the mini fixture's
      var base = JSON.parse(JSON.stringify(map));
      ['revenue', 'booksValue', 'strategicPlan', 'routes', 'baseYear'].forEach(function (k) { delete base[k]; });
      delete base.newBusiness.columns.solution;
      ['type', 'supportPct', 'distribution', 'servicesFromPartners'].forEach(function (k) { delete base.partners.columns[k]; });
      delete base.partners.cells;
      a.deepEqual(base, window.TEST_FIXTURES.mini.meta.sourceMap, 'same shape and columns as the mini fixture');
      var fields = {
        marketCoverage: ['industryId', 'currentArr', 'pipelineTotal', 'pipelineCreated12m', 'tier', 'commentary'].concat(RATINGS),
        newBusiness: ['industryId', 'market', 'subVertical', 'targetAccounts', 'hitRate', 'avgDealSize', 'successFactors', 'arrPotential',
          'servicesPotential', 'servicesRatio', 'growth.year2', 'growth.year3'].concat(CH.map(function (c) { return 'channelSplit.' + c; })),
        customerGrowth: ['name', 'industryId', 'country', 'productLine', 'currentArr', 'riskLevel', 'growthPct', 'multiplier3y',
          'servicesRatio', 'incrementalArr', 'servicesOrderIntake', 'cumulativeOrderIntake', 'segment'],
        partners: ['name', 'channel', 'maturity', 'expertiseGeo', 'expertiseProduct', 'fteSales', 'fteConsultants', 'centralSupportPct', 'arr', 'services']
      };
      Object.keys(fields).forEach(function (s) {
        a.ok(map[s] && typeof map[s].sheet === 'string', s + ' has a sheet');
        fields[s].forEach(function (f) { a.ok(map[s].columns[f], s + '.' + f + ' has a column'); });
      });
      ['strategicArr', 'scaledArr', 'growthArr', 'growthOrderIntake'].forEach(function (k) {
        a.ok(map.customerGrowth.cells['thresholds.' + k], 'thresholds.' + k + ' has a cell');
      });
      a.equal(typeof map.recap.sheet, 'string', 'recap sheet');
    });
  });

  // ---- planted cases (docs/PLANTED-CASES.md), recomputed from the raw rows ----

  var ids = function () { return P.regions.map(function (r) { return r.id; }); };
  var reg = function (id) { return P.regions.filter(function (r) { return r.id === id; })[0]; };
  var mc = function (id, ind) { return mcOf(reg(id), ind); };
  var score = function (id, ind) {
    var row = mc(id, ind);
    var v = RATINGS.map(function (f) { return row[f]; });
    return { a: (v[0] + v[1] + v[2]) / 3, b: (v[3] + v[4] + v[5]) / 3 };
  };
  var ratedRows = function (id) { return reg(id).newBusiness.filter(function (x) { return num(x.hitRate); }); };
  var wins = function (id) { return sum(ratedRows(id).map(function (x) { return x.targetAccounts * x.hitRate; })); };
  var hitRate = function (list) { return sum(list.map(wins)) / sum(list.map(function (id) { return sum(ratedRows(id).map(function (x) { return x.targetAccounts; })); })); };
  var dealSize = function (list) {
    return sum(list.map(function (id) { return sum(ratedRows(id).map(function (x) { return x.targetAccounts * x.hitRate * x.avgDealSize; })); })) / sum(list.map(wins));
  };
  var others = function (id) { return ids().filter(function (x) { return x !== id; }); };
  var growth = function (acc) { return sum(acc.incrementalArr); };
  var share = function (id, pred) {
    var acc = reg(id).customerGrowth.accounts;
    return sum(acc.filter(pred).map(growth)) / sum(acc.map(growth));
  };
  var tiersOf = function (ind) { return ids().map(function (id) { return mc(id, ind).tier; }); };

  T.suite('planted cases', function () {
    T.test('TPV-TC-199', 'The sample has blanks, one region with an empty section and at least two import notes', function (a) {
      a.equal(mc('neu', 'finance').criticality, null, 'G1: Northern Europe Financial Services criticality is blank');
      a.equal(mc('neu', 'property').productFit, null, 'G1: Northern Europe Property Management product fit is blank');
      a.equal(mc('mea', 'government').tier, null, 'G1: Middle East & Africa Government tier is blank');
      var blankRows = reg('seu').newBusiness.filter(function (x) { return x.hitRate === null; });
      a.equal(blankRows.length, 1, 'G1: one Southern Europe New Business row with a blank hit rate');
      a.deepEqual(blankRows[0].arrPotential.concat(blankRows[0].servicesPotential), [null, null, null, null, null, null], 'its potential is blank too');
      var cg = reg('ceu').customerGrowth;
      a.equal(cg.accounts.length, 0, 'G2: Central Europe has no accounts');
      a.deepEqual(cg.thresholds, { strategicArr: null, scaledArr: null, growthArr: null, growthOrderIntake: null }, 'G2: thresholds blank');
      var notes = [];
      P.regions.forEach(function (r) { r.source.notes.forEach(function (n) { notes.push([r.id, n.sheet, n.cell]); }); });
      a.ok(notes.length >= 2, 'G3: at least two import notes');
      a.deepEqual(notes, [['neu', '1. Market Coverage', 'E14'], ['ceu', '3. Customer Growth', 'A10']], 'G3: the planted notes');
      a.equal(mc('neu', 'finance').sourceRow, 14, 'the E14 note points at the blank criticality (column E)');
    });

    T.test('X-data-planted-P01', 'P01: Education is Tier 2 in A to F and Tier 3 in G', function (a) {
      a.deepEqual(tiersOf('education'), [2, 2, 2, 2, 2, 2, 3]);
    });
    T.test('X-data-planted-P02', 'P02: Retail is Tier 2 in A, B, C and Tier 3 in D, E, F, G', function (a) {
      a.deepEqual(tiersOf('retail'), [2, 2, 2, 3, 3, 3, 3]);
    });
    T.test('X-data-planted-P03', 'P03: Data Centers (Tier 1) has low ability and attractiveness below 2.0 in B, C, E, G; able in A, D, F', function (a) {
      a.deepEqual(tiersOf('datacenters'), [1, 1, 1, 1, 1, 1, 1], 'Tier 1 everywhere');
      ['latam', 'neu', 'ceu', 'apac'].forEach(function (id) {
        var m = mc(id, 'datacenters');
        a.deepEqual([m.references, m.expertise, m.productFit], [1, 1, 2], id + ' ability ratings');
        a.ok(score(id, 'datacenters').a < 2, id + ' attractiveness below 2.0');
      });
      ['na', 'seu', 'mea'].forEach(function (id) { a.ok(score(id, 'datacenters').b >= 2, id + ' ability 2.0 or more'); });
    });
    T.test('X-data-planted-P04', 'P04: Northern Europe rates Pharma references 3, with no ARR or pipeline', function (a) {
      var m = mc('neu', 'pharma');
      a.deepEqual([m.references, m.currentArr, m.pipelineTotal, m.pipelineCreated12m], [3, 0, 0, 0]);
    });
    T.test('X-data-planted-P05', 'P05: Central Europe rates Manufacturing expertise 1, its largest current ARR (2,400)', function (a) {
      var m = mc('ceu', 'manufacturing');
      a.equal(m.expertise, 1);
      a.equal(m.currentArr, 2400);
      reg('ceu').marketCoverage.forEach(function (x) { if (x !== m) a.ok(x.currentArr < 2400, x.industryId + ' below 2,400'); });
    });
    T.test('X-data-planted-P06', 'P06: Southern Europe Retail is Tier 3 with 18% of the region’s pipeline', function (a) {
      var m = mc('seu', 'retail');
      a.equal(m.tier, 3);
      a.near(m.pipelineTotal / sum(reg('seu').marketCoverage.map(function (x) { return x.pipelineTotal || 0; })), 0.18, 0.0005);
    });
    T.test('X-data-planted-P07', 'P07: Middle East & Africa Hospitality is Tier 2 with no pipeline', function (a) {
      var m = mc('mea', 'hospitality');
      a.deepEqual([m.tier, m.pipelineTotal, m.pipelineCreated12m], [2, 0, 0]);
    });
    T.test('X-data-planted-P08', 'P08: Central Europe’s weighted hit rate is 35%; the others are 12% to 18%, averaging 15% ± 0.5', function (a) {
      a.near(hitRate(['ceu']), 0.35, 1e-9, 'Central Europe');
      others('ceu').forEach(function (id) { var h = hitRate([id]); a.ok(h >= 0.12 && h <= 0.18, id + ': ' + h); });
      a.near(hitRate(others('ceu')), 0.15, 0.005, 'weighted average of the others');
    });
    T.test('X-data-planted-P09', 'P09: Latin America’s deal size is 1.6× the others’ and above every other region', function (a) {
      var b = dealSize(['latam']);
      a.near(b / dealSize(others('latam')), 1.6, 0.02, 'ratio');
      others('latam').forEach(function (id) { a.ok(dealSize([id]) < b, id + ' below Latin America'); });
      a.ok(b / dealSize(others('latam')) < 2, 'under 2×');
    });
    T.test('X-data-planted-P10', 'P10: Latin America’s year-1 new business ARR is 4× its pipeline created in 12 months', function (a) {
      var r = reg('latam');
      var y1 = sum(r.newBusiness.map(function (x) { return x.arrPotential[0] || 0; }));
      a.near(y1 / sum(r.marketCoverage.map(function (x) { return x.pipelineCreated12m || 0; })), 4, 0.01);
    });
    T.test('X-data-planted-P11', 'P11: Asia Pacific has Transportation New Business rows (Tier 2) with no pipeline', function (a) {
      a.ok(reg('apac').newBusiness.some(function (x) { return x.industryId === 'transport' && x.tier === 2; }), 'New Business rows');
      a.equal(mc('apac', 'transport').pipelineTotal, 0);
    });
    T.test('X-data-planted-P12', 'P12: North America’s implied wins are 3× the simple average of the others', function (a) {
      a.near(wins('na') / (sum(others('na').map(wins)) / 6), 3, 0.05);
    });
    T.test('X-data-planted-P13', 'P13: 60% of North America’s customer growth sits in its top 3 accounts, one flagged high risk', function (a) {
      var top = reg('na').customerGrowth.accounts.slice().sort(function (x, y) { return growth(y) - growth(x); }).slice(0, 3);
      a.near(share('na', function (x) { return top.indexOf(x) !== -1; }), 0.6, 0.005, 'top-3 share');
      a.equal(top.filter(function (x) { return x.riskLevel === 'high'; }).length, 1, 'one of them high risk');
    });
    T.test('X-data-planted-P14', 'P14: 40% of Middle East & Africa’s customer growth is in accounts flagged at risk', function (a) {
      a.near(share('mea', function (x) { return x.riskLevel === 'high' || x.riskLevel === 'medium'; }), 0.4, 0.005);
    });
    T.test('X-data-planted-P15', 'P15: Asia Pacific’s growth is 80% Strategic; the others with customer growth are 30% to 50%', function (a) {
      var strat = function (id) { return function (x) { return x.segment === 'strategic'; }; };
      a.near(share('apac', strat('apac')), 0.8, 0.005, 'Asia Pacific');
      others('apac').filter(function (id) { return id !== 'ceu'; }).forEach(function (id) {
        var s = share(id, strat(id));
        a.ok(s >= 0.3 && s <= 0.5, id + ': ' + s);
      });
    });
    T.test('X-data-planted-P16', 'P16: Field Service Management is attractive but not yet winnable in A, D, F and G only', function (a) {
      ids().forEach(function (id) {
        var s = score(id, 'fsm');
        if (['na', 'seu', 'mea', 'apac'].indexOf(id) !== -1) {
          a.ok(s.a >= 2.33 - 1e-9 && s.b <= 1.67, id + ' attractive, low ability: ' + JSON.stringify(s));
        } else {
          a.ok(s.b >= 2, id + ' able: ' + JSON.stringify(s));
        }
      });
      var factors = function (id) { return reg(id).newBusiness.filter(function (x) { return x.industryId === 'fsm'; }).map(function (x) { return x.successFactors; }); };
      a.ok(factors('na').length && factors('na').every(function (f) { return f === 'Field service references'; }), 'North America success factors');
      a.ok(factors('mea').length && factors('mea').every(function (f) { return f === 'Mobile workforce integration partner'; }), 'Middle East & Africa success factors');
      ['latam', 'neu', 'ceu', 'apac'].forEach(function (id) { a.ok(score(id, 'datacenters').a < 2, 'P03 kept out of the lists: ' + id); });
    });

    T.test('X-data-planted-G4', 'G4 to G6: zero and blank stay distinct, unrated rows have no ratings or tier, Asia Pacific imported a day earlier', function (a) {
      a.equal(mc('na', 'culture').currentArr, 0, 'North America Culture current ARR is 0');
      a.equal(mc('neu', 'culture').currentArr, null, 'Northern Europe Culture current ARR is blank');
      P.regions.forEach(function (r) {
        ['other', 'unapplied'].forEach(function (ind) {
          var m = mc(r.id, ind);
          a.deepEqual(RATINGS.map(function (f) { return m[f]; }).concat([m.tier]), [null, null, null, null, null, null, null], r.id + ' ' + ind);
        });
      });
      var day = function (id) { return reg(id).source.importedAt.slice(0, 10); };
      others('apac').forEach(function (id) { a.ok(day('apac') < day(id), 'Asia Pacific before ' + id); });
      a.equal(new Set(others('apac').map(day)).size, 1, 'the others share one import day');
    });

    T.test('X-data-expect-complete', 'SAMPLE_EXPECT holds every planted figure, the attractive-but-not-yet lists and the headline', function (a) {
      ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'gaps', 'headline', 'sources']
        .forEach(function (k) { a.ok(X[k], k); });
      a.deepEqual(Object.keys(X.attractiveNotYet), ids(), 'a list for every region');
      a.deepEqual(X.p16.regions, ['na', 'seu', 'mea', 'apac']);
      ['na', 'seu', 'mea', 'apac'].forEach(function (id) { a.ok(X.attractiveNotYet[id].indexOf('fsm') !== -1, 'fsm listed for ' + id); });
      ids().forEach(function (id) { a.equal(X.attractiveNotYet[id].indexOf('datacenters'), -1, 'datacenters not listed for ' + id); });
    });

    T.test('TPV-TC-020', 'Sample file: each planted check figure gives its expected file › sheet › cell', function (a) {
      TAP.data.load(copy(P));
      a.ok(X.sources.length >= 5, 'check figures listed');
      X.sources.forEach(function (c) {
        var ad = TAP.sources.address(c.src);
        a.equal(ad.text, c.text, c.src.regionId + ' ' + c.src.field);
        a.equal(ad.calculated, c.calculated, 'calculated: ' + c.src.field);
      });
    });
  });
})(window.TAP);
