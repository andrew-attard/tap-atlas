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

  // Every test below starts the app and stops it again.
  function run(fn) { return withApp(fn); }

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
  // The combined figure's label from the scope contract, which the charts use too.
  function combinedLabel(c) {
    return TAP.scope.entities(c).filter(function (x) { return x.kind === 'combined'; })[0].label;
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

    T.test('X-compare-repair', 'A comparison naming regions not in the data is repaired from the data', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'pair', focus: 'nowhere', second: 'elsewhere' } });
        TAP.compareBar.mount(qs('.tap-cmp', root));
        var c = TAP.store.get().cmp, ids = TAP.data.regions().map(function (r) { return r.id; });
        a.ok(ids.indexOf(c.focus) >= 0 && ids.indexOf(c.second) >= 0 && c.focus !== c.second, 'two real regions');
        a.equal(qs('[data-picker="focus"] select', root).value, c.focus, 'the picker shows the region in use');
        TAP.store.set({ cmp: { mode: 'set', set: ['nowhere', ids[1]] } });
        TAP.compareBar.mount(qs('.tap-cmp', root));
        a.ok(TAP.store.get().cmp.set.length >= 2 && TAP.store.get().cmp.set.indexOf('nowhere') < 0, 'a set of real regions');
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
        a.equal(sentence(root), 'Showing Region C against the average of the other 3 regions', 'the exact wording');
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

  /* ---------- US-1.1.8: data status label (#9) ---------- */
  function realPlan() { var p = T_FIXTURE('mini'); p.meta.isSample = false; return p; }
  // Runs fn with an organization layer in place, then puts the old one back.
  function withOrg(org, fn) {
    var saved = window.TAP_ORG;
    window.TAP_ORG = org;
    try { return fn(); } finally { window.TAP_ORG = saved; }
  }
  function banners() { return qsa('.tap-banner', document); }
  function everyView(root, check) {
    TAP.views.order().forEach(function (id) {
      qs('.tap-menu__item[data-view="' + id + '"]', root).click();
      check(id);
    });
  }

  T.suite('banners', function () {
    T.test('TPV-TC-037', 'Sample data shows the sample banner on every view, once, with no way to dismiss it', function (a) {
      run(function () {
        var root = startApp();
        everyView(root, function (id) {
          a.equal(banners().length, 1, 'one banner on the page on ' + id);
          a.ok(root.contains(banners()[0]), 'inside the app');
        });
        var b = banners()[0];
        a.ok(b.classList.contains('tap-banner--sample'), 'the sample style');
        a.equal(txt(b), 'Sample data: all figures are fictional');
        a.equal(qsa('button, a, [role="button"]', b).length, 0, 'nothing to click away');
        a.ok(qs('.tap-stack', root).contains(b), 'at the top, with the menu');
      });
    });

    T.test('TPV-TC-037', 'Drawing the shell again never repeats the banner', function (a) {
      run(function () {
        var root = startApp();
        TAP.shell.mount(root, { warnings: [] });
        TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
        a.equal(banners().length, 1);
      });
    });

    T.test('TPV-TC-038', 'Real data shows the internal label with the organization’s wording', function (a) {
      withOrg({ settings: { internalLabel: { show: true, text: 'Restricted: example wording' } } }, function () {
        run(function () {
          var root = startApp(realPlan());
          everyView(root, function (id) { a.equal(banners().length, 1, 'one label on ' + id); });
          var b = banners()[0];
          a.ok(b.classList.contains('tap-banner--internal'), 'the internal style');
          a.equal(txt(b), 'Restricted: example wording');
          a.equal(qsa('button, a, [role="button"]', b).length, 0, 'nothing to click away');
        });
      });
    });

    T.test('TPV-TC-038', 'Without organization wording the internal label uses the general text', function (a) {
      withOrg(undefined, function () {
        run(function () {
          startApp(realPlan());
          a.equal(banners().length, 1);
          a.equal(txt(banners()[0]), TAP.content.text('banner.internal'));
        });
      });
    });

    T.test('TPV-TC-039', 'Real data with the internal label switched off shows no label', function (a) {
      withOrg({ settings: { internalLabel: { show: false } } }, function () {
        run(function () {
          var root = startApp(realPlan());
          everyView(root, function (id) { a.equal(banners().length, 0, 'no label on ' + id); });
        });
      });
    });

    T.test('X-banner-portfolio', 'The portfolio edition never shows the internal label: sample data wins', function (a) {
      withOrg({ settings: { internalLabel: { show: true, text: 'Restricted: example wording' } } }, function () {
        run(function () {
          startApp();
          a.equal(banners().length, 1);
          a.ok(banners()[0].classList.contains('tap-banner--sample'), 'sample banner, not the internal one');
        });
      });
    });

    T.test('TPV-TC-040', 'The label text is available for saved images and copied tables', function (a) {
      run(function () {
        startApp();
        a.deepEqual(TAP.shell.label(), { kind: 'sample', text: TAP.content.text('banner.sample') }, 'sample');
        withOrg({ settings: { internalLabel: { show: false } } }, function () {
          TAP.data.load(realPlan());
          a.equal(TAP.shell.label(), null, 'none when switched off');
        });
        TAP.data.load(realPlan());
        a.deepEqual(TAP.shell.label(), { kind: 'internal', text: TAP.content.text('banner.internal') }, 'internal');
      });
    });
  });

  /* ---------- US-1.1.5: know where every figure comes from, the panel side (#6) ---------- */
  function layer() { return qs('.tap-layer', document); }
  function layerCount() { return qsa('.tap-layer', document).length; }
  function keyEsc(target) {
    var e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    (target || document.body).dispatchEvent(e);
    return e;
  }
  function openSourcesByClick(root) { qs('.tap-cmp__date', root).click(); return layer(); }
  // Swaps one TAP module for a stand-in during fn, whatever the real one is.
  function swap(name, fake, fn) {
    var saved = TAP[name];
    TAP[name] = fake;
    try { return fn(); } finally { TAP[name] = saved; }
  }

  T.suite('layers', function () {
    T.test('X-layers-open-close', 'Side panels open, report the top one, and close', function (a) {
      run(function () {
        startApp();
        a.equal(TAP.layers.top(), null, 'nothing open at first');
        TAP.layers.open('sources');
        a.equal(TAP.layers.top(), 'sources');
        a.equal(layerCount(), 1, 'one side panel');
        a.equal(TAP.store.get().layer.name, 'sources', 'state.layer follows');
        TAP.layers.close();
        a.equal(TAP.layers.top(), null);
        a.equal(layerCount(), 0, 'removed');
        a.equal(TAP.store.get().layer, null, 'state.layer cleared');
      });
    });

    T.test('X-layers-replace', 'Opening another side panel replaces the one that is open', function (a) {
      run(function () {
        startApp();
        TAP.layers.open('sources');
        TAP.layers.open('note', { title: 'A note', render: function (el) { el.appendChild(TAP.dom.el('p', null, 'Body text')); } });
        a.equal(layerCount(), 1, 'still one side panel');
        a.equal(TAP.layers.top(), 'note');
        a.equal(txt(qs('.tap-layer__title', layer())), 'A note', 'title from the payload');
        a.ok(txt(layer()).indexOf('Body text') >= 0, 'body drawn by payload.render');
      });
    });

    T.test('X-layers-esc', 'Esc closes the open side panel, unless something nearer already used it', function (a) {
      run(function () {
        startApp();
        TAP.layers.open('sources');
        var pre = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        pre.preventDefault();
        document.body.dispatchEvent(pre);
        a.equal(TAP.layers.top(), 'sources', 'an Esc already handled by a popover is left alone');
        keyEsc();
        a.equal(TAP.layers.top(), null, 'Esc closes it');
        a.equal(layerCount(), 0);
      });
    });

    T.test('X-layers-esc-order', 'Esc closes the comparison explanation first, then the side panel', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'org' } });
        TAP.layers.open('sources');
        qs('.tap-cmp__explain', root).click();
        keyEsc();
        a.ok(qs('.tap-cmp__pop', root).hidden, 'first Esc: explanation closed');
        a.equal(TAP.layers.top(), 'sources', 'first Esc: side panel still open');
        keyEsc();
        a.equal(TAP.layers.top(), null, 'second Esc: side panel closed');
      });
    });

    T.test('X-layers-non-blocking', 'A side panel leaves the page usable: no backdrop, the menu still works', function (a) {
      run(function () {
        var root = startApp();
        TAP.layers.open('sources');
        a.equal(qsa('.tap-backdrop, .dialog-backdrop', document).length, 0, 'no backdrop');
        a.equal(layer().getAttribute('aria-modal'), 'false', 'not modal');
        qs('.tap-menu__item[data-view="industry"]', root).click();
        a.equal(TAP.store.get().view, 'industry', 'the menu worked with the panel open');
      });
    });

    T.test('X-layers-focus', 'Focus moves into the panel and back to what opened it', function (a) {
      run(function () {
        var root = startApp();
        var btn = qs('.tap-cmp__date', root);
        btn.focus();
        btn.click();
        a.ok(layer().contains(document.activeElement), 'focus is inside the panel');
        qs('.tap-layer__close', layer()).click();
        a.equal(TAP.layers.top(), null, 'the Close button closes it');
        a.equal(document.activeElement, btn, 'focus back on the data date');
      });
    });

    T.test('X-layers-reset', 'Resetting the state closes the side panel', function (a) {
      run(function () {
        startApp();
        TAP.layers.open('sources');
        TAP.store.reset();
        a.equal(layerCount(), 0);
        a.equal(TAP.layers.top(), null);
      });
    });

    T.test('X-layers-details', 'Details draw the groups from TAP.details.build, each value with its source', function (a) {
      run(function () {
        startApp();
        var cell = { v: 1250, state: 'value', kind: 'IN', src: { regionId: 'charlie', section: 'newBusiness', field: 'targetAccounts', row: 7, kind: 'IN' } };
        var built = { title: 'Region C · Healthcare', groups: [{ title: 'New business', rows: [{ label: 'Target accounts', cell: cell, unit: 'count' }] }] };
        swap('details', { build: function () { return built; } }, function () {
          TAP.layers.openDetails({ reportId: 'ind-tiers', regionIds: ['charlie'] });
          a.equal(TAP.layers.top(), 'details');
          a.equal(txt(qs('.tap-layer__title', layer())), 'Region C · Healthcare', 'title');
          a.equal(txt(qs('.tap-details__group h3', layer())), 'New business', 'group title');
          var row = qs('.tap-details__row', layer());
          a.ok(txt(row).indexOf('Target accounts') >= 0, 'label');
          a.ok(txt(row).indexOf(TAP.format.cell(cell, { unit: 'count', exact: true })) >= 0, 'value, formatted');
          a.ok(txt(row).indexOf(TAP.format.kind('IN').text) >= 0, 'kind of value, glyph and word');
          a.ok(txt(row).indexOf(TAP.sources.address(cell.src).text) >= 0, 'file › sheet › cell');
        });
      });
    });

    T.test('X-layers-details-stub', 'While details are not built, the panel says so inside itself', function (a) {
      run(function () {
        startApp();
        swap('details', { __stub: 21, build: function () { throw new Error(TAP.stub.message('TAP.details.build', 21)); } }, function () {
          TAP.layers.openDetails({ reportId: 'ov-ambition' });
          a.equal(TAP.layers.top(), 'details');
          a.ok(/Not built yet \(#21\)/.test(txt(layer())), 'the not-built message is shown in the panel');
        });
      });
    });

    T.test('X-layers-details-bus', 'A details:open event opens the details panel', function (a) {
      run(function () {
        startApp();
        swap('details', { build: function () { return { title: 'From the bus', groups: [] }; } }, function () {
          TAP.bus.emit('details:open', { target: { reportId: 'ov-ambition' } });
          a.equal(TAP.layers.top(), 'details');
          a.equal(txt(qs('.tap-layer__title', layer())), 'From the bus');
        });
      });
    });

    T.test('X-layers-glossary', 'The glossary panel is drawn by TAP.glossary.render on the page, opening on the term', function (a) {
      run(function () {
        startApp();
        var seen = null;
        swap('glossary', { render: function (el, opts) {
          seen = { connected: el.isConnected, opts: opts };
          el.appendChild(TAP.dom.el('p', { class: 'tap-gloss' }, 'Glossary list'));
          return { el: el, filter: function () {} };
        } }, function () {
          TAP.layers.open('glossary', { termId: 'arr' });
          a.equal(TAP.layers.top(), 'glossary');
          a.deepEqual(seen.opts, { termId: 'arr' }, 'opens on the term');
          a.ok(seen.connected, 'the body is on the page when drawn, so the entry can scroll into view');
          a.equal(txt(qs('.tap-layer__title', layer())), TAP.content.text('layers.glossary'), 'the frame has a title');
          a.ok(qs('.tap-gloss', layer()), 'the list is inside the panel');
        });
      });
    });
  });

  T.suite('sources-panel', function () {
    T.test('TPV-TC-019', 'Clicking the data date lists every region with file, file date, import date and notes', function (a) {
      run(function () {
        var root = startApp();
        var panel = openSourcesByClick(root);
        a.equal(TAP.layers.top(), 'sources', 'the data sources panel opened');
        var blocks = qsa('.tap-src__region', panel);
        var imports = TAP.sources.imports();
        a.equal(blocks.length, imports.length, 'one block per region');
        imports.forEach(function (imp, i) {
          var b = txt(blocks[i]);
          a.ok(b.indexOf(imp.name) >= 0, 'name: ' + imp.name);
          a.ok(b.indexOf(imp.fileName) >= 0, 'full file name: ' + imp.fileName);
          a.ok(b.indexOf(TAP.format.date(imp.fileModified)) >= 0, 'file saved date for ' + imp.name);
          a.ok(b.indexOf(TAP.format.date(imp.importedAt)) >= 0, 'import date for ' + imp.name);
        });
        var c = txt(blocks[2]);
        a.ok(c.indexOf('The Customer Growth section is empty.') >= 0, 'Region C’s import note');
        a.ok(c.indexOf('Region C plan.xlsx › 3. Customer Growth › A10') >= 0, 'the note names file, sheet and cell');
        a.ok(txt(blocks[0]).indexOf(TAP.content.text('sourcesPanel.noNotes')) >= 0, 'a region with no notes says so');
        a.ok(txt(blocks[3]).indexOf('28 Sep 2026') >= 0 && txt(blocks[3]).indexOf('1 Oct 2026') >= 0, 'Region D: saved 28 Sep, imported 1 Oct');
      });
    });

    T.test('TPV-TC-024', 'The panel says when regions were imported on different dates', function (a) {
      run(function () {
        var root = startApp();
        var panel = openSourcesByClick(root);
        a.equal(TAP.sources.datesDiffer(), true, 'Region D was imported on another day');
        a.ok(txt(qs('.tap-src__differ', panel)) === TAP.content.text('sourcesPanel.datesDiffer'), 'stated in the panel');
        TAP.layers.close();
        var p = T_FIXTURE('mini');
        p.regions.forEach(function (r) { r.source.importedAt = '2026-10-02T09:00:00Z'; });
        root = startApp(p);
        panel = openSourcesByClick(root);
        a.equal(qsa('.tap-src__differ', panel).length, 0, 'not stated when the dates agree');
      });
    });

    T.test('TPV-TC-025', 'Import notes appear only in the data sources panel', function (a) {
      run(function () {
        var root = startApp();
        TAP.views.order().forEach(function (id) {
          qs('.tap-menu__item[data-view="' + id + '"]', root).click();
          a.ok(txt(root).indexOf('The Customer Growth section is empty.') < 0, 'not on the ' + id + ' screen');
        });
        a.ok(txt(openSourcesByClick(root)).indexOf('The Customer Growth section is empty.') >= 0, 'in the panel');
      });
    });

    T.test('X-sources-notes', 'Other notes and skipped insight rules follow the regions', function (a) {
      run(function () {
        var root = startApp();
        TAP.notes.add({ source: 'colours', message: 'Colours repeat after 8 regions.' });
        TAP.notes.add({ source: 'data', message: 'Channel split adds up to 95%.', regionId: 'bravo', sheet: '2. New Business', cell: 'E12' });
        var panel = openSourcesByClick(root);
        var other = txt(qs('.tap-src__notes', panel));
        a.ok(other.indexOf('Colours repeat after 8 regions.') >= 0, 'a general note');
        a.ok(other.indexOf('Channel split adds up to 95%.') >= 0, 'a data note');
        a.ok(other.indexOf('Region B plan.xlsx › 2. New Business › E12') >= 0, 'with its file, sheet and cell');
        if (TAP.insights.__stub) a.equal(qsa('.tap-src__failures', panel).length, 0, 'skipped quietly while insights are not built');
        TAP.layers.close();
        swap('insights', { failures: function () { return [{ ruleId: 'consensus', message: 'Needs tier data.' }]; } }, function () {
          var p = openSourcesByClick(root);
          a.ok(txt(qs('.tap-src__failures', p)).indexOf('consensus') >= 0, 'rule named');
          a.ok(txt(qs('.tap-src__failures', p)).indexOf('Needs tier data.') >= 0, 'reason given');
        });
      });
    });

    T.test('X-sources-summary', 'The panel opens with the data date and the number of import notes', function (a) {
      run(function () {
        var root = startApp();
        var panel = openSourcesByClick(root);
        a.equal(txt(qs('.tap-layer__title', panel)), TAP.content.text('sourcesPanel.title'));
        a.equal(txt(qs('.tap-src__summary', panel)), TAP.content.text('sourcesPanel.summaryOne', { date: '2 Oct 2026' }));
      });
    });
  });

  /* ---------- US-1.1.1: open the app from the folder (#2) ---------- */
  var ERRORS = [
    { path: 'regions[2].marketCoverage[4].tier', region: 'Region C', item: 'Retail', expected: '1, 2, 3 or blank', found: 'Tier 1-2',
      message: 'regions[2].marketCoverage[4].tier: expected 1, 2, 3 or blank, found "Tier 1-2"' },
    { path: 'regions[0].newBusiness[1].arrPotential[1]', region: 'Region A', item: null, expected: 'zero or more', found: -120,
      message: 'regions[0].newBusiness[1].arrPotential[1]: expected zero or more, found -120' },
    { path: '', region: null, item: null, expected: '', found: 12, message: '12 more problems not listed' }
  ];
  function screen(root) { return qs('.tap-screen', root); }

  T.suite('screens', function () {
    T.test('TPV-TC-004', 'With no data file, a plain message says what is wrong and what to do', function (a) {
      var root = T.dom.mount();
      var res = TAP.app.start({ root: root, plan: null });
      a.equal(res.reason, 'missing');
      a.ok(screen(root) && screen(root).classList.contains('tap-screen--missing'), 'the missing-data screen');
      a.equal(txt(qs('h1', root)), TAP.content.text('screens.missingTitle'));
      a.ok(txt(root).indexOf(TAP.content.text('screens.missingBody')) >= 0, 'what to do');
      a.equal(qsa('.tap-menu, .tap-cmp', root).length, 0, 'no menu or comparison bar');
    });

    T.test('TPV-TC-006', 'A data file that fails to load (for example cut off mid-way) gets the same message, not a blank page', function (a) {
      var saved = window.PLAN_DATA, root = T.dom.mount(), res;
      try {
        window.PLAN_DATA = undefined;   // what a file with a syntax error leaves behind
        res = TAP.app.start({ root: root });
      } finally { window.PLAN_DATA = saved; }
      a.equal(res.reason, 'missing');
      a.equal(txt(qs('h1', root)), TAP.content.text('screens.missingTitle'));
      TAP.data.load(T_FIXTURE('mini'));
    });

    T.test('TPV-TC-005', 'A data file for another version names the expected and found versions', function (a) {
      var root = T.dom.mount(), p = T_FIXTURE('mini');
      p.meta.schemaVersion = '0.1';
      var res = TAP.app.start({ root: root, plan: p });
      a.equal(res.reason, 'version');
      a.ok(screen(root).classList.contains('tap-screen--version'));
      a.equal(txt(qs('h1', root)), TAP.content.text('screens.versionTitle'));
      a.ok(txt(root).indexOf(TAP.content.text('screens.versionBody', { found: '0.1', expected: TAP.schemaVersion })) >= 0,
        'both versions named');
      TAP.data.load(T_FIXTURE('mini'));
    });

    T.test('X-screens-invalid', 'Data errors are listed one by one with path, expected and found', function (a) {
      var root = T.dom.mount();
      TAP.screens.show(root, { ok: false, reason: 'invalid', errors: ERRORS, warnings: [] });
      a.ok(screen(root).classList.contains('tap-screen--invalid'));
      a.equal(txt(qs('h1', root)), TAP.content.text('screens.invalidTitle'));
      var rows = qsa('.tap-screen__errors tbody tr', root);
      a.equal(rows.length, ERRORS.length, 'one row per error');
      a.ok(txt(rows[0]).indexOf('regions[2].marketCoverage[4].tier') >= 0, 'path');
      a.ok(txt(rows[0]).indexOf('1, 2, 3 or blank') >= 0, 'expected');
      a.ok(txt(rows[0]).indexOf('Tier 1-2') >= 0, 'found');
      a.ok(txt(rows[0]).indexOf('Region C') >= 0, 'region');
      a.ok(txt(rows[1]).indexOf('-120') >= 0, 'a number found is shown');
      a.ok(txt(rows[2]).indexOf('12 more problems not listed') >= 0, 'a message-only error still shows its message');
    });

    T.test('X-screens-copy-text', 'The copy text lists every error as tab-separated lines', function (a) {
      var root = T.dom.mount();
      TAP.screens.show(root, { ok: false, reason: 'invalid', errors: ERRORS, warnings: [] });
      var text = qs('.tap-screen__copytext', root).value;
      var lines = text.split('\n');
      a.ok(lines.length >= ERRORS.length + 1, 'a heading line and one line per error');
      a.ok(lines.some(function (l) {
        return l.split('\t').join('|') === '1|Region C · Retail|regions[2].marketCoverage[4].tier|1, 2, 3 or blank|Tier 1-2|' + ERRORS[0].message;
      }), 'first error, every field in order');
      a.ok(text.indexOf('12 more problems not listed') >= 0, 'message-only error included');
    });

    T.test('X-screens-copy', 'One click copies the list, with a fallback that works from file://', function (a) {
      var root = T.dom.mount();
      TAP.screens.show(root, { ok: false, reason: 'invalid', errors: ERRORS, warnings: [] });
      qs('.tap-screen__copy', root).click();
      return new Promise(function (resolve) { setTimeout(resolve, 1500); }).then(function () {
        var msg = txt(qs('.tap-screen__status', root));
        a.ok(msg === TAP.content.text('screens.copied') || msg === TAP.content.text('screens.copyManual'), 'a result is reported: ' + msg);
        if (msg === TAP.content.text('screens.copyManual')) a.ok(!qs('.tap-screen__copytext', root).hidden, 'the text is shown to copy by hand');
      });
    });

    T.test('X-screens-replace', 'Showing a screen twice leaves one screen', function (a) {
      var root = T.dom.mount();
      TAP.screens.show(root, { reason: 'missing', errors: [], warnings: [] });
      TAP.screens.show(root, { reason: 'version', errors: [{ path: 'meta.schemaVersion', expected: '0.2', found: '0.1' }], warnings: [] });
      a.equal(qsa('.tap-screen', root).length, 1);
      a.ok(screen(root).classList.contains('tap-screen--version'));
    });

    T.test('TPV-TC-001', 'The first view is on screen within 2 seconds of starting on the sample data', function (a) {
      withFakes(function () {
        withApp(function () {
          var t0 = performance.now();
          var root = startApp(JSON.parse(JSON.stringify(window.PLAN_DATA)));
          var ms = performance.now() - t0;
          a.ok(TAP.app.current() === 'overview' && root.contains(TAP.shell.viewEl()), 'Overview mounted');
          a.ok(ms < 2000, 'start took ' + Math.round(ms) + ' ms');
        });
      });
    });
  });
})(window.TAP);
