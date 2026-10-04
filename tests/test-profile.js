/*
 * File: tests/test-profile.js
 * Purpose: Tests for the Regions view: the region picker and one region's profile against the average of the rest
 *          (Epic 2.4).
 * Provides: test cases TPV-TC-434 to TPV-TC-458 (automated ones) and X-profile-*
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures (mini, sample)
 * Used by: tests.html
 * Owner: PROFILE stream
 */
(function (TAP) {
  'use strict';

  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var MINI = ['alpha', 'bravo', 'charlie', 'delta'];

  function view() { return TAP.views.get('regions'); }
  // Mounts the Regions view on its own, with state.region set first. Returns {root, handle}.
  function mountFor(regionId) {
    TAP.store.set({ view: 'regions', region: regionId || null });
    var root = T.dom.mount();
    return { root: root, handle: view().mount(root) };
  }

  // The whole app in a sandbox; every test that starts it stops it again (as tests/test-shell.js does).
  function startApp() {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
    return root;
  }
  function stopApp() {
    try { TAP.app.start({ root: T.dom.mount(), plan: null }); } catch (e) { /* screens may be a stub */ }
    TAP.data.load(T_FIXTURE('mini'));
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  function withApp(fn) {
    var out;
    try { out = fn(); } catch (e) { stopApp(); throw e; }
    if (out && out.then) return out.then(function (v) { stopApp(); return v; }, function (e) { stopApp(); throw e; });
    stopApp();
    return out;
  }
  // Sets the address bar and waits for the app to follow it.
  function go(hash) {
    return new Promise(function (resolve, reject) {
      var done = false;
      function on() { if (done) return; done = true; window.removeEventListener('hashchange', on); setTimeout(resolve, 0); }
      window.addEventListener('hashchange', on);
      setTimeout(function () { if (!done) { done = true; window.removeEventListener('hashchange', on); reject(new Error('no hashchange')); } }, 1500);
      window.location.hash = hash;
    });
  }

  // Records the options every profile panel is mounted with, without drawing the panels.
  function spyPanels(fn) {
    var real = TAP.viewHead.mountPanel, seen = [];
    TAP.viewHead.mountPanel = function (slot, id, opts) { seen.push({ id: id, opts: opts || {} }); return null; };
    try { fn(seen); } finally { TAP.viewHead.mountPanel = real; }
    return seen;
  }

  T.suite('profile', function () {
    /* ---------- US-2.4.1: open a region's profile (#214) ---------- */

    T.test('TPV-TC-434', 'Regions is in the menu; with no region chosen, a list of regions shows and none is preselected', function (a) {
      a.ok(window.TAP_VIEWS.order.indexOf('regions') >= 0, 'regions is in the menu order');
      a.equal(TAP.views.title('regions'), 'Regions', 'menu title');
      a.ok(view() && !view().__stub, 'the view is built');
      var m = mountFor(null);
      try {
        var items = qsa('[data-pick-region]', m.root);
        a.deepEqual(items.map(function (b) { return b.getAttribute('data-pick-region'); }), MINI, 'one entry per region, in file order');
        a.equal(qsa('[aria-current], .is-current', m.root).length, 0, 'no region is preselected');
        a.ok(!qs('.tap-pf', m.root), 'no profile without a region');
        a.equal(items[1].getAttribute('href'), '#regions/bravo', 'each entry points to the region\'s address');
      } finally { m.handle.destroy(); }
    });

    T.test('TPV-TC-434', 'The route #regions with no id shows the list of regions', function (a) {
      return withApp(function () {
        var root = startApp();
        return go('#regions').then(function () {
          a.equal(TAP.store.get().view, 'regions', 'the Regions view is open');
          a.equal(TAP.store.get().region, null, 'no region chosen');
          a.equal(qsa('[data-pick-region]', root).length, 4, 'the list of regions shows');
          a.ok(!qs('.tap-pf', root), 'no profile');
        });
      });
    });

    T.test('X-profile-pick', 'Picking a region from the list opens its profile', function (a) {
      var m = mountFor(null);
      try {
        qs('[data-pick-region="charlie"]', m.root).click();
        a.equal(TAP.store.get().region, 'charlie', 'state.region set');
        a.equal(txt(qs('.tap-pf h1', m.root)), 'Region C', 'the profile shows the picked region');
      } finally { m.handle.destroy(); }
    });

    T.test('TPV-TC-436', 'The region picker on the profile switches the region and its content', function (a) {
      var m = mountFor('alpha');
      try {
        a.equal(txt(qs('.tap-pf h1', m.root)), 'Region A', 'opens on Region A');
        var sel = qs('select[data-control="region"]', m.root);
        a.ok(sel, 'a region picker at the top of the profile');
        a.equal(sel.value, 'alpha', 'the picker shows the region on screen');
        sel.value = 'bravo';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        a.equal(TAP.store.get().region, 'bravo', 'state.region follows the picker');
        a.equal(txt(qs('.tap-pf h1', m.root)), 'Region B', 'the content changes to Region B');
      } finally { m.handle.destroy(); }
    });

    T.test('TPV-TC-436', 'The address bar follows the picker', function (a) {
      return withApp(function () {
        var root = startApp();
        TAP.store.set({ view: 'regions', region: 'alpha' });
        var sel = qs('select[data-control="region"]', root);
        sel.value = 'delta';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        a.equal(window.location.hash, '#regions/delta', 'the route names the new region');
        a.equal(txt(qs('.tap-pf h1', root)), 'Region D', 'the profile shows it');
      });
    });

    T.test('TPV-TC-437', 'The details for one region offer "Open profile" pointing to #regions/<id>', function (a) {
      MINI.forEach(function (id) {
        var acts = TAP.details.build({ regionIds: [id] }).actions || [];
        var open = acts.filter(function (x) { return x.id === 'openProfile'; })[0];
        a.ok(open, id + ': an Open profile action');
        a.equal(open && open.label, 'Open profile', id + ': its words');
        a.equal(open && open.href, '#regions/' + id, id + ': its address');
      });
      var ind = TAP.details.build({ regionIds: ['alpha'], industryIds: ['ind1'] }).actions || [];
      a.ok(ind.some(function (x) { return x.href === '#regions/alpha'; }), 'region and industry details offer it too');
      var many = TAP.details.build({ regionIds: ['alpha', 'bravo'] }).actions || [];
      a.equal(many.length, 0, 'details for several regions name no single profile');
    });

    T.test('TPV-TC-437', 'Each Overview region card offers "Open profile" pointing to #regions/<id>', function (a) {
      var host = T.dom.mount();
      TAP.overviewCards.render(host);
      MINI.forEach(function (id) {
        var link = qs('.tap-ov-card[data-entity="' + id + '"] [data-action="open-profile"]', host);
        a.ok(link, id + ': the card offers Open profile');
        a.equal(link && txt(link), 'Open profile', id + ': its words');
        a.equal(link && link.getAttribute('href'), '#regions/' + id, id + ': its address');
      });
      TAP.store.set({ cmp: { mode: 'one', focus: 'alpha', restAs: 'combined', restAgg: 'average' } });
      TAP.overviewCards.render(host);
      a.ok(!qs('.tap-ov-card[data-entity="rest"] [data-action="open-profile"]', host), 'a combined card has no profile');
    });

    T.test('X-profile-card-link', 'Open profile on a card opens the profile, not the card\'s details', function (a) {
      var host = T.dom.mount();
      TAP.overviewCards.render(host);
      qs('.tap-ov-card[data-entity="bravo"] [data-action="open-profile"]', host).click();
      var s = TAP.store.get();
      a.equal(s.view, 'regions', 'the Regions view');
      a.equal(s.region, 'bravo', 'for that region');
      a.equal(s.layer, null, 'the card\'s details did not open');
    });

    T.test('TPV-TC-439', 'The route #regions/<id> opens that profile; an unknown id shows the list', function (a) {
      return withApp(function () {
        var root = startApp();
        return go('#regions/bravo').then(function () {
          a.equal(TAP.store.get().region, 'bravo', 'state.region from the route');
          a.equal(txt(qs('.tap-pf h1', root)), 'Region B', 'Region B\'s profile is open');
          return go('#regions/nowhere');
        }).then(function () {
          a.ok(!qs('.tap-pf', root), 'no profile for an unknown region');
          a.equal(qsa('[data-pick-region]', root).length, 4, 'the list of regions shows instead');
        });
      });
    });

    T.test('TPV-TC-441', 'The profile compares the region with the average of the rest; the shared comparison is unchanged', function (a) {
      var shared = { mode: 'set', focus: null, second: null, set: ['alpha', 'bravo', 'charlie'], restAs: 'combined', restAgg: 'average' };
      TAP.store.set({ cmp: shared });
      var before = JSON.stringify(TAP.store.get().cmp), m;
      var seen = spyPanels(function () { m = mountFor('bravo'); m.handle.destroy(); });
      a.ok(seen.length > 0, 'the profile mounted ' + seen.length + ' panels');
      seen.forEach(function (s) {
        var ents = TAP.scope.entities(s.opts.cmp || TAP.store.get().cmp);
        a.deepEqual(ents.map(function (e) { return e.id; }), ['bravo', 'rest'], s.id + ': the region, then the rest');
        a.equal(ents[1].how, 'average', s.id + ': the rest as an average');
        a.deepEqual(ents[1].regionIds, ['alpha', 'charlie', 'delta'], s.id + ': the rest is every other region');
      });
      a.equal(JSON.stringify(TAP.store.get().cmp), before, 'the shared comparison is unchanged after leaving');
      a.deepEqual(TAP.scope.entities(TAP.profile.cmp('bravo')).map(function (e) { return e.role; }), ['focus', 'combined'], 'TAP.profile.cmp');
    });

    // Real panels: every comparison they draw with is the profile's own, never the shared one
    T.test('TPV-TC-441', 'The panels on the profile draw the region against the average of the rest', function (a) {
      TAP.store.set({ cmp: { mode: 'set', set: ['alpha', 'bravo', 'charlie'] } });
      var real = TAP.scope.entities, used = [], m;
      TAP.scope.entities = function (c) { used.push(c); return real.apply(TAP.scope, arguments); };
      try { m = mountFor('delta'); } finally { TAP.scope.entities = real; }
      try {
        a.ok(qsa('.tap-panel', m.root).length > 0, 'panels drawn');
        a.ok(used.length > 0, 'the panels asked for their entities');
        a.equal(used.filter(function (c) { return !c || c.mode !== 'one' || c.focus !== 'delta'; }).length, 0,
          'every panel used the profile comparison');
      } finally { m.handle.destroy(); }
    });

    T.test('TPV-TC-441', 'Leaving the profile for another view keeps the shared comparison', function (a) {
      return withApp(function () {
        startApp();
        TAP.store.set({ cmp: { mode: 'set', set: ['alpha', 'bravo', 'charlie'] } });
        var before = JSON.stringify(TAP.store.get().cmp);
        TAP.store.set({ view: 'regions', region: 'delta' });
        TAP.store.set({ view: 'overview' });
        a.equal(JSON.stringify(TAP.store.get().cmp), before, 'state.cmp as it was');
      });
    });

    /* ---------- US-2.4.2: the plan at a glance against the rest (#215) ---------- */

    // Hand-calculated from the mini fixture: Region A against the average of B, C and D (C has no customer growth).
    var ALPHA = {
      ambition: { 'amb.arr': [2555, 2592.3333333], 'nb.arr': [2255, 2383.3333333], 'cg.arr': [300, 209] },  // 209 = (150 + 268) / 2
      focus: { 'focus.tier1': [1, 1], 'focus.tier2': [2, 1.6666667] },                                      // (2 + 1 + 2) / 3
      pool: { 'nb.targetAccounts': [30, 55] },                                                            // (50 + 15 + 100) / 3
      customers: { 'cg.segment.strategic': [1, 1], 'cg.segment.growth': [1, 0], 'cg.segment.core': [1, 1], 'cg.segment.scaled': [1, 0.5] }
    };
    function lineOf(lines, key) { return lines.filter(function (l) { return l.key === key; })[0]; }
    function figOf(line, id) { return ((line || {}).figures || []).filter(function (f) { return f.measure === id; })[0]; }
    function parts() { return TAP.profileParts; }

    T.test('TPV-TC-443', 'The four card lines show the region and the average of the rest, as worked out by hand', function (a) {
      var lines = parts().glance('alpha');
      a.deepEqual(lines.map(function (l) { return l.key; }), ['ambition', 'focus', 'pool', 'customers'], 'the four lines, in card order');
      Object.keys(ALPHA).forEach(function (key) {
        Object.keys(ALPHA[key]).forEach(function (id) {
          var f = figOf(lineOf(lines, key), id), want = ALPHA[key][id];
          a.ok(f, key + ' shows ' + id);
          if (!f) return;
          a.near(f.region.v, want[0], 1e-6, id + ': Region A');
          a.near(f.rest.v, want[1], 1e-6, id + ': average of the rest');
        });
      });
      var c = figOf(lineOf(lines, 'customers'), 'cg.segment.strategic');
      a.deepEqual(c.rest.src.excluded, ['charlie'], 'the rest leaves out Region C, which has no customer growth');
    });

    T.test('X-profile-glance-drawn', 'The glance draws each figure with its value and the average of the rest', function (a) {
      var m = mountFor('alpha');
      try {
        var box = qs('.tap-pf-glance', m.root);
        a.ok(box, 'the glance is on the profile');
        a.equal(qsa('.tap-pf-glance__line', box).length, 4, 'four lines');
        var row = qs('[data-measure="nb.targetAccounts"]', box);
        a.equal(txt(qs('[data-part="region"]', row)), '30', 'Region A\'s target accounts');
        a.equal(txt(qs('[data-part="rest"]', row)), '55', 'the average of the rest');
        a.equal(txt(qs('[data-part="compare"]', row)), TAP.content.text('profile.glance.below'), 'the neutral comparison');
      } finally { m.handle.destroy(); }
    });

    T.test('TPV-TC-445', 'Above, below and equal use the neutral phrases from the content file, with no banned word', function (a) {
      var cell = function (v) { return { v: v, state: 'value', kind: 'APP' }; };
      var cases = [[cell(5), cell(3), 'above'], [cell(2), cell(3), 'below'], [cell(3), cell(3), 'same'], [cell(1 / 3), cell(0.3333333333333), 'same']];
      var banned = (window.TAP_RULES.wording || {}).banned || [];
      cases.forEach(function (c) {
        var r = parts().compare(c[0], c[1]);
        a.equal(r.key, c[2], c[0].v + ' against ' + c[1].v);
        a.equal(r.text, TAP.content.text('profile.glance.' + c[2]), 'the phrase comes from the content file');
        banned.forEach(function (w) { a.ok(!new RegExp('\\b' + w + '\\b', 'i').test(r.text), '"' + r.text + '" avoids "' + w + '"'); });
        a.ok(!/\b(good|bad|better|worse)\b/i.test(r.text), 'no judgement in "' + r.text + '"');
      });
      a.equal(TAP.content.text('profile.glance.above'), 'above the average of the rest', 'the agreed wording');
      a.equal(parts().compare({ v: null, state: 'notProvided' }, cell(3)).key, null, 'no comparison with a value not provided');
    });

    T.test('TPV-TC-447', 'Every figure on the card lines has a source and a details target', function (a) {
      var n = 0;
      parts().glance('alpha').forEach(function (l) {
        l.figures.forEach(function (f) {
          a.ok(f.region.src, f.measure + ': the region\'s figure has a source');
          a.ok(f.rest.src && f.rest.src.combined, f.measure + ': the average has a combined source');
          a.deepEqual(f.target && f.target.regionIds, ['alpha'], f.measure + ': opens the region\'s details');
          a.deepEqual(f.restTarget && f.restTarget.regionIds, ['bravo', 'charlie', 'delta'], f.measure + ': the average names its regions');
          n++;
        });
      });
      a.ok(n >= 10, n + ' figures checked');
    });

    T.test('X-profile-glance-click', 'A figure on the glance opens the region\'s details', function (a) {
      var m = mountFor('alpha');
      try {
        qs('.tap-pf-glance [data-measure="amb.arr"] [data-part="region"]', m.root).click();
        var l = TAP.store.get().layer;
        a.equal(l && l.name, 'details', 'the details panel opened');
        a.deepEqual(l && l.payload.target.regionIds, ['alpha'], 'for Region A');
      } finally { m.handle.destroy(); TAP.layers.close(); }
    });

    T.test('TPV-TC-448', 'The region with an empty customer growth section reads "not provided" on its customers line', function (a) {
      var line = lineOf(parts().glance('charlie'), 'customers');
      a.ok(line.np, 'the customers line is marked not provided');
      line.figures.forEach(function (f) { a.equal(f.region.state, 'notProvided', f.measure + ': not provided'); });
      var m = mountFor('charlie');
      try {
        var el = qs('.tap-pf-glance__line[data-line="customers"]', m.root);
        a.match(txt(el), new RegExp(TAP.content.text('states.notProvided'), 'i'), 'the line reads "not provided"');
        a.equal(qsa('[data-part="compare"]', el).filter(function (x) { return txt(x); }).length, 0, 'no comparison where nothing is provided');
      } finally { m.handle.destroy(); }
    });
  });
})(window.TAP);
