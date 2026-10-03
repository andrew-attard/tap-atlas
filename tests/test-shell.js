/*
 * File: tests/test-shell.js
 * Purpose: Tests for the page frame, menu, comparison bar, banners, side panels and system screens.
 * Provides: test cases for SHELL stories (#2, #3, #4, #6, #9)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts and fixtures
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var qs = function (sel, root) { return root.querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  // Starts the whole app in a sandbox. The app stays subscribed to the store until it is started again,
  // so every test that starts it stops it at the end (stopApp) to keep later tests independent.
  function startApp(plan) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: plan || T_FIXTURE('mini') });
    return root;
  }
  function stopApp() {
    try { TAP.app.start({ root: T.dom.mount(), plan: null }); } catch (e) { /* screens may be a stub */ }
    TAP.data.load(T_FIXTURE('mini'));
  }
  // Runs fn (which may return a promise) and always stops the app afterwards.
  function withApp(fn) {
    var out;
    try { out = fn(); } catch (e) { stopApp(); throw e; }
    if (out && out.then) return out.then(function (v) { stopApp(); return v; }, function (e) { stopApp(); throw e; });
    stopApp();
    return out;
  }

  // Waits for the next hashchange (the back button), or fails after a while.
  function nextHashChange() {
    return new Promise(function (resolve, reject) {
      var done = false;
      function on() { if (done) return; done = true; window.removeEventListener('hashchange', on); resolve(); }
      window.addEventListener('hashchange', on);
      setTimeout(function () { if (!done) { done = true; window.removeEventListener('hashchange', on); reject(new Error('no hashchange')); } }, 1500);
    });
  }

  // Local stand-ins for modules other streams are still building (TAP.scope, TAP.sources). Each is installed
  // only while the real module is a stub, and removed afterwards, so the same tests run against the real ones.
  var FAKES = {
    scope: function () {
      return {
        entities: function () { return []; },
        regionIds: function () { return TAP.data.regions().map(function (r) { return r.id; }); },
        colorOf: function (id) { return TAP_THEME.regionColor(TAP.data.regionIndex(id)); },
        sentence: function (c) { return 'Fake sentence: ' + [c.mode, c.focus, c.second, c.set.join('+'), c.restAs, c.restAgg].join('|'); }
      };
    },
    sources: function () {
      function imports() {
        return TAP.data.regions().map(function (r) {
          return { regionId: r.id, name: r.name, fileName: r.source.fileName, fileModified: r.source.fileModified,
            importedAt: r.source.importedAt, notes: r.source.notes };
        });
      }
      return {
        imports: imports,
        address: function () { return { text: 'fake address', calculated: false, combined: false, regions: [] }; },
        datesDiffer: function () { return imports().some(function (i, k, all) { return i.importedAt.slice(0, 10) !== all[0].importedAt.slice(0, 10); }); },
        dataDate: function () { return imports().map(function (i) { return i.importedAt; }).sort().pop(); }
      };
    }
  };
  function withFakes(fn) {
    var saved = {};
    Object.keys(FAKES).forEach(function (k) { if (TAP[k] && TAP[k].__stub) { saved[k] = TAP[k]; TAP[k] = FAKES[k](); } });
    function restore() { Object.keys(saved).forEach(function (k) { TAP[k] = saved[k]; }); }
    var out;
    try { out = fn(); } catch (e) { restore(); throw e; }
    if (out && out.then) return out.then(function (v) { restore(); return v; }, function (e) { restore(); throw e; });
    restore();
    return out;
  }
  // The app with stand-ins: the usual way the tests below run.
  function run(fn) { return withFakes(function () { return withApp(fn); }); }

  // A 1 x 1 transparent image, so the logo test loads nothing from disk.
  var PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  function settle() { return new Promise(function (resolve) { setTimeout(resolve, 60); }); }

  function menuItems(root) { return qsa('.tap-menu__item', root); }
  function current(root) { return qsa('.tap-menu__item[aria-current="page"]', root).map(function (b) { return b.getAttribute('data-view'); }); }

  /* ---------- US-1.1.2: move between views (#3) ---------- */
  T.suite('shell', function () {
    T.test('TPV-TC-008', 'The menu lists the configured views in order, with their titles', function (a) {
      withApp(function () {
        var root = startApp();
        var ids = menuItems(root).map(function (b) { return b.getAttribute('data-view'); });
        a.deepEqual(ids, TAP.views.order(), 'menu order is TAP.views.order()');
        a.deepEqual(menuItems(root).map(txt), TAP.views.order().map(TAP.views.title), 'titles from TAP.views.title');
        a.deepEqual(menuItems(root).map(txt), ['Overview', 'Industry priorities', 'Insights', 'Guide'], 'Phase 1 views');
      });
    });

    T.test('TPV-TC-007', 'Clicking a menu item changes the view and moves the highlight', function (a) {
      withApp(function () {
        var root = startApp();
        a.deepEqual(current(root), ['overview'], 'Overview is current on opening');
        TAP.views.order().forEach(function (id) {
          qs('.tap-menu__item[data-view="' + id + '"]', root).click();
          a.equal(TAP.store.get().view, id, 'state.view follows the click on ' + id);
          a.equal(TAP.app.current(), id, 'the view on screen is ' + id);
          a.deepEqual(current(root), [id], 'only ' + id + ' is highlighted');
        });
      });
    });

    T.test('TPV-TC-007', 'The view area sits inside the shell, and views mount into it', function (a) {
      withApp(function () {
        var root = startApp();
        var view = TAP.shell.viewEl();
        a.ok(root.contains(view), 'the view element is inside the shell');
        a.ok(view.textContent.indexOf('Overview') >= 0, 'the Overview view mounted into it');
        a.equal(qsa('.tap-menu', view).length, 0, 'the menu is outside the view area');
      });
    });

    T.test('TPV-TC-009', 'The back button returns to the previous views', function (a) {
      return withApp(function () {
        var root = startApp();
        qs('.tap-menu__item[data-view="industry"]', root).click();
        qs('.tap-menu__item[data-view="insights"]', root).click();
        // Let the hash changes from the clicks arrive first, so only the back button's change is awaited
        function back() { return settle().then(function () { var p = nextHashChange(); history.back(); return p; }); }
        return back().then(function () {
          a.equal(TAP.store.get().view, 'industry', 'first back: Industry priorities');
          return back();
        }).then(function () {
          a.equal(TAP.store.get().view, 'overview', 'second back: Overview');
          a.deepEqual(current(root), ['overview'], 'the menu highlight follows the back button');
        });
      });
    });

    T.test('TPV-TC-010', 'The menu fits on one line at 1280 px', function (a) {
      withApp(function () {
        var root = startApp();
        root.style.width = '1280px';
        var items = menuItems(root);
        var tops = items.map(function (b) { return Math.round(b.getBoundingClientRect().top); });
        a.ok(items.length > 0, 'menu drawn');
        a.equal(tops.filter(function (t) { return t !== tops[0]; }).length, 0, 'every item on the same line');
        var nav = qs('.tap-menu', root);
        a.ok(nav.scrollWidth <= nav.clientWidth + 1, 'no overflow');
      });
    });

    T.test('X-shell-current-ink', 'The current menu item is marked in ink, not the accent red', function (a) {
      withApp(function () {
        var root = startApp();
        var cur = qs('.tap-menu__item[aria-current="page"]', root);
        var style = getComputedStyle(cur);
        var probe = document.createElement('span');
        probe.style.color = 'var(--tap-ink)';
        root.appendChild(probe);
        var ink = getComputedStyle(probe).color;
        probe.style.color = 'var(--tap-accent)';
        var accent = getComputedStyle(probe).color;
        a.equal(style.borderBottomColor, ink, 'the bar under the current item is ink');
        a.ok(style.borderBottomColor !== accent, 'not the accent');
        a.ok(Number(style.fontWeight) >= 700, 'bold');
      });
    });

    T.test('X-shell-frame', 'The shell draws the banner slot, top bar, comparison bar slot and view area once', function (a) {
      withApp(function () {
        var root = startApp();
        TAP.shell.mount(root, { warnings: [] });   // drawing again replaces, never duplicates
        ['.tap-banner-slot', '.tap-topbar', '.tap-cmp', '.tap-view'].forEach(function (sel) {
          a.equal(qsa(sel, root).length, 1, sel + ' once');
        });
        a.equal(txt(qs('.tap-topbar__name', root)), TAP.content.text('app.name'), 'app name from content');
      });
    });

    T.test('X-shell-logo', 'The logo slot shows the theme logo, and leaves no gap when there is none', function (a) {
      var saved = TAP_THEME.logo;
      try {
        withApp(function () {
          TAP_THEME.logo = null;
          var root = startApp();
          a.equal(qsa('.tap-topbar__logo', root).length, 0, 'no logo element when the theme has none');
          TAP_THEME.logo = PIXEL;
          TAP.shell.mount(root, { warnings: [] });
          var img = qs('.tap-topbar__logo', root);
          a.ok(img && img.getAttribute('src') === PIXEL, 'logo drawn from TAP_THEME.logo');
        });
      } finally { TAP_THEME.logo = saved; }
    });
  });

  /* ---------- US-1.1.3: set the comparison once for every chart (#4) ---------- */
  function shown(root, sel) { var e = qs(sel, root); return !!e && !e.hidden && !e.closest('[hidden]'); }
  function pickers(root) {
    return ['focus', 'second', 'restAs', 'restAgg', 'set'].filter(function (k) { return shown(root, '[data-picker="' + k + '"]'); });
  }
  function clickMode(root, mode) { qs('.tap-cmp__mode[data-mode="' + mode + '"]', root).click(); }
  function choose(select, value) { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }
  function sentence(root) { return txt(qs('.tap-cmp__sentence', root)); }
  // The combined figure's label from the scope contract (the stand-in has none, so the wording is used).
  function combinedLabel(c) {
    var e = TAP.scope.entities(c).filter(function (x) { return x.kind === 'combined'; })[0];
    return e ? e.label : TAP.content.text('combined.restAverage', { n: 3, regions: TAP.content.text('combined.regions') });
  }
  function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }

  T.suite('compare', function () {
    T.test('TPV-TC-011', 'The app opens on Overview with All regions and no focus, whatever was set before', function (a) {
      run(function () {
        TAP.store.set({ view: 'industry', cmp: { mode: 'one', focus: 'charlie', restAgg: 'total' } });
        var root = startApp();
        var c = TAP.store.get().cmp;
        a.equal(TAP.store.get().view, 'overview');
        a.equal(c.mode, 'all');
        a.equal(c.focus, null, 'no focus region');
        a.equal(qs('.tap-cmp__mode[aria-pressed="true"]', root).getAttribute('data-mode'), 'all', 'All regions is pressed');
      });
    });

    T.test('TPV-TC-012', 'Each mode shows only the pickers it needs', function (a) {
      run(function () {
        var root = startApp();
        var labels = qsa('.tap-cmp__mode', root).map(txt);
        a.deepEqual(labels, ['All regions', 'One vs the rest', 'One vs one', 'Chosen set', 'Organization total'], 'five modes');
        var expect = { all: [], one: ['focus', 'restAs', 'restAgg'], pair: ['focus', 'second'], set: ['set'], org: [] };
        Object.keys(expect).forEach(function (mode) {
          clickMode(root, mode);
          a.equal(TAP.store.get().cmp.mode, mode, 'mode written: ' + mode);
          a.deepEqual(pickers(root), expect[mode], 'pickers for ' + mode);
        });
        clickMode(root, 'one');
        qs('[data-picker="restAs"] [data-value="individual"]', root).click();
        a.equal(TAP.store.get().cmp.restAs, 'individual', 'restAs written');
        a.deepEqual(pickers(root), ['focus', 'restAs'], 'Average | Total only while the rest is one figure');
      });
    });

    T.test('TPV-TC-012', 'Pickers write the focus, second region and set to state.cmp', function (a) {
      run(function () {
        var root = startApp();
        clickMode(root, 'one');
        a.equal(TAP.store.get().cmp.focus, TAP.data.regions()[0].id, 'a focus region is chosen for you');
        choose(qs('[data-picker="focus"] select', root), 'charlie');
        a.equal(TAP.store.get().cmp.focus, 'charlie');
        clickMode(root, 'pair');
        var second = qs('[data-picker="second"] select', root);
        a.ok(second.value && second.value !== 'charlie', 'second differs from the focus');
        a.ok(qs('option[value="charlie"]', second).disabled, 'the focus region cannot be the second');
        choose(second, 'delta');
        a.deepEqual([TAP.store.get().cmp.focus, TAP.store.get().cmp.second], ['charlie', 'delta']);
        choose(qs('[data-picker="focus"] select', root), 'delta');
        a.ok(TAP.store.get().cmp.second !== 'delta', 'choosing the second as focus moves the second');
        clickMode(root, 'set');
        a.ok(TAP.store.get().cmp.set.length >= 2, 'a set starts with at least two regions');
        var chips = qsa('[data-picker="set"] .tap-cmp__chip', root);
        a.equal(chips.length, TAP.data.regions().length, 'one chip per region');
        var off = chips.filter(function (b) { return b.getAttribute('aria-pressed') !== 'true'; })[0];
        off.click();
        a.ok(TAP.store.get().cmp.set.indexOf(off.getAttribute('data-region')) >= 0, 'chip adds its region');
        var ids = TAP.data.regions().map(function (r) { return r.id; });
        var order = TAP.store.get().cmp.set.map(function (id) { return ids.indexOf(id); });
        a.deepEqual(order, order.slice().sort(), 'the set is kept in file order');
      });
    });

    T.test('X-compare-set-min', 'A set keeps at least two regions and says why', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'set', set: ['alpha', 'bravo'] } });
        qs('[data-picker="set"] [data-region="alpha"]', root).click();
        a.deepEqual(TAP.store.get().cmp.set, ['alpha', 'bravo'], 'not removed');
        a.equal(txt(qs('.tap-cmp__status', root)), TAP.content.text('compare.setMin'), 'the reason is shown');
      });
    });

    T.test('TPV-TC-013', 'The sentence states what is shown, from the scope wording', function (a) {
      run(function () {
        var root = startApp();
        a.equal(sentence(root), TAP.scope.sentence(TAP.store.get().cmp), 'All regions');
        clickMode(root, 'one');
        choose(qs('[data-picker="focus"] select', root), 'charlie');
        a.equal(sentence(root), TAP.scope.sentence(TAP.store.get().cmp), 'Region C against the rest');
        if (!/Fake/.test(sentence(root))) {
          a.equal(sentence(root), 'Showing Region C against the average of the other 3 regions', 'real wording');
        }
      });
    });

    T.test('TPV-TC-014', 'The Average | Total switch writes restAgg and the sentence follows', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'one', focus: 'charlie' } });
        qs('[data-picker="restAgg"] [data-value="total"]', root).click();
        a.equal(TAP.store.get().cmp.restAgg, 'total');
        a.equal(qs('[data-picker="restAgg"] [data-value="total"]', root).getAttribute('aria-pressed'), 'true');
        a.equal(sentence(root), TAP.scope.sentence(TAP.store.get().cmp));
      });
    });

    T.test('TPV-TC-015', 'The explanation icon shows for combined figures and explains them in plain words', function (a) {
      run(function () {
        var root = startApp();
        var btn = function () { return qs('.tap-cmp__explain', root); };
        ['all', 'pair', 'set'].forEach(function (m) { clickMode(root, m); a.ok(!shown(root, '.tap-cmp__explain'), 'no icon for ' + m); });
        TAP.store.set({ cmp: { mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'average' } });
        a.ok(shown(root, '.tap-cmp__explain'), 'icon for the average of the rest');
        btn().click();
        a.equal(btn().getAttribute('aria-expanded'), 'true');
        var pop = qs('.tap-cmp__pop', root);
        a.ok(shown(root, '.tap-cmp__pop'), 'explanation shown on click');
        a.ok(txt(pop).indexOf(TAP.content.text('combined.explainAverage')) >= 0, 'average wording');
        a.ok(txt(pop).indexOf(combinedLabel(TAP.store.get().cmp)) >= 0, 'names the combined figure as the charts do');
        qs('[data-picker="restAgg"] [data-value="total"]', root).click();
        a.ok(txt(qs('.tap-cmp__pop', root)).indexOf(TAP.content.text('combined.explainTotal')) >= 0, 'total wording');
        esc();
        a.ok(!shown(root, '.tap-cmp__pop'), 'Esc closes it');
        clickMode(root, 'org');
        a.ok(shown(root, '.tap-cmp__explain'), 'icon for the organization total');
        TAP.store.set({ cmp: { mode: 'one', restAs: 'individual' } });
        a.ok(!shown(root, '.tap-cmp__explain'), 'no icon when the others are shown individually');
      });
    });

    T.test('TPV-TC-016', 'The comparison stays when the view changes', function (a) {
      run(function () {
        var root = startApp();
        clickMode(root, 'pair');
        var before = JSON.stringify(TAP.store.get().cmp);
        qs('.tap-menu__item[data-view="industry"]', root).click();
        a.equal(JSON.stringify(TAP.store.get().cmp), before, 'state.cmp unchanged');
        a.equal(qs('.tap-cmp__mode[aria-pressed="true"]', root).getAttribute('data-mode'), 'pair', 'bar still shows it');
      });
    });

    T.test('TPV-TC-017', 'Changing the comparison redraws in under half a second', function (a) {
      run(function () {
        var root = startApp(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        var t0 = performance.now();
        clickMode(root, 'one');
        qs('[data-picker="restAgg"] [data-value="total"]', root).click();
        clickMode(root, 'all');
        var ms = (performance.now() - t0) / 3;
        a.ok(ms < 500, 'each change took ' + Math.round(ms) + ' ms');
      });
    });

    T.test('X-compare-writes-cmp-only', 'The bar writes only state.cmp', function (a) {
      run(function () {
        var root = startApp(), keys = [];
        var off = TAP.store.on(function (s, changed) { keys = keys.concat(changed); });
        try {
          clickMode(root, 'one');
          qs('[data-picker="restAs"] [data-value="individual"]', root).click();
          clickMode(root, 'set');
        } finally { off(); }
        a.deepEqual(keys.filter(function (k) { return k !== 'cmp' && k !== 'scopeEpoch'; }), [], 'nothing else changed');
        a.ok(keys.indexOf('cmp') >= 0, 'cmp changed');
      });
    });

    T.test('TPV-TC-018', 'The bar shows the data date', function (a) {
      run(function () {
        var root = startApp();
        var expected = TAP.content.text('compare.dataDate', { date: TAP.format.date(TAP.sources.dataDate()) });
        a.equal(txt(qs('.tap-cmp__date', root)), expected);
        a.equal(expected, 'Data: 2 Oct 2026', 'latest import date in the fixture');
      });
    });
  });
})(window.TAP);
