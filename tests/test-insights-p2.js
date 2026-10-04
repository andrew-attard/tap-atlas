/*
 * File: tests/test-insights-p2.js
 * Purpose: Tests for the Phase 2 planted cases in the sample data, the Phase 2 insight rules and recurring themes.
 * Provides: test cases for the INSIGHTS2 stream: TPV-TC-304, 307, 308 (US-2.7.4, sample data), X-insights2-*
 * Depends on: tests/harness.js, tests/test-setup.js, tests/test-insights.js (T_INSIGHTS), the app scripts,
 *             data/sample-plan-data.js (window.PLAN_DATA), tests/fixtures/sample-expected.js (window.SAMPLE_EXPECT)
 * Used by: tests.html
 * Owner: INSIGHTS2 stream
 *
 * Planted figures come from docs/PLANTED-CASES.md (Q01 to Q06) and SAMPLE_EXPECT, or are worked out here from the
 * raw rows; never from the rules' own output. Tests that need a part another stream is still building are skipped,
 * naming that part, until it lands.
 */
(function (TAP) {
  'use strict';

  var P = window.PLAN_DATA, X = window.SAMPLE_EXPECT;
  var CH = ['direct', 'partner', 'allianceA', 'allianceB'];

  function sum(list) { return list.reduce(function (s, v) { return s + v; }, 0); }
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function reg(id) { return P.regions.filter(function (r) { return r.id === id; })[0]; }
  function stubbed(what) { return TAP.stub.list().some(function (s) { return s.what === what; }); }
  // A test that needs parts still being built is listed as skipped, naming what it waits for.
  function when(deps, id, title, fn) {
    var waiting = deps.filter(stubbed);
    if (waiting.length) T.skip(id, title, 'waits for ' + waiting.join(', '));
    else T.test(id, title, fn);
  }
  function recapShare(r, ch) {
    var all = sum(r.recap.map(function (x) { return x.value; }));
    return sum(r.recap.filter(function (x) { return x.channel === ch; }).map(function (x) { return x.value; })) / all;
  }
  function nbArr(r) { return sum(r.newBusiness.filter(function (x) { return x.arrPotential.every(num); }).map(function (x) { return sum(x.arrPotential); })); }
  function cgArr(r) { return sum(r.customerGrowth.accounts.map(function (a) { return sum(a.incrementalArr); })); }
  function key(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }
  function I() { return window.T_INSIGHTS; }
  function cfg(id) { return window.TAP_RULES.rules.filter(function (r) { return r.id === id; })[0]; }
  function pct(v) { return TAP.format.pct(v); }
  function banned(s) { return window.TAP_RULES.wording.banned.filter(function (w) { return new RegExp('\\b' + w + '\\b', 'i').test(s); }); }
  // The mini fixture, reshaped by make(plan), then loaded.
  function mini(make) {
    var p = T_FIXTURE('mini');
    make(p);
    TAP.data.load(p);
    TAP.insights.reset();
    return p;
  }
  function rg(p, id) { return p.regions.filter(function (r) { return r.id === id; })[0]; }
  // A recap of one year's new business ARR, with the given amount per channel (direct, partner, Alliance A, B).
  function recap(p, r, vals) {
    r.recap = CH.map(function (c, i) {
      return { year: p.meta.years[0], sourceCell: String.fromCharCode(69 + i) + 5, channel: c, motion: 'newBusiness', type: 'arr', value: vals[i] };
    });
  }
  // Three-year ARR ambition of exactly nb from new business and cg from customer growth (cg null: an empty section).
  function makeup(p, r, nb, cg) {
    var row = JSON.parse(JSON.stringify(rg(p, 'alpha').newBusiness[0]));
    var acc = JSON.parse(JSON.stringify(rg(p, 'alpha').customerGrowth.accounts[0]));
    row.arrPotential = [nb, 0, 0];
    row.servicesPotential = [0, 0, 0];
    acc.id = r.id + '-x';
    acc.incrementalArr = [cg, 0, 0];
    acc.servicesOrderIntake = [0, 0, 0];
    r.newBusiness = [row];
    r.customerGrowth.accounts = cg == null ? [] : [acc];
  }
  var PLAN = ['Phase 2 measures (js/engine/measures-p2.js)', 'insight rules: plan'];

  T.suite('insights-p2', function () {
    /* ---------- US-2.7.4: the Phase 2 planted cases (docs/PLANTED-CASES.md) ---------- */

    T.test('TPV-TC-304', 'Q01 and Q02: the channel and plan make-up cases are in the sample data as listed', function (a) {
      // Every row with figures; G1's row with a blank hit rate has no potential, so no channel
      reg('seu').newBusiness.filter(function (row) { return num(row.hitRate); }).forEach(function (row) {
        a.deepEqual(CH.map(function (c) { return row.channelSplit[c]; }), [0.2, 0.65, 0.1, 0.05], 'Southern Europe row ' + row.sourceRow + ' split');
      });
      var seu = recapShare(reg('seu'), 'partner');
      a.near(seu, X.q01.share, 1e-6, 'partner share from the recap rows');
      a.near(seu, 0.4, 0.005, 'about 40% through partners');
      var rest = P.regions.filter(function (r) { return r.id !== 'seu'; });
      var others = sum(rest.map(function (r) { return recapShare(r, 'partner') * sum(r.recap.map(function (x) { return x.value; })); })) /
        sum(rest.map(function (r) { return sum(r.recap.map(function (x) { return x.value; })); }));
      a.near(others, X.q01.others, 1e-6, 'the others combined');
      a.ok(seu - others >= 0.2, 'gap of at least 20 points');
      a.deepEqual(X.q01.flagged, [{ region: 'seu', channel: 'partner' }], 'no other region is 20 points from the others on any channel');
      var apac = reg('apac'), share = nbArr(apac) / (nbArr(apac) + cgArr(apac));
      a.near(share, X.q02.share, 1e-6, 'Asia Pacific new business share of ARR ambition');
      a.near(share, 0.36, 0.005, 'about 36%');
      a.ok(X.q02.others - share >= 0.2, 'at least 20 points below the others (' + X.q02.others + ')');
      a.equal(X.q02.shares.ceu, null, 'Central Europe (no customer growth) is not counted');
      a.deepEqual(X.q02.flagged, ['apac'], 'no other region is 20 points from the others');
    });

    T.test('TPV-TC-304', 'Q03 and Q04: one sub-industry and one partner are named by two regions', function (a) {
      var names = function (id) { return reg(id).newBusiness.map(function (x) { return x.subVertical; }); };
      a.ok(names('na').indexOf('Acute care hospitals') >= 0, 'North America');
      a.ok(names('apac').indexOf('Acute care Hospitals') >= 0, 'Asia Pacific, with a capital H');
      var by = {};
      P.regions.forEach(function (r) {
        r.newBusiness.forEach(function (x) { var k = key(x.subVertical); by[k] = by[k] || []; if (by[k].indexOf(r.id) < 0) by[k].push(r.id); });
      });
      a.deepEqual(Object.keys(by).filter(function (k) { return by[k].length > 1; }), ['acute care hospitals'], 'the only shared sub-industry');
      var pt = {};
      P.regions.forEach(function (r) { r.partners.forEach(function (p) { pt[key(p.name)] = (pt[key(p.name)] || []).concat([r.id]); }); });
      a.deepEqual(Object.keys(pt).filter(function (k) { return pt[k].length > 1; }), ['donvocombe systems'], 'the only shared partner');
      a.deepEqual(pt['donvocombe systems'], ['na', 'latam']);
    });

    T.test('TPV-TC-304', 'Q05 and Q06: one partner well above the average per FTE, and a theme in two regions', function (a) {
      var list = [];
      P.regions.forEach(function (r) {
        r.partners.forEach(function (p) {
          var fte = sum([p.fteSales, p.fteConsultants].filter(num));
          if (fte > 0) list.push({ r: r.id, p: p, fte: fte, oi: sum(p.arr.concat(p.services).filter(num)) });
        });
      });
      a.ok(list.length >= 5, 'at least 5 partners with FTE');
      var avg = sum(list.map(function (x) { return x.oi; })) / sum(list.map(function (x) { return x.fte; }));
      a.near(avg, X.q05.average, 1e-6, 'average across partners: total order intake / total FTE');
      var high = list.filter(function (x) { return x.oi / x.fte >= 2 * avg; });
      a.equal(high.length, 1, 'one partner at 2x or more');
      a.equal(high[0].p.name, 'Horviby Solutions Partner');
      a.equal(high[0].r, 'mea');
      a.near(high[0].oi / high[0].fte / avg, X.q05.flagged[0].multiple, 1e-6, 'its multiple');
      a.near(high[0].oi / high[0].fte / avg, 3, 0.25, 'about 3x');
      var pricing = P.regions.filter(function (r) {
        return r.newBusiness.some(function (x) { return x.successFactors === 'Competitive pricing for multi-site deals'; });
      }).map(function (r) { return r.id; });
      a.deepEqual(pricing, ['latam', 'ceu'], 'the pricing theme in two regions');
    });

    when(['TAP.themes'], 'TPV-TC-307', 'The theme keyword rules find at least two themes in at least three regions each', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(P)));
      var found = TAP.themes.all().filter(function (t) { return t.regions.length >= 3; });
      a.ok(found.length >= 2, found.length + ' themes in three regions or more');
    });

    T.test('TPV-TC-308', 'The contract check passes on the Phase 1 mini fixture and on the Phase 2 sample data', function (a) {
      var mini = TAP.check.run(T_FIXTURE('mini')), sample = TAP.check.run(JSON.parse(JSON.stringify(P)));
      a.deepEqual(mini.errors, [], 'mini fixture: no errors');
      a.deepEqual(sample.errors, [], 'sample data: no errors');
      a.deepEqual(sample.warnings.map(function (w) { return w.path; }), ['regions[4].customerGrowth.accounts'],
        'sample data: only the planted empty section (G2) is a warning');
    });

    when(['Phase 2 measures (js/engine/measures-p2.js)'], 'X-insights2-planted-measures',
      'The planted Q01 and Q02 figures are what the Phase 2 measures give', function (a) {
        TAP.data.load(JSON.parse(JSON.stringify(P)));
        var rest = function (id, ids) { return { kind: 'combined', regionIds: ids.filter(function (r) { return r !== id; }), how: 'average' }; };
        var all = X.regions, both = all.filter(function (r) { return X.q02.shares[r] !== null; });
        a.near(TAP.measures.get('rc.share.partner')('seu', { year: null }).v, X.q01.share, 1e-6, 'rc.share.partner, Southern Europe');
        a.near(TAP.measures.combined('rc.share.partner', rest('seu', all), { year: null }).v, X.q01.others, 1e-6, 'the others');
        a.near(TAP.measures.get('amb.nbShare')('apac', { year: null }).v, X.q02.share, 1e-6, 'amb.nbShare, Asia Pacific');
        a.near(TAP.measures.combined('amb.nbShare', rest('apac', both), { year: null }).v, X.q02.others, 1e-6, 'the others');
      });

    /* ---------- US-2.5.2: channel reliance ---------- */

    when(PLAN, 'TPV-TC-471', 'The planted channel case gives one insight with both planted shares', function (a) {
      I().sample();
      var list = I().ofRule('channelReliance');
      a.equal(list.length, 1, 'one channel reliance insight on the sample (Q01)');
      a.deepEqual(list[0].regionIds, ['seu']);
      a.equal(list[0].id, 'channelReliance:seu:partner', 'Southern Europe, partners');
      a.near(list[0].figures[0].cell.v, X.q01.share, 1e-6, 'its share');
      a.near(list[0].figures[1].cell.v, X.q01.others, 1e-6, 'the others');
      a.ok(list[0].sentence.indexOf(pct(X.q01.share)) >= 0 && list[0].sentence.indexOf(pct(X.q01.others)) >= 0, list[0].sentence);
    });

    when(PLAN, 'TPV-TC-472', 'A gap just under the threshold is not flagged, one exactly at it is, and the threshold follows its setting', function (a) {
      var run = function (target) {
        mini(function (p) {
          p.regions.forEach(function (r) { recap(p, r, r.id === 'bravo' ? target : [80, 10, 10, 0]); });
        });
        return I().ofRule('channelReliance');
      };
      // Bravo 30 of 100 through partners against 30 of 300 elsewhere: 30% against 10%, a 20 point gap
      var at = run([65, 30, 5, 0]);
      a.equal(at.length, 1, 'exactly 20 points is flagged');
      a.equal(at[0].id, 'channelReliance:bravo:partner');
      a.equal(run([65.1, 29.9, 5, 0]).length, 0, '19.9 points is not');
      var rule = cfg('channelReliance'), was = rule.params.gap;
      try {
        rule.params.gap = 0.25;
        a.equal(run([65, 30, 5, 0]).length, 0, 'a 25 point threshold leaves 20 points out');
        rule.params.gap = 0.15;
        a.equal(run([65.1, 29.9, 5, 0]).length, 1, 'a 15 point threshold takes 19.9 points in');
      } finally { rule.params.gap = was; TAP.insights.reset(); }
    });

    when(PLAN, 'TPV-TC-473', 'With recaps from only 2 regions there is no channel reliance insight', function (a) {
      mini(function (p) {
        p.regions.forEach(function (r) { recap(p, r, r.id === 'bravo' ? [10, 90, 0, 0] : [90, 10, 0, 0]); });
        rg(p, 'charlie').recap = [];
        rg(p, 'delta').recap = [];
      });
      a.equal(I().ofRule('channelReliance').length, 0, 'not computed');
      a.ok(!TAP.insights.failures().some(function (f) { return f.ruleId === 'channelReliance'; }), 'and not a failure');
    });

    when(PLAN, 'TPV-TC-474', 'The channel reliance sentence follows the story’s pattern, with no banned word', function (a) {
      I().sample();
      var x = I().ofRule('channelReliance')[0];
      a.equal(x.sentence, 'Southern Europe plans ' + pct(X.q01.share) + ' of its order intake through partners, against ' +
        pct(X.q01.others) + ' on average elsewhere. Worth discussing.');
      a.deepEqual(banned(x.sentence), [], 'no banned word');
    });

    when(PLAN, 'TPV-TC-475', 'Channel reliance attaches to the partner reliance and channel reports and highlights the region’s bar', function (a) {
      I().sample();
      var rule = cfg('channelReliance'), x = I().ofRule('channelReliance')[0];
      a.deepEqual(rule.attach, ['pt-reliance', 'nb-channels']);
      a.equal(rule.highlight, 'bar');
      a.deepEqual(x.highlight.regionIds, ['seu'], 'the region’s bar');
      // While the views are being built, the insight attaches to the reports that exist
      var built = rule.attach.filter(function (id) { return !!TAP.reports.get(id); });
      a.deepEqual(x.attach, built, 'attached to ' + (built.join(', ') || 'no report yet'));
      if (built.length) a.equal(x.highlight.mark, 'bar');
      else a.equal(x.fallback, 'details', 'until a report is built, Show me opens the details');
    });

    /* ---------- US-2.5.5: plan make-up ---------- */

    when(PLAN, 'TPV-TC-486', 'The planted plan make-up case gives one insight with both planted shares', function (a) {
      I().sample();
      var list = I().ofRule('planMakeup');
      a.equal(list.length, 1, 'one plan make-up insight on the sample (Q02)');
      a.deepEqual(list[0].regionIds, ['apac']);
      a.near(list[0].figures[0].cell.v, X.q02.share, 1e-6, 'its new business share');
      a.near(list[0].figures[1].cell.v, X.q02.others, 1e-6, 'the others, without Central Europe');
    });

    when(PLAN, 'TPV-TC-487', 'A gap just under the threshold is not flagged; one exactly at it is', function (a) {
      var run = function (nb, cg) {
        mini(function (p) { p.regions.forEach(function (r) { if (r.id === 'alpha') makeup(p, r, nb, cg); else makeup(p, r, 50, 50); }); });
        return I().ofRule('planMakeup');
      };
      var at = run(70, 30);   // 70% against 150 of 300 = 50% elsewhere
      a.equal(at.length, 1, 'exactly 20 points is flagged');
      a.deepEqual(at[0].regionIds, ['alpha']);
      a.equal(run(69.9, 30.1).length, 0, '19.9 points is not');
    });

    when(PLAN, 'TPV-TC-488', 'Fewer than 3 regions with both parts gives nothing, and an empty section is not counted', function (a) {
      mini(function (p) {
        makeup(p, rg(p, 'alpha'), 90, 10);
        makeup(p, rg(p, 'bravo'), 50, 50);
        makeup(p, rg(p, 'charlie'), 50, null);
        makeup(p, rg(p, 'delta'), 40, null);
      });
      a.equal(I().ofRule('planMakeup').length, 0, 'two regions with both parts: not computed');
      mini(function (p) {
        makeup(p, rg(p, 'alpha'), 90, 10);
        makeup(p, rg(p, 'bravo'), 50, 50);
        makeup(p, rg(p, 'charlie'), 50, null);
        makeup(p, rg(p, 'delta'), 30, 70);
      });
      var x = I().ofRule('planMakeup').filter(function (i) { return i.regionIds[0] === 'alpha'; })[0];
      a.ok(x, 'three regions with both parts: compared');
      a.near(x.figures[1].cell.v, 0.4, 1e-9, 'the others are bravo and delta only: 80 of 200');
      a.ok(I().ofRule('planMakeup').every(function (i) { return i.regionIds[0] !== 'charlie'; }), 'charlie is never named');
    });

    when(PLAN, 'TPV-TC-489', 'The plan make-up sentence follows the story’s pattern, with no banned word', function (a) {
      I().sample();
      var x = I().ofRule('planMakeup')[0];
      a.equal(x.sentence, pct(X.q02.share) + ' of Asia Pacific’s ARR ambition comes from new business, against ' +
        pct(X.q02.others) + ' on average elsewhere.');
      a.deepEqual(banned(x.sentence), [], 'no banned word');
    });

    when(PLAN, 'TPV-TC-490', 'Plan make-up attaches to the ambition report and highlights the region’s bar', function (a) {
      I().sample();
      var x = I().ofRule('planMakeup')[0];
      a.deepEqual(cfg('planMakeup').attach, ['ov-ambition']);
      a.deepEqual(x.attach, ['ov-ambition']);
      a.equal(x.reportId, 'ov-ambition');
      a.equal(x.highlight.mark, 'bar');
      a.deepEqual(x.highlight.regionIds, ['apac']);
    });
  });
})(window.TAP);
