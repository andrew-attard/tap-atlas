/*
 * File: tests/test-custom-picker.js
 * Purpose: Tests for the Build a chart measure picker (D122, US-3.5.1): topics, each topic's short list of key
 *          measures, "Show all", the search box, and a chosen measure staying selected and in view.
 * Provides: test cases X-d122-measure-picker
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, config/custom-topics.js, the sample data
 * Used by: tests.html
 * Owner: CUSTOM stream
 */
(function (TAP) {
  'use strict';

  var ID = 'X-d122-measure-picker';
  // The six topics, named after the menu (D122)
  var NAMES = { ambition: 'Ambition', coverage: 'Market coverage', newBusiness: 'New business', customers: 'Customer growth',
    partners: 'Partners', outlook: 'Outlook' };
  // Every New business option on the sample data, counted by hand from the catalogue: ARR, services and order intake
  // potential (3), target accounts, rated target accounts, implied wins (3), hit rate, deal size, growth years 2 and 3,
  // services ratio (5), the Tier 1 and Tier 2 copies (6) and the copies across solutions (3).
  var NB_ALL = 20;

  function qs(sel, root) { return TAP.dom.qs(sel, root); }
  function qsa(sel, root) { return TAP.dom.qsa(sel, root); }
  function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function click(node) { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }

  // The builder on the sample data, from a known choice; everything is taken down afterwards.
  function onSample(spec, fn) {
    return function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      var host = T.dom.mount(), h = null;
      try {
        h = TAP.customBuilder.render(host, { spec: spec });
        fn(a, host, h);
      } finally {
        if (h) h.destroy();
        Object.keys(window.TAP_REPORTS).forEach(function (id) { if (/^custom:/.test(id)) delete window.TAP_REPORTS[id]; });
        TAP.data.load(window.T_FIXTURE('mini'));
      }
    };
  }
  function topicBtns(host) { return qsa('[data-control="custom-topic"] button', host); }
  function topic(host, id) { click(qs('[data-control="custom-topic"] button[data-value="' + id + '"]', host)); }
  function pressed(host) { var b = qs('[data-control="custom-topic"] [aria-pressed="true"]', host); return b && b.getAttribute('data-value'); }
  function radios(host) { return qsa('input[type="radio"][data-custom="measure"]', host).map(function (r) { return r.value; }); }
  function radio(host, id) { return qs('input[type="radio"][data-custom="measure"][value="' + id + '"]', host); }
  function find(host, words) {
    var box = qs('input[data-custom="find"]', host);
    box.value = words;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // A measure's topic straight from the config: the topic naming it in ids, else the one holding its id prefix.
  function topicsOf(id) {
    var named = window.TAP_CUSTOM_TOPICS.filter(function (t) { return t.ids.indexOf(id) >= 0; });
    if (named.length) return named.map(function (t) { return t.id; });
    var pre = id.split('.')[0];
    return window.TAP_CUSTOM_TOPICS.filter(function (t) { return t.prefixes.indexOf(pre) >= 0; }).map(function (t) { return t.id; });
  }

  T.suite('custom-picker', function () {

    T.test(ID, 'Every offered measure is in exactly one topic, on the sample data and on the mini fixture', function (a) {
      var cfg = window.TAP_CUSTOM_TOPICS, seen = {};
      a.deepEqual(cfg.map(function (t) { return t.id; }), Object.keys(NAMES), 'six topics, in the menu’s order');
      cfg.forEach(function (t) {
        t.prefixes.concat(t.ids).forEach(function (p) { a.ok(!seen[p], p + ' sits in one topic only'); seen[p] = true; });
        a.equal(TAP.content.text('custom.topics.' + t.id), NAMES[t.id], 'named ' + NAMES[t.id]);
      });
      [JSON.parse(JSON.stringify(window.PLAN_DATA)), window.T_FIXTURE('mini')].forEach(function (plan, n) {
        TAP.data.load(plan);
        var opts = TAP.custom.options();
        a.ok(opts.length > 50, 'measures offered (' + opts.length + ')');
        opts.forEach(function (o) {
          var in1 = topicsOf(o.measureId);
          a.equal(in1.length, 1, o.measureId + ' is in one topic: ' + in1.join(', '));
          a.equal(TAP.customPicker.topicOf(o.measureId), in1[0], o.measureId + ': the picker agrees');
        });
        if (n === 0) a.equal(opts.length, 172, 'the sample data offers 172 measures');
      });
      TAP.data.load(window.T_FIXTURE('mini'));
    });

    T.test(ID, 'Each topic shows its key measures by default: those that fit the question, in the config’s order', onSample({ measure: 'nb.hitRate', by: 'entity' }, function (a, host) {
      var ids = TAP.custom.options().map(function (o) { return o.measureId; });
      // Compare regions (D140): a key measure with a region total; the per-industry ratings wait for "Break one region down"
      var fits = function (id) { var o = TAP.custom.options().filter(function (x) { return x.measureId === id; })[0]; return !!o && o.by.indexOf('entity') >= 0; };
      a.deepEqual(topicBtns(host).map(txt), Object.keys(NAMES).map(function (k) { return NAMES[k]; }), 'the six topic buttons');
      a.equal(pressed(host), 'newBusiness', 'the current measure’s topic is chosen');
      window.TAP_CUSTOM_TOPICS.forEach(function (t) {
        topic(host, t.id);
        a.equal(pressed(host), t.id, t.id + ' pressed');
        var shown = radios(host), key = t.key.filter(fits);
        a.ok(t.key.length >= 5 && t.key.length <= 10, t.id + ': 5 to 10 key measures in the config (' + t.key.length + ')');
        a.ok(shown.length >= 4 && shown.length <= 10, t.id + ': a short list on screen (' + shown.length + ')');
        a.deepEqual(shown, key, t.id + ': the key list that fits the question, in order');
        shown.forEach(function (id) { a.ok(ids.indexOf(id) >= 0, id + ' is an offered measure'); });
        // Each row names the measure and its kind of value, in words beside it
        shown.forEach(function (id) {
          var row = radio(host, id).closest('label');
          a.ok(/\S/.test(txt(qs('.tap-custom__name', row))) && /\S/.test(txt(qs('.tap-custom__kind', row))), id + ': name and kind of value');
        });
      });
    }));

    T.test(ID, '"Show all" lists every measure of the topic, A to Z; "Show fewer" goes back to the key list', onSample({ measure: 'nb.hitRate', by: 'entity' }, function (a, host) {
      var more = qs('button[data-action="custom-more"]', host);
      a.equal(more.tagName, 'BUTTON', 'a button, not hover');
      a.equal(txt(more), 'Show all ' + NB_ALL + ' measures in New business');
      click(more);
      var all = radios(host), names = qsa('.tap-custom__name', host).map(txt);
      a.equal(all.length, NB_ALL, 'all ' + NB_ALL + ' New business measures');
      all.forEach(function (id) { a.equal(id.split('.')[0], 'nb', id + ' is New business'); });
      a.deepEqual(names, names.slice().sort(function (x, y) { return x.localeCompare(y); }), 'A to Z');
      a.ok(radio(host, 'nb.hitRate').checked, 'the current measure still selected');
      var fewer = qs('button[data-action="custom-more"]', host);
      a.equal(txt(fewer), 'Show fewer');
      click(fewer);
      a.equal(radios(host).length, window.TAP_CUSTOM_TOPICS[2].key.length, 'back to the key list');
    }));

    T.test(ID, 'Searching "hit rate" finds the hit rate under New business, words in any order; clearing returns to the topic', onSample({ measure: 'cg.arr', by: 'entity' }, function (a, host) {
      var box = qs('input[data-custom="find"]', host);
      a.equal(txt(qs('label[for="' + box.id + '"]', host)), 'Find a measure', 'the search box is labelled');
      find(host, 'hit rate');
      var r = radio(host, 'nb.hitRate');
      a.ok(!!r, 'the hit rate is listed');
      a.equal(txt(qs('.tap-custom__topic', r.closest('.tap-custom__group'))), 'New business', 'under the New business heading');
      qsa('.tap-custom__name', host).forEach(function (n) { a.match(txt(n).toLowerCase(), /hit rate/, 'a match: ' + txt(n)); });
      find(host, 'RATE hit');
      a.ok(!!radio(host, 'nb.hitRate'), 'any order, any case');
      find(host, 'zzzz');
      a.equal(radios(host).length, 0, 'nothing matches');
      a.ok(/\S/.test(txt(qs('.tap-custom__none', host))), 'and says so');
      find(host, '');
      a.equal(qsa('.tap-custom__group', host).length, 0, 'no topic headings once cleared');
      a.equal(pressed(host), 'customers', 'the topic view is back');
      a.ok(radio(host, 'cg.arr').checked, 'with the current measure selected');
    }));

    T.test(ID, 'Picking a measure draws its chart as before, from the topic list and from search results', onSample({ measure: 'nb.hitRate', by: 'entity' }, function (a, host, h) {
      radio(host, 'nb.arr').click();
      a.equal(h.spec().measure, 'nb.arr', 'the choice follows');
      a.equal(qs('.tap-panel', host).getAttribute('data-report'), 'custom:nb.arr:entity', 'the panel is drawn again');
      a.ok(radio(host, 'nb.arr').checked, 'and the radio stays checked');
      find(host, 'pipeline coverage');
      radio(host, 'by.coverage').click();
      a.equal(qs('.tap-panel', host).getAttribute('data-report'), 'custom:by.coverage:entity', 'picked from the search results');
      a.equal(qs('input[data-custom="find"]', host).value, 'pipeline coverage', 'the search stays');
      find(host, '');
      a.equal(pressed(host), 'outlook', 'cleared: the picked measure’s topic');
    }));

    T.test(ID, 'A spec with a measure that is not a key one opens on its topic with the measure shown and selected', onSample({ measure: 'cg.seg.core.oi', by: 'entity', type: 'bar' }, function (a, host, h) {
      a.equal(h.spec().measure, 'cg.seg.core.oi');
      a.equal(pressed(host), 'customers', 'Customer growth chosen');
      var r = radio(host, 'cg.seg.core.oi');
      a.ok(!!r && r.checked, 'the measure is in view and selected');
      a.equal(radios(host)[0], 'cg.seg.core.oi', 'at the top of the short list');
      a.equal(radios(host).length, window.TAP_CUSTOM_TOPICS[3].key.length + 1, 'with the key list after it');
    }));

    T.test(ID, 'Keyboard: arrow keys move along the topics; the radios are one group; a topic with no data is hidden', onSample({ measure: 'nb.hitRate', by: 'entity' }, function (a, host) {
      var btns = topicBtns(host);
      btns[0].focus();
      btns[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      a.equal(document.activeElement, btns[1], 'Right moves to the next topic');
      btns[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      a.equal(document.activeElement, btns[0], 'Left moves back');
      var names = qsa('input[type="radio"][data-custom="measure"]', host).map(function (r) { return r.name; });
      a.ok(names.length > 0 && names.every(function (n) { return n && n === names[0]; }), 'one radio group, so arrows move between measures');
      // The mini fixture has no Outlook figures: that topic is left out
      TAP.data.load(window.T_FIXTURE('mini'));
      var host2 = T.dom.mount(), h2 = TAP.customBuilder.render(host2, { spec: { measure: 'nb.hitRate', by: 'entity' } });
      try {
        var shown = topicBtns(host2).map(function (b) { return b.getAttribute('data-value'); });
        a.ok(shown.indexOf('outlook') < 0, 'no Outlook topic without Outlook data');
        a.ok(shown.indexOf('newBusiness') >= 0 && shown.length === 5, 'the other five are there');
      } finally { h2.destroy(); }
    }));
  });
})(window.TAP);
