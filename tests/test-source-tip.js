/*
 * File: tests/test-source-tip.js
 * Purpose: Tests for the data icon that shows where a figure comes from (D100): one line per figure in the details
 *          panel, the popover's kind and address, hover, click, Esc, and the explanation in the data sources panel
 *          and the Guide. Expected addresses come from SAMPLE_EXPECT and the sample's source map.
 * Provides: test cases X-d100-source-icon
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, data/sample-plan-data.js,
 *             tests/fixtures/sample-expected.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var ID = 'X-d100-source-icon';
  var qs = function (sel, root) { return (root || document).querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  function plan() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }
  function pop() { return qs('.tap-srcpop'); }
  function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }
  function mouse(type, el, related) { el.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: related || null })); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function kindText(k) { var x = window.TAP_THEME.kinds[k]; return x.glyph + ' ' + x.label; }

  // Starts the app on the sample data, runs fn(root) and always stops it again.
  function withApp(fn) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: plan() });
    function done() { if (TAP.sourceTip) TAP.sourceTip.close(); TAP.layers.close(); TAP.app.stop(); }
    var out;
    try { out = fn(root); } catch (e) { done(); throw e; }
    if (out && out.then) return out.then(function (v) { done(); return v; }, function (e) { done(); throw e; });
    done();
    return out;
  }

  // The North America card's name button opens the region's details panel.
  function openNa(root) {
    qs('.tap-ov-card__open', qs('.tap-ov-card[data-entity="na"]', root)).click();
    return qs('.tap-layer[data-layer="details"]');
  }

  // "North America plan.xlsx › 1. Market Coverage › G", read from the sample's source map, not the app.
  function mapStart(regionId, section, field) {
    var p = window.PLAN_DATA, reg = p.regions.filter(function (r) { return r.id === regionId; })[0], map = p.meta.sourceMap[section];
    var col = map.columns[field];
    return reg.source.fileName + ' › ' + map.sheet + ' › ' + (Array.isArray(col) ? col[0] : col);
  }

  // The popover text behind a data icon, for suites that check an address (D100). The icon must be on the page.
  window.T_TIP_TEXT = function (btn) {
    if (!btn) return '';
    btn.click();
    var s = txt(pop());
    if (TAP.sourceTip) TAP.sourceTip.close();
    return s;
  };

  T.suite('source-tip', function () {

    T.test(ID, 'The shared module provides the icon, its HTML, the popover and close', function (a) {
      ['where', 'icon', 'html', 'open', 'close', 'current'].forEach(function (f) {
        a.equal(typeof (TAP.sourceTip || {})[f], 'function', 'TAP.sourceTip.' + f);
      });
    });

    T.test(ID, 'Details from an Overview card: one line per figure, with a data icon and no address as text', function (a) {
      withApp(function (root) {
        var panel = openNa(root);
        a.ok(!!panel, 'the details panel opened');
        var built = TAP.details.build({ regionIds: ['na'] }), rows = [];
        built.groups.forEach(function (g) { rows = rows.concat(g.rows); });
        var dom = qsa('.tap-details__row', panel);
        a.equal(dom.length, rows.length, 'one row per figure');
        a.equal(qsa('.tap-details__src', panel).length, 0, 'no second line naming the kind and the address');
        a.ok(txt(panel).indexOf('›') < 0 && txt(panel).indexOf('.xlsx') < 0, 'no file › sheet › cell as text');
        var withFile = 0;
        rows.forEach(function (r, i) {
          var row = dom[i], tip = row && qs('.tap-srctip', row), src = r.cell && r.cell.src;
          var hasFile = !!(src && !src.combined && src.regionId);
          if (hasFile) withFile++;
          a.equal(!!tip, hasFile, r.label + (hasFile ? ': a data icon' : ': no icon without a file'));
          if (!tip) return;
          var v = qs('.tap-details__value', row).getBoundingClientRect(), b = tip.getBoundingClientRect();
          a.ok(b.top < v.bottom && b.bottom > v.top, r.label + ': the icon sits on the value’s line');
          a.ok(b.width >= 24 && b.height >= 24, r.label + ': a hit area of at least 24 px');
          a.ok(/Where this comes from/.test(tip.getAttribute('aria-label')), r.label + ': named for screen readers');
        });
        a.ok(withFile >= 5, 'most figures have a file behind them (' + withFile + ')');
      });
    });

    T.test(ID, 'Clicking an icon shows the kind and the full address; Esc closes it, then the panel', function (a) {
      withApp(function (root) {
        var panel = openNa(root);
        var built = TAP.details.build({ regionIds: ['na'] }), rows = [];
        built.groups.forEach(function (g) { rows = rows.concat(g.rows); });
        var i = -1;
        rows.forEach(function (r, n) { var s = r.cell && r.cell.src; if (i < 0 && s && s.section === 'marketCoverage' && s.field === 'currentArr') i = n; });
        a.ok(i >= 0, 'the details list current ARR');
        var tip = qs('.tap-srctip', qsa('.tap-details__row', panel)[i]);
        tip.click();
        var p = pop();
        a.ok(!!p, 'a popover opens');
        a.equal(tip.getAttribute('aria-expanded'), 'true', 'the icon says it is open');
        a.ok(txt(p).indexOf(kindText('PRE')) >= 0, 'the kind in words with its symbol: ' + txt(p));
        a.ok(txt(p).indexOf(mapStart('na', 'marketCoverage', 'currentArr')) >= 0, 'file › sheet › column from the source map: ' + txt(p));
        a.match(txt(p), /› G\d+(:G\d+)?/, 'the cell or range');
        a.equal(getComputedStyle(qs('.tap-srcpop__where', p)).fontSize, '16px', '16 px text (D24)');
        mouse('mouseout', tip, document.body);
        a.ok(!!pop(), 'a clicked popover stays open when the pointer leaves');
        esc();
        a.equal(pop(), null, 'Esc closes the popover');
        a.equal(TAP.layers.top(), 'details', 'and leaves the panel open');
        esc();
        a.equal(TAP.layers.top(), null, 'the next Esc closes the panel');
      });
    });

    T.test(ID, 'Hovering an icon shows the popover; leaving it closes it; only one is open at a time', function (a) {
      return withApp(function (root) {
        var tips = qsa('.tap-srctip', openNa(root));
        mouse('mouseover', tips[0]);
        a.ok(!!pop(), 'hover shows it');
        mouse('mouseover', tips[1]);
        a.equal(qsa('.tap-srcpop').length, 1, 'one popover at a time');
        a.equal(tips[0].getAttribute('aria-expanded'), 'false', 'the first icon closed');
        mouse('mouseout', tips[1], document.body);
        return wait(500).then(function () {
          a.equal(pop(), null, 'leaving the icon closes a hovered popover');
          tips[1].click();
          tips[0].click();
          a.equal(qsa('.tap-srcpop').length, 1, 'clicking another icon swaps the popover');
          qs('.tap-srcpop__close').click();
          a.equal(pop(), null, 'the close button closes it');
        });
      });
    });

    T.test(ID, 'The popover reads the address the sample generator wrote, for every kind', function (a) {
      TAP.data.load(plan());
      var host = T.dom.mount();
      try {
        window.SAMPLE_EXPECT.sources.forEach(function (x) {
          var tip = TAP.sourceTip.icon(x.src, x.src.kind);
          host.appendChild(tip);
          tip.click();
          a.ok(txt(pop()).indexOf(x.text) >= 0, x.text);
          a.ok(txt(pop()).indexOf(kindText(x.src.kind)) >= 0, x.text + ': ' + kindText(x.src.kind));
        });
      } finally { TAP.sourceTip.close(); }
    });

    T.test(ID, 'A figure with no address has no icon, in the module and in a details row', function (a) {
      a.equal(TAP.sourceTip.icon(null, 'APP'), null, 'no source: no icon');
      a.equal(TAP.sourceTip.html(null, 'APP'), '', 'no source: no HTML');
      var combined = { combined: true, how: 'sum', regionIds: ['alpha', 'bravo'], excluded: [] };
      a.equal(TAP.sourceTip.icon(combined, 'APP'), null, 'combined by this app: no file, no icon');
      withApp(function () {
        var saved = TAP.details;
        TAP.details = { build: function () {
          return { title: 'Region A', groups: [{ title: 'Plan', rows: [
            { label: 'Worked out here', cell: { v: 3, state: 'value', kind: 'APP', src: null }, unit: 'count' },
            { label: 'Read from the file', cell: { v: 5, state: 'value', kind: 'IN', src: { regionId: 'na', section: 'newBusiness', field: 'targetAccounts', row: 15, kind: 'IN' } }, unit: 'count' }
          ] }] };
        } };
        try {
          TAP.layers.openDetails({ regionIds: ['na'] });
          var rows = qsa('.tap-layer .tap-details__row');
          a.equal(qs('.tap-srctip', rows[0]), null, 'no icon without an address');
          a.ok(txt(rows[0]).indexOf(window.TAP_THEME.kinds.APP.label) < 0, 'and no kind line either');
          a.ok(!!qs('.tap-srctip', rows[1]), 'an icon with one');
        } finally { TAP.details = saved; }
      });
    });

    T.test(ID, 'Region profile: the glance figures name no address; its words carry the data icon instead', function (a) {
      TAP.data.load(plan());
      TAP.store.set({ view: 'regions', region: 'na' });
      var root = T.dom.mount(), handle = TAP.views.get('regions').mount(root);
      try {
        var figs = qsa('.tap-pf-glance__fig', root);
        a.ok(figs.length > 0, 'the plan at a glance has figures');
        figs.forEach(function (f) { a.ok(String(f.getAttribute('title') || '').indexOf('.xlsx') < 0, 'no address in the title: ' + f.getAttribute('title')); });
        var words = qsa('.tap-pf-word', root);
        a.ok(words.length > 0, 'the words panel lists entries');
        words.forEach(function (w, i) {
          a.ok(txt(w).indexOf('.xlsx') < 0, 'entry ' + i + ': no address as text');
          a.ok(!!qs('.tap-srctip', w), 'entry ' + i + ': a data icon');
        });
        var tip = window.T_TIP_TEXT(qs('.tap-srctip', words[0])), map = window.PLAN_DATA.meta.sourceMap;
        var file = window.PLAN_DATA.regions.filter(function (r) { return r.id === 'na'; })[0].source.fileName;
        a.ok(tip.indexOf(file + ' › ') > 0, 'the file: ' + tip);
        a.ok(tip.indexOf(map.marketCoverage.sheet) > 0 || tip.indexOf(map.newBusiness.sheet) > 0, 'the sheet: ' + tip);
        a.ok(tip.indexOf(kindText('IN')) === 0, 'a leader input');
      } finally { handle.destroy(); TAP.sourceTip.close(); }
    });

    T.test(ID, 'The data sources panel explains the data icon, with the icon drawn before the sentence', function (a) {
      withApp(function () {
        TAP.layers.open('sources');
        var how = qs('.tap-layer[data-layer="sources"] .tap-src__how');
        a.ok(!!how, 'an explanation near the top');
        a.ok(!!qs('svg', how), 'the data icon drawn inline');
        a.match(txt(how), /data icon/, 'names the data icon');
        a.match(txt(how), /file, sheet and cells/, 'says what it shows');
        var kids = Array.prototype.slice.call(qs('.tap-layer[data-layer="sources"] .tap-layer__body').children), at = kids.indexOf(how);
        a.ok(at >= 0 && at <= 3, 'near the top of the panel, before the regions (position ' + at + ')');
      });
    });

    T.test(ID, 'The Guide explains the data icon where it says where figures come from', function (a) {
      var sec = TAP.content.guide().howTo.sections.filter(function (s) { return s.id === 'sources'; })[0];
      a.ok(!!sec, 'the Guide has its "Where figures come from" section');
      var all = sec.paragraphs.join(' ');
      a.match(all, /data icon/, 'names the data icon');
      a.ok(!/Tooltips and table rows show the address/.test(all), 'no longer says the address shows in table rows');
    });
  });
})(window.TAP);
