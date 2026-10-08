/*
 * File: tests/test-pages-p4.js
 * Purpose: Tests for the Phase 4 glossary, Guide, tour, region profile lines and handover documents.
 * Provides: test cases for the PAGES4 stream: US-4.6.1 (TPV-TC-742, 745, 747), US-4.6.3 (TPV-TC-756, 758, 759),
 *           X-p4-pages-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 * Owner: PAGES4 stream
 */
(function (TAP) {
  'use strict';

  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  // Every string under an object, with its key path.
  function strings(obj, path, out) {
    out = out || [];
    if (typeof obj === 'string') out.push({ path: path, text: obj });
    else if (obj && typeof obj === 'object') Object.keys(obj).forEach(function (k) { strings(obj[k], path ? path + '.' + k : k, out); });
    return out;
  }
  function sentences(s) { return (String(s).match(/[.?!](\s|$)/g) || []).length; }

  // The terms US-4.6.1 names: glossary id and a word a reader sees on screen that must find the entry.
  var TERMS = { strategicPlan: 'strategic plan', baseYear: 'base year', budget: 'budget', forecast: 'forecast',
    actuals: 'actuals', pipelineCoverage: 'pipeline coverage', revenueOutlook: 'revenue outlook', revenueRelease: 'revenue release',
    customerValue: 'customer value', booksValue: 'books value', routeToMarket: 'route to market', solution: 'solution',
    productCategory: 'product category', swPerpetual: 'software perpetual', partnerType: 'partner type',
    partnerMaturity: 'partner maturity' };
  // The five maturity levels, lowest first (Data Contract, lookups.partnerMaturity)
  var LEVELS = [['maturityRecruit', 'Recruit'], ['maturityOnboard', 'Onboard'], ['maturityEnable', 'Enable'],
    ['maturitySkill', 'Skill'], ['maturityStrategic', 'Strategic']];
  // The Phase 4 reports (ARCHITECTURE 19.3), built by the OUTLOOK and NBPT streams
  var P4_REPORTS = ['ol-strategic', 'ol-baseyear', 'ol-coverage', 'ol-revenue', 'ol-revshare', 'ol-category',
    'nb-solutions', 'pt-books', 'pt-routes', 'pt-maturity'];
  // The menu as Phase 4 has it: Outlook after Partners (D87), whether or not its view is in the menu yet
  function menuOrder() {
    var order = window.TAP_VIEWS.order.slice();
    if (order.indexOf('outlook') < 0) order.splice(order.indexOf('partners') + 1, 0, 'outlook');
    return order;
  }
  function p4Entries() {
    return Object.keys(TERMS).concat(LEVELS.map(function (l) { return l[0]; }), ['variance']);
  }
  function howTo(id) { return (TAP.content.guide().howTo.sections || []).filter(function (s) { return s.id === id; })[0]; }
  function linked(part, view) {
    return (TAP.content.guide()[part].sections || []).filter(function (s) { return s.link && s.link.view === view; });
  }

  T.suite('pages-p4', function () {
    /* ---------- US-4.6.4: import brief, prompts and checklist (#460): file checks, run by Node ---------- */

    var DOCS4 = 'Checked by tools/check-docs4.js (run by tools/check-docs3.js in scripts/verify.sh and CI)';
    T.skip('TPV-TC-762', 'Every field the Data Contract adds for the full template is named in docs/IMPORT-BRIEF.md', DOCS4);
    T.skip('X-p4-docs-after-import', 'The checklist and the prompts have a full template part with the checks to run after the import', DOCS4);
    T.skip('TPV-TC-766', 'Every file path the four documents name exists, and no denylisted term is found',
      'Checked by tools/check-docs.js and the denylist scan in scripts/verify.sh');

    /* ---------- US-4.6.1: glossary and Guide for Phase 4 (#457) ---------- */

    T.test('TPV-TC-742', 'Every term the story names has a full glossary entry, found by the words on screen', function (a) {
      var g = window.TAP_CONTENT.glossary;
      Object.keys(TERMS).forEach(function (id) {
        var e = g[id];
        a.ok(e, id + ' exists');
        if (!e) return;
        a.ok(e.term && e.short && e.short.length > 20, id + ': term and a plain definition');
        a.ok(e.why && e.why.length > 20, id + ': why it matters');
        a.ok(Array.isArray(e.aliases), id + ': aliases is a list');
        a.ok(Array.isArray(e.related) && e.related.length > 0, id + ': related terms');
        (e.related || []).forEach(function (r) { a.ok(g[r], id + ': related "' + r + '" exists'); });
        var found = TAP.content.term(TERMS[id]);
        a.equal(found && found.id, id, '"' + TERMS[id] + '" finds the ' + id + ' entry');
      });
    });

    T.test('TPV-TC-742', 'Each maturity level has an entry, and partner maturity lists the five levels in their order', function (a) {
      var g = window.TAP_CONTENT.glossary, pm = g.partnerMaturity || {};
      LEVELS.forEach(function (l, i) {
        var e = g[l[0]];
        a.ok(e, l[1] + ' has an entry');
        if (!e) return;
        a.equal(e.term.indexOf(l[1]), 0, l[1] + ': the term starts with the level\'s name');
        a.ok(e.short.length > 20 && e.why.length > 20, l[1] + ': a definition and why it matters');
        a.ok(e.related.indexOf('partnerMaturity') >= 0, l[1] + ': related to partner maturity');
        a.ok(new RegExp('\\b' + (i + 1) + '\\b|' + ['first', 'second', 'third', 'fourth', 'fifth'][i], 'i').test(e.short),
          l[1] + ': says where it sits among the five');
      });
      var at = LEVELS.map(function (l) { return pm.short ? pm.short.indexOf(l[1]) : -1; });
      a.ok(at.every(function (x) { return x >= 0; }), 'partner maturity names every level');
      a.deepEqual(at.slice().sort(function (x, y) { return x - y; }), at, 'in the order Recruit to Strategic');
    });

    T.test('X-p4-pages-glossary-style', 'The Phase 4 entries are plain and neutral: no em dash, no verdict, no placeholder', function (a) {
      var g = window.TAP_CONTENT.glossary, banned = ((window.TAP_RULES || {}).wording || {}).banned || [];
      a.ok(banned.length > 3, 'the banned words are loaded');
      p4Entries().forEach(function (id) {
        a.ok(g[id], id + ' exists');
        strings(g[id], id).forEach(function (s) {
          a.ok(s.text.indexOf('—') < 0, s.path + ' has no em dash');
          a.ok(!/TODO|TBD|\{\w+\}/.test(s.text), s.path + ' has no placeholder');
          a.ok(!/\b(good|bad|better|worse|best|worst|healthy|weak)\b/i.test(s.text), s.path + ' passes no verdict');
          banned.forEach(function (w) { a.ok(!new RegExp('\\b' + w + '\\b', 'i').test(s.text), s.path + ' avoids "' + w + '"'); });
        });
      });
    });

    T.test('X-p4-pages-glossary-marked', 'The Phase 4 measure wording marks its term the first time it appears', function (a) {
      var cases = [['Strategic plan order intake', 'strategicPlan'], ['Order intake through the organization’s books', 'booksValue'],
        ['Order intake at customer value', 'customerValue'], ['Pipeline coverage', 'pipelineCoverage'],
        ['Base year forecast', 'forecast'], ['Revenue as a share of order intake', 'revenueOutlook'],
        ['Order intake across routes to market', 'routeToMarket'], ['Order intake across product categories (books value)', 'productCategory'],
        ['Partners across maturity levels', 'partnerMaturity'], ['Plan minus strategic plan', 'variance']];
      cases.forEach(function (c) {
        var html = TAP.content.mark(c[0], {});
        a.ok(html.indexOf('data-term="' + c[1] + '"') >= 0, '"' + c[0] + '" marks ' + c[1]);
      });
      var seen = {}, first = TAP.content.mark('Strategic plan', seen), again = TAP.content.mark('Strategic plan', seen);
      a.ok(/data-term=/.test(first) && !/data-term=/.test(again), 'marked once per panel, as for the existing terms');
    });

    T.test('X-p4-pages-glossary-everyday', 'Everyday words stay unmarked: the level names alone, market coverage, plan', function (a) {
      ['Enable the filter to skip the step and strategic choices', 'The plan for the year'].forEach(function (s) {
        a.ok(!/data-term="maturity/.test(TAP.content.mark(s, {})), '"' + s + '" marks no maturity level');
      });
      a.ok(TAP.content.mark('1. Market coverage', {}).indexOf('data-term="pipelineCoverage"') < 0, 'market coverage is not pipeline coverage');
    });

    T.test('TPV-TC-745', 'The Guide describes the Outlook view in two or three sentences, with a link to it', function (a) {
      var s = linked('howTo', 'outlook')[0], all = s ? s.paragraphs.join(' ') : '';
      a.ok(s, 'a How to use section links to the Outlook view');
      var n = sentences(all);
      a.ok(n >= 2 && n <= 3, 'Outlook: ' + n + ' sentences');
      a.ok(all.indexOf(window.TAP_VIEWS.outlook.title) >= 0, 'names the view as the menu does');
      ['strategic plan', 'base year', 'coverage', 'revenue', 'product category'].forEach(function (w) {
        a.ok(new RegExp(w, 'i').test(all), 'mentions ' + w);
      });
      a.ok(linked('planning', 'outlook').length >= 1, 'a planning section explains the Outlook figures and links to the view');
    });

    T.test('X-guide-market-coverage', 'The Guide has a Market coverage section, with the view link and both parts named', function (a) {
      var mc = howTo('viewIndustry');
      a.ok(!!mc, 'section viewIndustry exists');
      if (!mc) return;
      a.equal(mc.link && mc.link.view, 'industry', 'opens the Market coverage view');
      var text = mc.paragraphs.join(' ');
      a.ok(/All industries/.test(text) && /One industry/.test(text), 'names the two parts: ' + text);
      a.ok(/tier/i.test(text) && /ratings/.test(text), 'mentions the tier grid and the ratings');
    });

    T.test('TPV-TC-745', 'The Guide describes the new reports on the New business and Partners views', function (a) {
      var nb = howTo('viewNewBusiness'), pt = howTo('viewPartners');
      var nbText = nb ? nb.paragraphs.join(' ') : '', ptText = pt ? pt.paragraphs.join(' ') : '';
      a.match(nbText, /solution/i, 'New business: the solutions report');
      [/customer value/i, /books/i, /route to market/i, /maturity/i].forEach(function (re) { a.match(ptText, re, 'Partners: ' + re); });
      [nb, pt].forEach(function (s) {
        var k = sentences(s.paragraphs.join(' '));
        a.ok(k >= 2 && k <= 3, s.id + ': still two or three sentences (' + k + ')');
      });
    });

    T.test('TPV-TC-745', 'The menu paragraph names the views in menu order, Outlook after Partners', function (a) {
      var menu = howTo('menu').paragraphs[0], last = -1;
      menuOrder().forEach(function (id) {
        var title = id === 'guide' ? 'this Guide' : window.TAP_VIEWS[id].title, at = menu.indexOf(title);
        a.ok(at > last, title + ' comes next in the menu paragraph');
        last = Math.max(last, at);
      });
    });

    T.test('TPV-TC-745', 'The tour has a step for the Outlook view, after the step for the other views', function (a) {
      var steps = TAP.tour.steps(), ids = steps.map(function (s) { return s.id; }), s = steps[ids.indexOf('outlook')];
      a.ok(s, 'an Outlook step');
      if (!s) return;
      a.equal(ids.indexOf('outlook'), ids.indexOf('views') + 1, 'it follows the views step, as Outlook follows Partners in the menu');
      a.ok(steps.length <= 10, 'the tour keeps to 10 steps (' + steps.length + ')');
      a.ok(s.text.indexOf(window.TAP_VIEWS.outlook.title) >= 0, 'the step names the view');
      a.ok(s.title && s.title.indexOf('[') !== 0 && s.text.indexOf('[') !== 0, 'title and text come from the content file');
      var n = sentences(s.text);
      a.ok(n >= 1 && n <= 2, n + ' sentence(s)');
    });

    T.test('X-p4-pages-tour-fallback', 'The Outlook step points at its menu item, falling back to the menu, never at a view\'s part', function (a) {
      var s = TAP.tour.steps().filter(function (x) { return x.id === 'outlook'; })[0];
      var parts = s ? s.sel.split(',').map(function (p) { return p.trim(); }) : [];
      a.equal(parts[0], '.tap-menu__item[data-view="outlook"]', 'the Outlook menu item first');
      a.equal(parts[parts.length - 1], '[data-tour="menu"]', 'then the menu, which every view has');
      a.ok(parts.every(function (p) { return p.indexOf('.tap-view') < 0; }), 'nothing inside a view, which may lack it');
    });

    T.test('X-p4-pages-tip', 'The Outlook view has its one-line tip in the content file', function (a) {
      var text = TAP.content.text('viewTips.outlook');
      a.ok(text && text !== '[viewTips.outlook]', 'viewTips.outlook is set');
      a.ok(text.length <= 80 && sentences(text) === 1, 'one short line: ' + text.length + ' characters');
    });

    // D90: with ten menu items, key 0 opens the tenth view and 1 to 9 keep their places. Stand-in entries fill the
    // menu to ten while the Outlook view is built (as TPV-TC-504 does for a ninth), removed again below.
    T.test('X-p4-pages-key-zero', 'Key 0 opens the tenth view in the menu, and the Guide lists it as 0', function (a) {
      a.equal(TAP.keys.viewFor('0'), TAP.views.order()[9] || null, 'as the menu is: the tenth view, or nothing');
      var order = window.TAP_VIEWS.order, saved = order.slice();
      while (TAP.views.order().length < 10) order.splice(order.indexOf('guide'), 0, 'insights');
      var ten = TAP.views.order();
      try {
        a.equal(ten.length, 10, 'ten views in the menu');
        a.equal(TAP.keys.viewFor('0'), ten[9], 'key 0 opens the tenth, ' + ten[9]);
        a.equal(TAP.keys.viewFor('9'), ten[8], 'key 9 still opens the ninth');
        a.equal(TAP.keys.viewFor('1'), ten[0], 'key 1 still opens the first');
        var root = T.dom.mount(), handle = TAP.views.get('guide').mount(root);
        try {
          var items = qsa('[data-guide="howTo"] .tap-guide__key', root);
          a.equal(items.length, 10, 'the Guide lists ten keys');
          a.deepEqual(items.map(function (li) { return txt(li.querySelector('kbd')); }), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            'in menu order, the tenth as 0');
          a.equal(items[9] && items[9].getAttribute('data-view'), ten[9], 'the line for 0 names the view key 0 opens');
        } finally { handle.destroy(); }
        TAP.keys.bind();
        try {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true }));
          a.equal(TAP.store.get().view, ten[9], 'pressing 0 opens the tenth view');
        } finally { TAP.keys.unbind(); }
      } finally { order.length = 0; Array.prototype.push.apply(order, saved); }
      a.match(howTo('keys').paragraphs.join(' '), /\b0\b/, 'the shortcuts paragraph names key 0');
    });

    T.test('TPV-TC-747', 'Every Phase 4 report has all three parts of its explanation', function (a) {
      var stubs = TAP.stub.list().length;
      P4_REPORTS.forEach(function (id) {
        var def = TAP.reports.get(id);
        if (!def) { a.ok(stubs > 0, id + ' is not built yet, which is allowed only while stubs remain'); return; }
        ['shows', 'read', 'lookFor'].forEach(function (k) {
          var v = def.explain && def.explain[k];
          a.ok(typeof v === 'string' && v.trim().length > 20, id + ': "' + k + '" is written');
        });
      });
    });

    /* ---------- US-4.6.3: region profile and running order (#459) ---------- */

    // Region A on the miniP4 fixture against the average of the rest (Regions B and D; Region C has no Phase 4 part
    // and is left out), from tests/fixtures/mini-p4-expected.js. Strategic plan line, three-year figures:
    //   plan A 2575, rest (3310 + 2585) / 2 = 2947.5; strategic plan A 2700, rest (3200 + 3100) / 2 = 3150;
    //   variance A 2575 - 2700 = -125, rest (110 - 515) / 2 = -202.5.
    // Revenue line, rv.all.oi by plan year: A 450 / 760 / 1000; B 635 / 1100 / 1220; D 610 / 850 / 1500, so the rest is
    //   (635 + 610) / 2 = 622.5, (1100 + 850) / 2 = 975 and (1220 + 1500) / 2 = 1360.
    var P4_GLANCE = {
      strategic: [['sp.plan', null, 2575, 2947.5], ['sp.oi', null, 2700, 3150], ['sp.variance', null, -125, -202.5]],
      revenue: [['rv.all.oi', 1, 450, 622.5], ['rv.all.oi', 2, 760, 975], ['rv.all.oi', 3, 1000, 1360]]
    };
    function loadP4(n) {
      var p = T_FIXTURE('miniP4');
      if (n) p.regions = p.regions.slice(0, n);
      var res = TAP.data.load(p);
      if (!res.ok) throw new Error('miniP4 did not load: ' + res.errors.join('; '));
    }
    function lineOf(lines, key) { return lines.filter(function (l) { return l.key === key; })[0]; }
    function mountProfile(regionId) {
      TAP.store.set({ view: 'regions', region: regionId });
      var root = T.dom.mount();
      return { root: root, handle: TAP.views.get('regions').mount(root) };
    }
    function withP4(n, fn) {
      loadP4(n);
      try { return fn(); } finally { TAP.store.set({ region: null }); TAP.data.load(T_FIXTURE('mini')); }
    }
    function flat(rows) { return [].concat.apply([], rows.map(function (r) { return [].concat(r); })); }

    T.test('TPV-TC-756', 'The glance has a strategic plan line and a revenue line, for the region and the average of the rest', function (a) {
      withP4(0, function () {
        var lines = TAP.profileParts.glance('alpha');
        a.deepEqual(lines.map(function (l) { return l.key; }), ['ambition', 'focus', 'pool', 'customers', 'strategic', 'revenue'],
          'the four card lines, then the strategic plan and revenue');
        Object.keys(P4_GLANCE).forEach(function (key) {
          var line = lineOf(lines, key);
          a.ok(line && line.label && line.label.indexOf('[') !== 0, key + ': a label from the content file');
          if (!line) return;
          a.equal(line.figures.length, P4_GLANCE[key].length, key + ': ' + P4_GLANCE[key].length + ' figures');
          P4_GLANCE[key].forEach(function (want, i) {
            var f = line.figures[i] || {};
            a.equal(f.measure, want[0], key + ' figure ' + (i + 1) + ' is ' + want[0]);
            a.equal(f.year || null, want[1], key + ' figure ' + (i + 1) + ': plan year ' + want[1]);
            a.near(f.region && f.region.v, want[2], 1e-6, key + ' ' + f.label + ': Region A');
            a.near(f.rest && f.rest.v, want[3], 1e-6, key + ' ' + f.label + ': average of the rest');
            a.ok(f.rest && f.rest.src && (f.rest.src.excluded || []).indexOf('charlie') >= 0, key + ' ' + f.label + ': Region C is left out and named');
            a.ok(f.label && f.label.indexOf('[') !== 0, key + ' figure ' + (i + 1) + ' has its label');
          });
        });
        var s = lineOf(lines, 'strategic');
        a.deepEqual(s.figures.map(function (f) { return f.label; }),
          [TAP.content.text('profile.glance.p4.plan'), TAP.content.text('profile.glance.p4.strategicPlan'), TAP.content.text('profile.glance.p4.variance')],
          'plan, strategic plan and variance');
        a.equal(s.figures[2].compare.key, 'above', '-125 against -202.5 reads "above", in the neutral words');
      });
    });

    T.test('TPV-TC-756', 'For the region without a strategic plan or revenue, both lines read "not provided"', function (a) {
      withP4(0, function () {
        var lines = TAP.profileParts.glance('charlie');
        ['strategic', 'revenue'].forEach(function (key) {
          var line = lineOf(lines, key);
          a.ok(line && line.np, key + ': the line is marked not provided');
          (line ? line.figures : []).forEach(function (f) { a.equal(f.region.state, 'notProvided', key + ' ' + f.label + ': not provided'); });
        });
        var m = mountProfile('charlie');
        try {
          ['strategic', 'revenue'].forEach(function (key) {
            var el = m.root.querySelector('.tap-pf-glance__line[data-line="' + key + '"]');
            a.ok(el, key + ': the line is drawn');
            a.match(txt(el), new RegExp(TAP.content.text('states.notProvided'), 'i'), key + ' reads "not provided"');
            a.equal(qsa('[data-part="compare"]', el).filter(function (x) { return txt(x); }).length, 0, key + ': no comparison where nothing is provided');
          });
        } finally { m.handle.destroy(); }
      });
    });

    T.test('X-p4-pages-glance-drawn', 'The new lines draw the figures, the rest and the comparison, in body text', function (a) {
      withP4(0, function () {
        var m = mountProfile('alpha');
        try {
          var line = m.root.querySelector('.tap-pf-glance__line[data-line="revenue"]');
          a.ok(line, 'the revenue line is drawn');
          var rows = qsa('tbody tr', line);
          a.equal(rows.length, 3, 'one row per plan year');
          a.deepEqual(rows.map(function (r) { return r.getAttribute('data-year'); }), ['1', '2', '3'], 'years 1 to 3');
          a.equal(txt(rows[0] && rows[0].querySelector('[data-part="region"]')), TAP.format.cell({ v: 450, state: 'value', kind: 'DER' }, { unit: 'money' }), 'Region A, year 1');
          a.equal(txt(rows[0] && rows[0].querySelector('[data-part="compare"]')), TAP.content.text('profile.glance.below'), '450 is below 622.5');
          var s = m.root.querySelector('.tap-pf-glance__line[data-line="strategic"]');
          a.equal(qsa('tbody tr', s).length, 3, 'the strategic plan line has three rows');
          qsa('tbody th, td button', s).forEach(function (n) {
            a.ok(parseFloat(getComputedStyle(n).fontSize) >= 16, 'at least 16 px: ' + txt(n));
          });
        } finally { m.handle.destroy(); }
      });
    });

    T.test('X-p4-pages-glance-old', 'A file without the full template\'s parts shows the four lines it showed before (D57)', function (a) {
      var lines = TAP.profileParts.glance('alpha');
      a.deepEqual(lines.map(function (l) { return l.key; }), ['ambition', 'focus', 'pool', 'customers'], 'no strategic plan or revenue line');
    });

    T.test('X-p4-pages-glance-alone', 'With one region, the new lines show the region\'s figures and nothing extra', function (a) {
      withP4(1, function () {
        var m = mountProfile('alpha');
        try {
          ['strategic', 'revenue'].forEach(function (key) {
            var el = m.root.querySelector('.tap-pf-glance__line[data-line="' + key + '"]');
            a.ok(el, key + ' is drawn');
            a.equal(qsa('thead th', el).length, 2, key + ': a label column and the region column only');
            a.equal(qsa('[data-part="rest"], [data-part="compare"]', el).length, 0, key + ': no rest or comparison');
          });
          var f = (lineOf(TAP.profileParts.glance('alpha'), 'strategic') || { figures: [] }).figures[2] || {};
          a.near(f.region && f.region.v, -125, 1e-6, 'the variance is still Region A\'s');
          a.equal(f.rest, null, 'and there is no rest');
        } finally { m.handle.destroy(); }
      });
    });

    T.test('TPV-TC-758', 'The profile\'s reports include the strategic plan and revenue reports, side by side', function (a) {
      var rows = window.TAP_PROFILE.reports, ids = flat(rows);
      ['ol-strategic', 'ol-revenue'].forEach(function (id) { a.ok(ids.indexOf(id) >= 0, id + ' is on the profile'); });
      a.ok(rows.some(function (r) { return [].concat(r).join() === 'ol-strategic,ol-revenue'; }), 'as one row of two panels (D24)');
      var stubs = TAP.stub.list().length;
      ['ol-strategic', 'ol-revenue'].forEach(function (id) {
        var def = TAP.reports.get(id);
        if (!def) { a.ok(stubs > 0, id + ' is not built yet, which is allowed only while stubs remain'); return; }
        var ds = TAP.prepare.run(def, { cmp: TAP.profile.cmp('alpha') });
        a.deepEqual(ds.entities.map(function (e) { return e.id; }), ['alpha', 'rest'], id + ': Region A, then the rest');
        a.equal(ds.entities[1].how, 'average', id + ': the rest as an average');
      });
    });

    T.test('TPV-TC-758', 'Once defined, the two reports are mounted on the profile with the region against the rest', function (a) {
      var saved = {}, base = TAP.reports.get('ov-ambition');
      ['ol-strategic', 'ol-revenue'].forEach(function (id) {
        saved[id] = window.TAP_REPORTS[id];
        if (!saved[id]) window.TAP_REPORTS[id] = Object.assign({}, base, { id: id, view: 'outlook' });   // a stand-in while OUTLOOK builds it
      });
      var real = TAP.viewHead.mountPanel, seen = [];
      TAP.viewHead.mountPanel = function (slot, id, opts) { seen.push({ id: id, opts: opts || {} }); return null; };
      try {
        mountProfile('alpha').handle.destroy();
      } finally {
        TAP.viewHead.mountPanel = real;
        TAP.store.set({ region: null });
        Object.keys(saved).forEach(function (id) { if (!saved[id]) delete window.TAP_REPORTS[id]; });
      }
      ['ol-strategic', 'ol-revenue'].forEach(function (id) {
        var p = seen.filter(function (x) { return x.id === id; })[0];
        a.ok(p, id + ' is mounted');
        a.deepEqual(p && p.opts.cmp, TAP.profile.cmp('alpha'), id + ': Region A against the average of the rest');
      });
    });

    T.test('TPV-TC-759', 'The starter running order has two steps from the Outlook view', function (a) {
      var outlook = window.TAP_VIEWS.outlook.reports;
      var steps = window.TAP_RUNNING_ORDER.steps.filter(function (s) { return s && outlook.indexOf(s.report) >= 0; });
      a.equal(steps.length, 2, 'two Outlook steps');
      steps.forEach(function (s) {
        a.ok(s.title && s.title.length > 10, s.report + ': a title for the progress row');
        a.ok(!s.cmp || ['all', 'one', 'pair', 'set', 'org'].indexOf(s.cmp.mode) >= 0, s.report + ': a known comparison');
      });
      a.deepEqual(steps.map(function (s) { return s.report; }), ['ol-strategic', 'ol-revenue'], 'the strategic plan, then the revenue outlook');
    });

    (function () {
      var title = 'On the sample data, the starter running order is checked and neither Outlook step is skipped';
      if (!TAP.reports.get('ol-strategic') || !TAP.reports.get('ol-revenue')) {
        T.skip('TPV-TC-759', title, 'pending: the Outlook reports are still being built (OUTLOOK stream)');
        return;
      }
      T.test('TPV-TC-759', title, function (a) {
        TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        try {
          var steps = window.TAP_RUNNING_ORDER.steps, res = TAP.present.check(steps);
          var at = steps.map(function (s, i) { return s && /^ol-/.test(s.report) ? i : -1; }).filter(function (i) { return i >= 0; });
          a.equal(at.length, 2, 'two Outlook steps');
          a.deepEqual(res.skipped, [], 'no step is skipped');
          at.forEach(function (i) { a.ok(res.ok.some(function (o) { return o.index === i; }), 'step ' + (i + 1) + ' is ready to show'); });
        } finally { TAP.notes.clear('presentation'); TAP.data.load(T_FIXTURE('mini')); }
      });
    })();

    // Where each workbook sheet shows: every chart the Guide names exists with that exact title
    T.test('X-p4-guide-sheets', 'The Guide names each sheet of the workbook and the exact charts that show it', function (a) {
      var sec = window.TAP_CONTENT.guide.planning.sections.filter(function (x) { return x.id === 'sheets'; })[0];
      a.ok(sec, 'the Guide has the section');
      var text = (sec ? sec.paragraphs : []).join(' ');
      ['Market coverage', 'New business', 'Customer growth', 'Partner', 'Recap', 'Order intake'].forEach(function (w) {
        a.ok(text.indexOf(w) >= 0, 'names the ' + w + ' sheet');
      });
      ['ov-ambition', 'nb-channels', 'pt-reliance', 'pt-capacity', 'ol-strategic', 'ol-revenue', 'ol-revshare', 'pt-books', 'ol-category', 'pt-routes',
        'ol-baseyear', 'ol-coverage'].forEach(function (id) {
        var def = TAP.reports.get(id);
        a.ok(def && text.indexOf(def.title) >= 0, id + ' is named by its title: ' + (def ? def.title : 'missing'));
      });
    });
  });
})(window.TAP);
