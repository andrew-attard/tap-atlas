/*
 * File: tests/test-data.js
 * Purpose: Tests for the sample data file: shape, consistency and planted gaps (TPV-TC-193 to 199).
 * Provides: test cases for DATA stories (#25, #26, #27): TPV-TC-193, 194, 195, 196, X-data-*
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
      a.deepEqual(map, window.TEST_FIXTURES.mini.meta.sourceMap, 'same shape and columns as the mini fixture');
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
})(window.TAP);
