/*
 * File: tests/test-insights-p2.js
 * Purpose: Tests for the Phase 2 planted cases in the sample data, the Phase 2 insight rules and recurring themes.
 * Provides: test cases for the INSIGHTS2 stream: TPV-TC-304, 307, 308 (US-2.7.4, sample data), 463 to 470 (US-2.5.1),
 *           471 to 475 (US-2.5.2), 477 to 479 (US-2.5.3), 481 to 484 (US-2.5.4), 486 to 490 (US-2.5.5), 492, 493, 495
 *           (US-2.5.6), X-insights2-*
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
  // A recap of new business ARR with the given amount per channel (direct, partner, Alliance A, B) in year 1 and
  // zero in years 2 and 3, so every plan year is provided.
  function recap(p, r, vals) {
    r.recap = [];
    p.meta.years.forEach(function (y, k) {
      CH.forEach(function (c, i) {
        r.recap.push({ year: y, sourceCell: String.fromCharCode(69 + i) + (5 + 4 * k), channel: c, motion: 'newBusiness', type: 'arr',
          value: k ? 0 : vals[i] });
      });
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

    /* ---------- US-2.5.1: recurring themes in leaders' words ---------- */

    var THEMES = ['TAP.themes', 'builder themes', 'insight rules: themes'];
    var themeSample = function () { TAP.data.load(JSON.parse(JSON.stringify(P))); TAP.insights.reset(); };
    var themeBuild = function (cmp, opts) {
      var def = TAP.reports.get('nb-themes'), c = Object.assign(TAP.store.defaults().cmp, cmp || {});
      return TAP.builders.get('themes')({ def: def, type: 'bar', cmp: c, entities: TAP.scope.entities(c), opts: opts || {}, highlight: null });
    };
    var themeRule = function () { return TAP.insights.all().filter(function (x) { return x.ruleId === 'recurringTheme'; }); };
    // The mini fixture with one comment per region (texts by region id) and nothing else to read.
    var themeFixture = function (texts) {
      var p = T_FIXTURE('mini');
      p.regions.forEach(function (r) {
        r.newBusiness.forEach(function (x) { x.successFactors = null; });
        r.marketCoverage.forEach(function (m, i) { m.commentary = i === 0 ? texts[r.id] || null : null; });
      });
      TAP.data.load(p);
      TAP.insights.reset();
    };

    T.test('TPV-TC-463', 'The theme configuration holds at least six themes, each with a name and keywords', function (a) {
      var C = window.TAP_COMMENT_THEMES, ids = {};
      a.equal(C.minRegions, 3, 'default threshold of 3 regions');
      a.ok(C.themes.length >= 6, C.themes.length + ' themes');
      C.themes.forEach(function (th) {
        a.ok(typeof th.id === 'string' && !ids[th.id], th.id + ' has a unique id');
        ids[th.id] = true;
        a.ok(typeof th.label === 'string' && th.label.length > 2, th.id + ' has a name');
        a.ok(Array.isArray(th.keywords) && th.keywords.length > 0 && th.keywords.every(function (k) { return typeof k === 'string' && k.trim(); }),
          th.id + ' has a keyword list');
      });
      ['references', 'partners', 'productGaps', 'marketing', 'skills', 'pricing'].forEach(function (id) { a.ok(ids[id], 'starter theme ' + id); });
    });

    when(THEMES, 'TPV-TC-465', 'The themes report ranks themes by regions mentioning them, as planted (Q06)', function (a) {
      themeSample();
      var res = themeBuild({ mode: 'all' });
      a.equal(res.error, null);
      a.deepEqual(res.table.rows.map(function (r) { return r.entityId; }), X.q06.themes.map(function (t) { return t.id; }), 'ranked as planted');
      a.deepEqual(res.table.rows.map(function (r) { return r.cells.regions.v; }), X.q06.themes.map(function (t) { return t.n; }), 'region counts as planted');
      var div = document.createElement('div');
      TAP.dom.html(div, res.html);
      var bars = div.querySelectorAll('.tap-themes__bar');
      a.equal(bars.length, X.q06.themes.length, 'one bar per theme');
      a.equal(bars[0].getAttribute('data-tap-value'), X.q06.themes[0].id, 'the most mentioned first');
      a.ok(bars[0].textContent.indexOf('7 of 7 regions') >= 0, 'the count is written, not shown by the bar alone');
    });

    when(THEMES, 'TPV-TC-466', 'A selected theme’s quotes are grouped by region, focus region first, each with its source', function (a) {
      themeSample();
      var res = themeBuild({ mode: 'one', focus: 'mea' }, { theme: 'marketing' });
      var div = document.createElement('div');
      TAP.dom.html(div, res.html);
      var want = X.q06.themes.filter(function (t) { return t.id === 'marketing'; })[0].regions;
      var got = [].map.call(div.querySelectorAll('.tap-themes__region'), function (el) { return el.getAttribute('data-region'); });
      a.equal(got[0], 'mea', 'the focus region first');
      a.deepEqual(got.slice().sort(), want.slice().sort(), 'every region that mentions it');
      a.deepEqual(got.slice(1), want.filter(function (r) { return r !== 'mea'; }), 'then file order');
      [].forEach.call(div.querySelectorAll('.tap-themes__quote'), function (q) {
        a.match(q.querySelector('.tap-themes__src').textContent, / plan\.xlsx › (2\. New Business|1\. Market Coverage) › [A-Z]+\d+$/, 'source: ' + q.textContent);
      });
      a.ok(div.querySelector('[data-tap-value="marketing"]').classList.contains('is-selected'), 'the bar shows as selected');
    });

    when(THEMES, 'TPV-TC-468', 'Themes in 3 and 4 regions give insights, one in 2 does not; at a threshold of 2 all three do', function (a) {
      var C = window.TAP_COMMENT_THEMES, was = C.minRegions;
      // references: alpha, bravo, charlie; product gaps: bravo, delta; partners: all four
      themeFixture({ alpha: 'References and a specialist partner', bravo: 'Local references, partner enablement, product gaps',
        charlie: 'Reference visits and partner marketing', delta: 'Partner training and product gaps to close' });
      var ids = function () { return themeRule().map(function (x) { return x.id; }).sort(); };
      var n = {};
      TAP.themes.all().forEach(function (t) { n[t.id] = t.regions.length; });
      a.deepEqual([n.references, n.productGaps, n.partners], [3, 2, 4], 'fixture: themes in 3, 2 and 4 regions');
      a.deepEqual(ids(), ['recurringTheme:partners', 'recurringTheme:references'], 'the default threshold of 3: the themes in 3 and 4');
      var four = themeRule().filter(function (x) { return x.id === 'recurringTheme:partners'; })[0];
      a.equal(four.sentence, 'Partners come up in the commentary of 4 regions.', 'the expected sentence');
      try {
        C.minRegions = 2;
        TAP.insights.reset();
        a.deepEqual(ids(), ['recurringTheme:partners', 'recurringTheme:productGaps', 'recurringTheme:references'], 'threshold 2: all three');
      } finally { C.minRegions = was; TAP.insights.reset(); }
    });

    when(['TAP.themes'], 'TPV-TC-469', 'Keywords match whole words in any case only', function (a) {
      a.ok(TAP.themes.match('We need REFERENCES').indexOf('references') >= 0, '"We need REFERENCES" counts for references');
      a.equal(TAP.themes.match('a partnership model').indexOf('partners'), -1, '"a partnership model" does not count for partners');
      a.ok(TAP.themes.match('Our partner, not theirs').indexOf('partners') >= 0, 'punctuation ends a word');
      a.ok(TAP.themes.match('Product  gaps hold us back').indexOf('productGaps') >= 0, 'a phrase matches across extra spaces');
      a.deepEqual(TAP.themes.match(''), [], 'empty text: nothing');
    });

    when(['TAP.themes'], 'TPV-TC-470', 'The themes report’s explanation names every theme’s keywords', function (a) {
      var text = TAP.explain.sections('nb-themes').map(function (s) { return s.paras.join(' '); }).join(' ');
      window.TAP_COMMENT_THEMES.themes.forEach(function (th) {
        a.ok(text.indexOf(th.label + ': ' + th.keywords.join(', ')) >= 0, th.label + ' and its keywords');
      });
    });

    when(THEMES, 'X-insights2-theme-insights', 'Recurring themes on the sample: wording, figures and the Show me target', function (a) {
      themeSample();
      var list = themeRule(), recurring = X.q06.themes.filter(function (t) { return t.n >= 3; });
      a.deepEqual(list.map(function (x) { return x.id.split(':')[1]; }).sort(), recurring.map(function (t) { return t.id; }).sort(), 'one per theme in 3 regions or more');
      var refs = list.filter(function (x) { return x.id === 'recurringTheme:references'; })[0];
      a.equal(refs.sentence, 'References come up in the success factors and commentary of 7 regions.');
      a.equal(list.filter(function (x) { return x.id === 'recurringTheme:marketing'; })[0].sentence, 'Marketing support comes up in the success factors of 5 regions.');
      a.equal(refs.figures[0].cell.v, 7, 'the count');
      a.equal(refs.figures[0].cell.kind, 'APP', 'calculated by this app (D63)');
      a.equal(refs.figures.length, 8, 'and a quote from each region');
      a.equal(refs.highlight.theme, 'references', 'Show me selects the theme');
      a.deepEqual(window.TAP_RULES.rules.filter(function (r) { return r.id === 'recurringTheme'; })[0].attach, ['nb-themes']);
      a.equal(refs.reportId, 'nb-themes');
      list.forEach(function (x) { window.T_INSIGHT_SHAPE(a, x); });
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

    when(PLAN, 'X-insights2-recap-blank', 'A region with a blank recap item is left out of channel reliance on both sides', function (a) {
      var p = JSON.parse(JSON.stringify(P));
      var latam = p.regions.filter(function (r) { return r.id === 'latam'; })[0];
      latam.recap.filter(function (x) { return x.channel === 'partner'; })[0].value = null;
      TAP.data.load(p);
      TAP.insights.reset();
      var list = I().ofRule('channelReliance');
      a.ok(list.every(function (x) { return x.regionIds[0] !== 'latam'; }), 'Latin America is not named on partial shares');
      a.equal(list.length, 1, 'Southern Europe only');
      // Southern Europe against the five other regions with whole recaps, worked out from the raw rows
      var rest = p.regions.filter(function (r) { return r.id !== 'seu' && r.id !== 'latam'; });
      var amt = function (r, ch) { return sum(r.recap.filter(function (x) { return !ch || x.channel === ch; }).map(function (x) { return x.value; })); };
      var others = sum(rest.map(function (r) { return amt(r, 'partner'); })) / sum(rest.map(function (r) { return amt(r); }));
      a.near(list[0].figures[1].cell.v, others, 1e-9, 'the others leave Latin America out');
      a.match(list[0].figures[1].label, /other 5 regions/, 'and say how many regions they are');
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

    /* ---------- US-2.5.3: shared targets ---------- */

    var SHARED = ['insight rules: shared'];
    var sharedOf = function (id) { return TAP.insights.all().filter(function (x) { return x.ruleId === id; }); };
    var subNames = function (names) {
      mini(function (p) {
        p.regions.forEach(function (r) { r.newBusiness.forEach(function (x, i) { x.subVertical = (names[r.id] || [])[i] || r.id + ' own ' + i; }); });
      });
    };

    when(SHARED, 'TPV-TC-477', 'A sub-industry named by 2 regions gives an insight naming both; one named by 1 does not', function (a) {
      // "Hospitals" in alpha and bravo, typed differently; "Clinics" in charlie only
      subNames({ alpha: ['Hospitals'], bravo: ['x', '  hospitals '], charlie: ['Clinics'] });
      var list = sharedOf('sharedSubIndustry');
      a.equal(list.length, 1, 'only the shared one');
      a.deepEqual(list[0].regionIds, ['alpha', 'bravo'], 'names both regions');
      a.equal(list[0].sentence, '2 regions name the sub-industry Hospitals as a target: Region A and Region B.');
      a.deepEqual(banned(list[0].sentence), [], 'no banned word');
    });

    when(SHARED, 'TPV-TC-478', 'A partner named by 2 regions gives an insight naming both; one named by 1 does not', function (a) {
      mini(function (p) {
        rg(p, 'alpha').partners[0].name = ' Shared   Partner';
        rg(p, 'delta').partners[0].name = 'shared  partner';
      });
      var list = sharedOf('sharedPartner');
      a.equal(list.length, 1, 'only the shared one (Region B’s partner is its own)');
      a.deepEqual(list[0].regionIds, ['alpha', 'delta'], 'names both regions');
      a.equal(list[0].sentence, '2 regions name Shared Partner as a partner: Region A and Region D.', 'shown with single spaces');
    });

    when(SHARED, 'TPV-TC-479', 'Shared targets attach to the sub-industry and partner lists, and Show me names the matching rows', function (a) {
      I().sample();
      var sub = sharedOf('sharedSubIndustry'), pt = sharedOf('sharedPartner');
      a.deepEqual(cfg('sharedSubIndustry').attach, ['nb-rows']);
      a.deepEqual(cfg('sharedPartner').attach, ['pt-list']);
      a.equal(sub.length, 1, 'one shared sub-industry on the sample (Q03)');
      a.deepEqual(sub[0].highlight.items, X.q03.shared[0].rows.map(function (r) { return { section: 'newBusiness', regionId: r[0], row: r[1] }; }),
        'the target lists the matching new business rows');
      a.equal(pt.length, 1, 'one shared partner on the sample (Q04)');
      a.deepEqual(pt[0].highlight.items, X.q04.shared[0].rows.map(function (r) { return { section: 'partners', regionId: r[0], row: r[1] }; }),
        'the target lists the matching partner rows');
      [[sub[0], 'nb-rows'], [pt[0], 'pt-list']].forEach(function (p) {
        if (TAP.reports.get(p[1])) a.equal(p[0].reportId, p[1], p[1]);
        else a.equal(p[0].fallback, 'details', p[1] + ' not built yet: Show me opens the details');
      });
    });

    when(SHARED, 'X-insights2-shared-sample', 'The planted shared sub-industry and partner read as expected', function (a) {
      I().sample();
      a.equal(sharedOf('sharedSubIndustry')[0].sentence, '2 regions name the sub-industry Acute care hospitals as a target: North America and Asia Pacific.');
      a.equal(sharedOf('sharedPartner')[0].sentence, '2 regions name Donvocombe Systems as a partner: North America and Latin America.');
      sharedOf('sharedSubIndustry').concat(sharedOf('sharedPartner')).forEach(function (x) { window.T_INSIGHT_SHAPE(a, x); });
    });

    /* ---------- US-2.5.4: partner capacity ---------- */

    var CAP = X.q05.flagged[0];

    when(SHARED, 'TPV-TC-481', 'The planted partner gives an insight with its order intake per person and multiple; partners under 2x do not', function (a) {
      I().sample();
      var list = sharedOf('partnerCapacity');
      a.equal(list.length, 1, 'one partner at 2x or more (Q05)');
      a.deepEqual(list[0].regionIds, [CAP.region]);
      a.near(list[0].figures[0].cell.v, CAP.perFte, 1e-6, 'order intake per person');
      a.near(list[0].figures[1].cell.v, X.q05.average, 1e-6, 'the average across partners');
      a.near(list[0].figures[0].cell.v / list[0].figures[1].cell.v, CAP.multiple, 1e-6, 'the multiple');
    });

    when(SHARED, 'TPV-TC-482', 'With only 4 partners with FTE there is no partner capacity insight', function (a) {
      var p = JSON.parse(JSON.stringify(P)), kept = 0;
      p.regions.forEach(function (r) {
        r.partners.forEach(function (x) {
          if (x.name === CAP.name || kept < 3) { if (x.name !== CAP.name) kept++; return; }
          x.fteSales = null;
          x.fteConsultants = null;
        });
      });
      TAP.data.load(p);
      TAP.insights.reset();
      a.equal(sharedOf('partnerCapacity').length, 0, 'not computed, even for the planted partner');
      a.ok(!TAP.insights.failures().some(function (f) { return f.ruleId === 'partnerCapacity'; }), 'and not a failure');
    });

    when(SHARED, 'X-insights2-capacity-partial', 'A partly provided partner counts towards the 5 and is compared, with its note', function (a) {
      // Five partners with FTE, the planted one with a blank year of services; every other partner without FTE
      var p = JSON.parse(JSON.stringify(P)), kept = [];
      p.regions.forEach(function (r) {
        r.partners.forEach(function (x) {
          if (x.name === CAP.name) { x.services[2] = null; kept.push(x); return; }
          if (kept.filter(function (k) { return k.name !== CAP.name; }).length < 4 && x.channel !== 'partner') { kept.push(x); return; }
          x.fteSales = null;
          x.fteConsultants = null;
        });
      });
      a.equal(kept.length, 5, 'fixture: five partners with FTE');
      var oi = function (x) { return sum(x.arr.concat(x.services).filter(num)); };
      var fte = function (x) { return x.fteSales + x.fteConsultants; };
      var avg = sum(kept.map(oi)) / sum(kept.map(fte));
      var planted = kept.filter(function (x) { return x.name === CAP.name; })[0], mine = oi(planted) / fte(planted);
      a.ok(mine / avg >= 2, 'fixture: the planted partner is still at 2x or more (' + (mine / avg).toFixed(2) + ')');
      TAP.data.load(p);
      TAP.insights.reset();
      var x = sharedOf('partnerCapacity').filter(function (i) { return i.regionIds[0] === CAP.region; })[0];
      a.ok(x, 'computed: the partly provided partner counts towards the 5');
      a.near(x.figures[0].cell.v, mine, 1e-6, 'its order intake per person, over the years given');
      a.ok(x.figures[0].cell.partial === true && !!x.figures[0].cell.note, 'carries the partial note');
      a.near(x.figures[1].cell.v, avg, 1e-6, 'the average counts it too');
    });

    when(SHARED, 'TPV-TC-483', 'The partner capacity sentence follows the story’s pattern, with no banned word', function (a) {
      I().sample();
      var x = sharedOf('partnerCapacity')[0];
      a.equal(x.sentence, CAP.name + ' (Middle East & Africa) is planned at ' + TAP.format.money(CAP.perFte) +
        ' per person, about 3× the average across partners (' + TAP.format.money(X.q05.average) + ').');
      a.deepEqual(banned(x.sentence), [], 'no banned word');
    });

    when(SHARED, 'TPV-TC-484', 'Partner capacity attaches to the partner capacity report and highlights the partner’s bubble', function (a) {
      I().sample();
      var x = sharedOf('partnerCapacity')[0];
      a.deepEqual(cfg('partnerCapacity').attach, ['pt-capacity']);
      a.equal(cfg('partnerCapacity').highlight, 'points', 'the bubble');
      a.deepEqual(x.highlight.items, [{ section: 'partners', regionId: CAP.region, row: CAP.row }], 'the partner’s row');
      if (TAP.reports.get('pt-capacity')) a.equal(x.reportId, 'pt-capacity');
      else a.equal(x.fallback, 'details', 'pt-capacity not built yet: Show me opens the details');
      window.T_INSIGHT_SHAPE(a, x);
    });

    /* ---------- US-2.5.6: insights point to the new reports ---------- */

    // The Phase 1 rules that fell back to the details panel, and the reports that show their data.
    var MOVED = { outlier: ['nb-levers', 'cg-growth'], noPipeline: ['nb-industries'], winsVsPeers: ['nb-levers'],
      concentration: ['cg-exposure'], atRisk: ['cg-exposure'], segmentMix: ['cg-segments'] };

    T.test('TPV-TC-492', 'Every Phase 1 rule that fell back to details names the Phase 2 report that shows its data', function (a) {
      Object.keys(MOVED).forEach(function (id) {
        a.deepEqual(cfg(id).attach, MOVED[id], id + ' attaches to ' + MOVED[id].join(', '));
        a.ok(!!cfg(id).highlight, id + ' has a highlight mark');
      });
      var show = cfg('outlier').params.show;
      a.deepEqual(show['nb.hitRate'], ['nb-levers', 'nb.hitRate'], 'outlier hit rate: the levers report, on Hit rate');
      ['cg.growthY1', 'cg.growthY2', 'cg.growthY3'].forEach(function (m) { a.equal(show[m][0], 'cg-growth', m + ': the growth report'); });
      Object.keys(show).forEach(function (m) {
        var def = TAP.reports.get(show[m][0]);
        if (def) a.ok((def.measures || []).some(function (x) { return x.id === show[m][1]; }), m + ': ' + show[m][1] + ' is a measure of ' + show[m][0]);
        else a.ok(true, show[m][0] + ' not built yet');
      });
    });

    T.test('TPV-TC-493', 'Show me goes to the report’s view, names the measure the insight is about and the data', function (a) {
      I().sample();
      var byId = {};
      TAP.insights.all().forEach(function (x) { byId[x.id] = x; });
      var cases = [
        ['outlier:nb.hitRate:ceu', 'nb-levers', 'newBusiness', 'nb.hitRate', ['ceu'], []],
        ['outlier:nb.avgDealSize:latam', 'nb-levers', 'newBusiness', 'nb.avgDealSize', ['latam'], []],
        ['outlier:cg.growthY2:na', 'cg-growth', 'customers', 'cg.growth.all', ['na'], []],
        ['winsVsPeers:na', 'nb-levers', 'newBusiness', 'nb.wins', ['na'], []],
        ['noPipeline:apac:transport', 'nb-industries', 'newBusiness', 'ind.nb.arr', ['apac'], ['transport']]
      ];
      cases.forEach(function (c) {
        var x = byId[c[0]];
        a.ok(x, c[0] + ' is on the sample (P08, P09, P12, P11 and the year-2 growth outlier)');
        if (!x) return;
        a.equal(x.reportId, c[1], c[0] + ': report');
        a.equal(TAP.reports.get(x.reportId).view, c[2], c[0] + ': view');
        a.equal(x.highlight.measureId, c[3], c[0] + ': the measure it is about');
        a.ok(TAP.reports.get(c[1]).measures.some(function (m) { return m.id === c[3]; }), c[0] + ': a measure the report offers');
        a.deepEqual(x.highlight.regionIds, c[4], c[0] + ': the region');
        a.deepEqual(x.highlight.industryIds, c[5], c[0] + ': the industry');
        a.equal(x.fallback, null, c[0] + ': not the details panel');
      });
    });

    T.test('TPV-TC-495', 'On the sample, no insight falls back to details where a report exists for it', function (a) {
      I().sample();
      var exists = function (id) { return !!TAP.reports.get(id); };
      var show = cfg('outlier').params.show;
      TAP.insights.all().forEach(function (x) {
        // Reports that could show it: the rule's, narrowed for outliers to the one showing the assumption
        var could = x.ruleId === 'outlier' ? (show[x.id.split(':')[1]] || []).slice(0, 1) : cfg(x.ruleId).attach;
        if (could.some(exists)) a.ok(x.reportId && x.fallback === null, x.id + ' lands on ' + (x.reportId || 'details'));
        else a.equal(x.fallback, 'details', x.id + ': no report is built for it yet');
      });
      a.equal(TAP.insights.all().filter(function (x) { return x.ruleId === 'outlier' && !x.reportId; }).length, 0,
        'no sample outlier is about the services ratio, the one assumption no report shows');
    });

    // The panel selects highlight.measureId on Show me once PANEL2b's change lands; that PR sets this to true.
    var PANEL_TAKES_MEASURE = true;
    (PANEL_TAKES_MEASURE ? T.test : function (id, title) { T.skip(id, title, 'waits for the panel to select highlight.measureId (PANEL2b)'); })(
      'X-insights2-showme-measure', 'Show me switches the report to the insight’s measure', function (a) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: JSON.parse(JSON.stringify(P)) });
      TAP.showme.bind();
      try {
        var x = TAP.insights.all().filter(function (i) { return i.id === 'outlier:nb.hitRate:ceu'; })[0];
        TAP.showme.go({ insightId: x.id, target: x.highlight });
        var panel = root.querySelector('.tap-panel[data-report="nb-levers"]');
        a.ok(panel, 'the levers report is on screen');
        var on = panel && panel.querySelector('[data-control="measure"] [aria-pressed="true"]');
        a.equal(on && on.getAttribute('data-value'), 'nb.hitRate', 'Hit rate is selected');
      } finally {
        TAP.showme.unbind();
        try { TAP.layers.close(); } catch (e) { /* none open */ }
        TAP.app.stop();
      }
    });
  });
})(window.TAP);
