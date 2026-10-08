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
        a.deepEqual(menuItems(root).map(txt), ['Overview', 'Market coverage', 'New business', 'Customer growth', 'Partners', 'Outlook', 'Regions',
          'Insights', 'Build a chart', 'Guide'], 'Phase 1, Phase 2 and Phase 4 views, then Build a chart and the Guide (D96)');
      });
    });

    // D96: Build a chart and the Guide sit together at the right end of the menu, apart from the plan views (D94);
    // D95: Market coverage is second
    T.test('X-d96-build-guide-right', 'On the sample at 1280 px: ten items on one line, Build a chart and the Guide at the right end', function (a) {
      withApp(function () {
        var root = startApp(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        root.style.width = '1280px';
        ['Take the tour', 'Present'].forEach(function (w) { TAP.shell.actionsEl().appendChild(TAP.dom.el('button', { type: 'button', class: 'tap-btn' }, w)); });
        var items = menuItems(root), n = items.length;
        a.equal(n, 10, 'ten items on the sample');
        a.deepEqual(items.slice(-2).map(txt), ['Build a chart', 'Guide'], 'ending Build a chart, Guide');
        a.equal(txt(items[1]), 'Market coverage', 'the second view is Market coverage (D95)');
        var ins = qs('.tap-menu__item[data-view="insights"]', root).getBoundingClientRect();
        var b = items[n - 2].getBoundingClientRect(), g = items[n - 1].getBoundingClientRect(), nav = qs('.tap-menu', root).getBoundingClientRect();
        var tops = items.map(function (x) { return Math.round(x.getBoundingClientRect().top); });
        a.equal(tops.filter(function (t) { return t !== tops[0]; }).length, 0, 'all on one line');
        a.ok(b.left - ins.right > 24, 'Build a chart starts right of Insights with a clear gap (' + Math.round(b.left - ins.right) + ' px)');
        a.ok(g.left >= b.right && g.left - b.right <= 24, 'the Guide follows Build a chart with a normal menu gap (' + Math.round(g.left - b.right) + ' px)');
        a.ok(Math.abs(nav.right - g.right) < 2, 'the Guide ends at the right edge of the menu');
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
          a.equal(TAP.store.get().view, 'industry', 'first back: Market coverage');
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
        // The page-wide actions (Take the tour, Present) sit beside the data date, not in the top bar (D72)
        ['Take the tour', 'Present'].forEach(function (w) { TAP.shell.actionsEl().appendChild(TAP.dom.el('button', { type: 'button', class: 'tap-btn' }, w)); });
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

    T.test('X-shell-actions', 'The page-wide actions slot sits beside the data date, holding Present, for other streams to fill (D72)', function (a) {
      withApp(function () {
        var root = startApp();
        root.style.width = '1280px';
        var slot = TAP.shell.actionsEl(), date = qs('.tap-cmp__date', root);
        a.ok(slot && qs('.tap-cmp__row--sentence', root).contains(slot), 'in the comparison bar, on the sentence row');
        a.ok(!qs('.tap-topbar', root).contains(slot), 'not in the top bar');
        a.ok(slot.classList.contains('tap-topbar__actions'), 'the actions slot');
        var others = Array.prototype.filter.call(slot.children, function (c) { return !c.classList.contains('tap-present__start'); });
        a.equal(others.length, 0, 'only Present (US-3.1.2) until another stream adds to it');
        a.equal(date && date.nextElementSibling, slot, 'right after the data date');
        slot.appendChild(TAP.dom.el('button', { type: 'button', class: 'tap-btn' }, 'Example action'));
        a.ok(slot.getBoundingClientRect().left >= date.getBoundingClientRect().right - 1, 'right of the data date');
        var sr = slot.getBoundingClientRect(), dr = date.getBoundingClientRect();
        a.ok(sr.top < dr.bottom && sr.bottom > dr.top, 'on the same line at 1280 px');
        a.deepEqual(qsa('.tap-menu__item', root).map(function (b) { return Math.round(b.getBoundingClientRect().top); })
          .filter(function (t, i, all) { return t !== all[0]; }), [], 'the menu still fits on one line');
      });
    });

    // Eleven items in the menu: the sample with the test extra section, so Other sections shows (US-3.2.2), plus
    // Build a chart (D96), for the checks below.
    function withEleven(fn) { return withApp(function () { return fn(startApp(window.T_WITH_EXTRA())); }); }

    // D104: ten items (the sample, and the full template, D93) keep one line at 1280 px. With an extra section the
    // eleventh, Other sections, makes the menu wrap: Build a chart and the Guide go to the second line together,
    // right-aligned, never the Guide alone. Narrower (125% and 150% zoom) every item stays visible.
    T.test('X-shell-menu-nine', 'Ten items on one line at 1280 px; eleven wrap with Build a chart and the Guide together on the second line (D96, D104)', function (a) {
      function tools(root) { return ['build', 'guide'].map(function (id) { return qs('.tap-menu__item[data-view="' + id + '"]', root).getBoundingClientRect(); }); }
      function top(r) { return Math.round(r.top); }
      withApp(function () {
        var root = startApp(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        root.style.width = '1280px';
        var items = menuItems(root), top0 = top(items[0].getBoundingClientRect());
        a.equal(items.length, 10, 'ten items on the sample');
        a.equal(items.filter(function (b) { return top(b.getBoundingClientRect()) !== top0; }).length, 0, 'ten items: one line at 1280 px');
      });
      withEleven(function (root) {
        ['Take the tour', 'Present'].forEach(function (w) { TAP.shell.actionsEl().appendChild(TAP.dom.el('button', { type: 'button', class: 'tap-btn' }, w)); });
        a.equal(menuItems(root).length, 11, 'eleven items in the menu');
        a.ok(!!qs('.tap-menu__item[data-view="other"]', root), 'Other sections among them');
        [1280, 1024, 853].forEach(function (w) {
          root.style.width = w + 'px';
          window.dispatchEvent(new Event('resize'));   // charts follow the window's size, as on a real zoom change
          var items = menuItems(root), nav = qs('.tap-menu', root), box = nav.getBoundingClientRect();
          var hidden = items.filter(function (b) {
            var r = b.getBoundingClientRect();
            return !(r.width > 0 && r.left >= box.left - 1 && r.right <= box.right + 1);
          }).map(function (b) { return b.textContent; });
          a.deepEqual(hidden, [], w + ' px: every item fully visible');
          a.ok(nav.scrollWidth <= nav.clientWidth + 1 && root.scrollWidth <= root.clientWidth + 1, w + ' px: no horizontal scroll');
          var t = tools(root), plan = items.filter(function (b) { return ['build', 'guide'].indexOf(b.getAttribute('data-view')) < 0; });
          a.equal(top(t[0]), top(t[1]), w + ' px: Build a chart and the Guide on the same line');
          a.ok(t[1].left >= t[0].right && t[1].left - t[0].right <= 24, w + ' px: the Guide straight after Build a chart');
          a.ok(Math.abs(box.right - t[1].right) < 2, w + ' px: the two right-aligned');
          if (w === 1280) {
            var top0 = top(items[0].getBoundingClientRect());
            a.equal(plan.filter(function (b) { return top(b.getBoundingClientRect()) !== top0; }).length, 0, '1280 px: every plan view on the first line');
            a.ok(top(t[0]) > top0, '1280 px: the two on the second line');
          }
        });
        a.ok(parseFloat(getComputedStyle(menuItems(root)[0]).fontSize) >= 16, 'menu text at least 16 px');
      });
    });

    T.test('X-shell-menu-wraps', 'At 853 px the menu wraps onto more lines and the current item stays marked', function (a) {
      withEleven(function (root) {
        root.style.width = '853px';
        var items = menuItems(root), tops = items.map(function (b) { return Math.round(b.getBoundingClientRect().top); });
        a.ok(tops.some(function (t) { return t !== tops[0]; }), 'more than one line');
        var cur = qs('.tap-menu__item[aria-current="page"]', root), cs = cur && getComputedStyle(cur);
        a.ok(cs && cs.borderBottomStyle === 'solid' && parseFloat(cs.borderBottomWidth) > 0 && parseFloat(cs.fontWeight) >= 800, 'the current view is still marked');
      });
    });

    T.test('X-shell-actions-narrow', 'The sentence shares its row with the data date and the actions: one action at 853 px, two at 1024 px', function (a) {
      withApp(function () {
        var root = startApp(), slot = TAP.shell.actionsEl(), date = qs('.tap-cmp__date', root);
        TAP.store.set({ cmp: { mode: 'one', focus: TAP.data.regions()[0].id } });   // a long sentence
        function sameLine() {
          var s = slot.getBoundingClientRect(), d = date.getBoundingClientRect();
          return s.top < d.bottom && s.bottom > d.top;
        }
        slot.appendChild(TAP.dom.el('button', { type: 'button', class: 'tap-btn' }, 'Present'));
        root.style.width = '853px';
        a.ok(sameLine(), '853 px: the action stays beside the data date');
        slot.appendChild(TAP.dom.el('button', { type: 'button', class: 'tap-btn' }, 'Take the tour'));
        root.style.width = '1024px';
        a.ok(sameLine(), '1024 px: both actions stay beside the data date');
        var say = qs('.tap-cmp__say', root).getBoundingClientRect(), d = date.getBoundingClientRect();
        a.ok(say.top < d.bottom && say.bottom > d.top, '1024 px: the sentence on the same row');
      });
    });

    /* ---------- review fix #373: addresses that name no available view (D76, SV-2 to SV-5) ---------- */

    // Sets the address bar, waits for the app to follow it, and returns the address the bar ends on.
    function goTo(hash) {
      var p = nextHashChange();
      window.location.hash = hash;
      return p.then(settle).then(function () { return window.location.hash; });
    }

    T.test('X-review-SV-2', 'An address naming no view opens the Overview and the address bar is corrected', function (a) {
      return withApp(function () {
        var root = startApp();
        qs('.tap-menu__item[data-view="industry"]', root).click();
        return settle().then(function () { return goTo('#foo'); }).then(function (hash) {
          a.equal(TAP.store.get().view, 'overview', 'the Overview opens');
          a.equal(TAP.app.current(), 'overview', 'and is mounted');
          a.equal(hash, '#overview', 'the address bar says so');
          a.deepEqual(current(root), ['overview'], 'the menu marks it');
        });
      });
    });

    T.test('X-review-SV-2', '#other on data without extra sections opens the Overview (D76)', function (a) {
      return withApp(function () {
        var root = startApp();
        a.ok(TAP.views.order().indexOf('other') < 0, 'the fixture has no extra sections, so Other sections is not in the menu');
        qs('.tap-menu__item[data-view="industry"]', root).click();
        return settle().then(function () { return goTo('#other'); }).then(function (hash) {
          a.equal(TAP.store.get().view, 'overview', 'state.view');
          a.equal(TAP.app.current(), 'overview', 'the mounted view');
          a.equal(hash, '#overview', 'the address bar');
        });
      });
    });

    T.test('X-review-SV-2', 'A region the data does not have opens the region picker; a malformed address opens the Overview', function (a) {
      return withApp(function () {
        startApp();
        return goTo('#regions/zzz').then(function (hash) {
          a.equal(TAP.store.get().view, 'regions', 'the Regions view');
          a.equal(TAP.store.get().region, null, 'no unknown region in the state');
          a.equal(hash, '#regions', 'the address bar names the picker');
          return goTo('#regions/%');
        }).then(function (hash) {
          a.equal(TAP.store.get().view, 'overview', 'a malformed address opens the Overview');
          a.equal(hash, '#overview', 'and the address bar is corrected');
          return goTo('#regions/bravo');
        }).then(function (hash) {
          a.equal(TAP.store.get().region, 'bravo', 'a known region still opens its profile');
          a.equal(hash, '#regions/bravo', 'and keeps its address');
        });
      });
    });

    T.test('X-review-SV-2', 'A view that fails to mount shows its error, and the menu still leaves it', function (a) {
      return withApp(function () {
        var root = startApp(), spec = TAP.views.get('industry'), real = spec.mount;
        spec.mount = function () { throw new Error('test: industry failed'); };
        var warn = console.error;
        console.error = function () {};
        try {
          qs('.tap-menu__item[data-view="industry"]', root).click();
        } finally { spec.mount = real; console.error = warn; }
        var area = qs('.tap-view', root);
        a.match(txt(area), /test: industry failed/, 'the error is shown in the view area');
        qs('.tap-menu__item[data-view="overview"]', root).click();
        a.equal(TAP.app.current(), 'overview', 'the Overview mounts again');
        a.ok(qs('.tap-view .tap-ov', root), 'its content is drawn');
        a.ok(txt(area).indexOf('test: industry failed') < 0, 'the error is gone');
      });
    });

    T.test('X-review-SV-2', 'Screenshot mode refuses an unknown view, mode, rest or region', function (a) {
      var keep = window.location.pathname + window.location.search + window.location.hash;
      history.replaceState(null, '', window.location.pathname + '?screenshot=1&view=bogus&mode=bogus&rest=bogus&region=zzz');
      try {
        return withApp(function () {
          var root = startApp(), s = TAP.store.get();
          a.equal(s.view, 'overview', 'unknown view: the Overview');
          a.equal(s.cmp.mode, 'all', 'unknown mode: All regions');
          a.equal(s.cmp.restAgg, 'average', 'unknown rest: the default');
          a.equal(s.region, null, 'unknown region: none');
          a.equal(root.getAttribute('data-view'), 'overview', 'the frame names the Overview');
        });
      } finally { history.replaceState(null, '', keep); }
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
    return ['focus', 'second', 'rest', 'set'].filter(function (k) { return shown(root, '[data-picker="' + k + '"]'); });
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
        a.deepEqual(labels, ['All regions', 'Selected regions', 'One vs the rest'], 'three modes (D99, D114)');
        var expect = { all: [], set: ['set'], one: ['focus', 'rest'] };
        Object.keys(expect).forEach(function (mode) {
          clickMode(root, mode);
          a.equal(TAP.store.get().cmp.mode, mode, 'mode written: ' + mode);
          a.deepEqual(pickers(root), expect[mode], 'pickers for ' + mode);
        });
        clickMode(root, 'one');
        qs('[data-picker="rest"] [data-value="individual"]', root).click();
        a.equal(TAP.store.get().cmp.restAs, 'individual', 'restAs written');
        a.deepEqual(pickers(root), ['focus', 'rest'], 'the rest stays one control (D50)');
      });
    });

    T.test('TPV-TC-012', 'Pickers write the focus and the selected regions to state.cmp', function (a) {
      run(function () {
        var root = startApp();
        clickMode(root, 'one');
        a.equal(TAP.store.get().cmp.focus, TAP.data.regions()[0].id, 'a focus region is chosen for you');
        choose(qs('[data-picker="focus"] select', root), 'charlie');
        a.equal(TAP.store.get().cmp.focus, 'charlie');
        clickMode(root, 'set');
        a.deepEqual(TAP.store.get().cmp.set, ['charlie'], 'a selection starts with the focus region alone (D99)');
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
        TAP.store.set({ cmp: { mode: 'one', focus: 'nowhere' } });
        TAP.compareBar.mount(qs('.tap-cmp', root));
        var c = TAP.store.get().cmp, ids = TAP.data.regions().map(function (r) { return r.id; });
        a.ok(ids.indexOf(c.focus) >= 0, 'a real focus region');
        a.equal(qs('[data-picker="focus"] select', root).value, c.focus, 'the picker shows the region in use');
        TAP.store.set({ cmp: { mode: 'set', set: ['nowhere', ids[1]] } });
        TAP.compareBar.mount(qs('.tap-cmp', root));
        a.deepEqual(TAP.store.get().cmp.set, [ids[1]], 'a selection of the real region only');
        TAP.store.set({ cmp: { mode: 'pair', focus: 'nowhere', second: 'elsewhere' } });
        TAP.compareBar.mount(qs('.tap-cmp', root));
        c = TAP.store.get().cmp;
        a.ok(c.mode === 'set' && c.set.length === 1 && ids.indexOf(c.set[0]) >= 0, 'an old pair of unknown regions: a selection of one real region (D99)');
      });
    });

    T.test('X-compare-set-min', 'A selection keeps at least one region and says why (D99)', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'set', set: ['alpha'] } });
        qs('[data-picker="set"] [data-region="alpha"]', root).click();
        a.deepEqual(TAP.store.get().cmp.set, ['alpha'], 'not removed');
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
        qs('[data-picker="rest"] [data-value="total"]', root).click();
        a.equal(TAP.store.get().cmp.restAgg, 'total');
        a.equal(qs('[data-picker="rest"] [data-value="total"]', root).getAttribute('aria-pressed'), 'true');
        a.equal(sentence(root), TAP.scope.sentence(TAP.store.get().cmp));
      });
    });

    T.test('X-compare-rest-one-control', 'D50: the others are shown Individually, as their Average or their Total, from one control', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'average' } });
        var opts = qsa('[data-picker="rest"] .tap-seg__opt', root);
        a.deepEqual(opts.map(txt), ['Individually', 'Average', 'Total'], 'three options, in this order');
        var pressed = function () { return qsa('[data-picker="rest"] [aria-pressed="true"]', root).map(function (b) { return b.getAttribute('data-value'); }); };
        a.deepEqual(pressed(), ['average'], 'the average of the rest is pressed');
        qs('[data-picker="rest"] [data-value="total"]', root).click();
        a.deepEqual([TAP.store.get().cmp.restAs, TAP.store.get().cmp.restAgg], ['combined', 'total'], 'Total: combined, as a total');
        qs('[data-picker="rest"] [data-value="individual"]', root).click();
        a.equal(TAP.store.get().cmp.restAs, 'individual', 'Individually');
        a.equal(TAP.store.get().cmp.restAgg, 'total', 'how to combine is remembered for later');
        a.deepEqual(pressed(), ['individual'], 'only Individually is pressed');
        a.equal(sentence(root), TAP.scope.sentence(TAP.store.get().cmp), 'the sentence follows');
        qs('[data-picker="rest"] [data-value="average"]', root).click();
        a.deepEqual([TAP.store.get().cmp.restAs, TAP.store.get().cmp.restAgg], ['combined', 'average'], 'Average: combined, as an average');
        opts.forEach(function (b) { a.ok(b.getBoundingClientRect().height >= 40, txt(b) + ': 40 px touch height'); });
      });
    });

    T.test('X-compare-set-button', 'D50: Selected regions is one button with the count; it opens the regions by click and closes with Esc', function (a) {
      run(function () {
        var root = startApp();
        TAP.store.set({ cmp: { mode: 'set', set: ['alpha', 'bravo'] } });
        var btn = qs('[data-picker="set"] .tap-cmp__setbtn', root);
        a.ok(btn && shown(root, '.tap-cmp__setbtn'), 'one button in the bar');
        a.equal(txt(btn), TAP.content.text('compare.setButton', { n: 2, total: 4 }), 'it shows the count');
        a.equal(btn.getAttribute('aria-expanded'), 'false', 'closed at first');
        a.ok(!shown(root, '.tap-cmp__chip'), 'the regions are not on the bar');
        btn.focus();
        btn.click();
        a.equal(btn.getAttribute('aria-expanded'), 'true', 'a click opens it');
        a.equal(qsa('.tap-cmp__chip', root).filter(function (c) { return c.getBoundingClientRect().height >= 40; }).length, 4, 'every region shows, 40 px high');
        qs('[data-picker="set"] [data-region="charlie"]', root).click();
        a.deepEqual(TAP.store.get().cmp.set, ['alpha', 'bravo', 'charlie'], 'a region added');
        a.equal(txt(btn), TAP.content.text('compare.setButton', { n: 3, total: 4 }), 'the count follows');
        a.equal(btn.getAttribute('aria-expanded'), 'true', 'still open for the next choice');
        esc();
        a.equal(btn.getAttribute('aria-expanded'), 'false', 'Esc closes it');
        a.equal(document.activeElement, btn, 'focus back on the button');
        btn.click();
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        a.equal(btn.getAttribute('aria-expanded'), 'false', 'a click elsewhere closes it');
        btn.click();
        clickMode(root, 'all');
        a.ok(!shown(root, '.tap-cmp__chip'), 'another mode closes it');
      });
    });

    // Review fix #378 (SV-13): the regions of a chosen set open inside the bar at 1280, 1024 (125%) and 853 px (150%)
    T.test('X-review-SV-13', 'The "Selected regions" popover stays inside the comparison bar at every width', function (a) {
      run(function () {
        var root = startApp(), bar = qs('.tap-cmp', root), out = [];
        clickMode(root, 'set');
        [1280, 1024, 853].forEach(function (w) {
          root.style.width = w + 'px';
          var btn = qs('.tap-cmp__setbtn', root);
          btn.click();
          var pop = qs('.tap-cmp__setpop', root), r = pop.getBoundingClientRect(), b = bar.getBoundingClientRect();
          if (pop.hidden || r.right > b.right + 1 || r.left < b.left - 1) out.push(w + ' px: ' + Math.round(r.left) + ' to ' + Math.round(r.right) + ' in ' + Math.round(b.left) + ' to ' + Math.round(b.right));
          btn.click();
        });
        a.deepEqual(out, [], 'inside the bar');
      });
    });

    T.test('TPV-TC-015', 'The explanation icon shows for combined figures and explains them in plain words', function (a) {
      run(function () {
        var root = startApp();
        var btn = function () { return qs('.tap-cmp__explain', root); };
        ['all', 'set'].forEach(function (m) { clickMode(root, m); a.ok(!shown(root, '.tap-cmp__explain'), 'no icon for ' + m); });
        TAP.store.set({ cmp: { mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'average' } });
        a.ok(shown(root, '.tap-cmp__explain'), 'icon for the average of the rest');
        btn().click();
        a.equal(btn().getAttribute('aria-expanded'), 'true');
        var pop = qs('.tap-cmp__pop', root);
        a.ok(shown(root, '.tap-cmp__pop'), 'explanation shown on click');
        a.ok(txt(pop).indexOf(TAP.content.text('combined.explainAverage')) >= 0, 'average wording');
        a.ok(txt(pop).indexOf(combinedLabel(TAP.store.get().cmp)) >= 0, 'names the combined figure as the charts do');
        qs('[data-picker="rest"] [data-value="total"]', root).click();
        a.ok(txt(qs('.tap-cmp__pop', root)).indexOf(TAP.content.text('combined.explainTotal')) >= 0, 'total wording');
        esc();
        a.ok(!shown(root, '.tap-cmp__pop'), 'Esc closes it');
        clickMode(root, 'all');
        clickMode(root, 'one');
        a.ok(shown(root, '.tap-cmp__explain'), 'icon again on returning to one vs the rest');
        TAP.store.set({ cmp: { mode: 'one', restAs: 'individual' } });
        a.ok(!shown(root, '.tap-cmp__explain'), 'no icon when the others are shown individually');
      });
    });

    T.test('TPV-TC-016', 'The comparison stays when the view changes', function (a) {
      run(function () {
        var root = startApp();
        clickMode(root, 'set');
        var before = JSON.stringify(TAP.store.get().cmp);
        qs('.tap-menu__item[data-view="industry"]', root).click();
        a.equal(JSON.stringify(TAP.store.get().cmp), before, 'state.cmp unchanged');
        a.equal(qs('.tap-cmp__mode[aria-pressed="true"]', root).getAttribute('data-mode'), 'set', 'bar still shows it');
      });
    });

    T.test('TPV-TC-017', 'Changing the comparison redraws in under half a second', function (a) {
      run(function () {
        var root = startApp(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        var t0 = performance.now();
        clickMode(root, 'one');
        qs('[data-picker="rest"] [data-value="total"]', root).click();
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
          qs('[data-picker="rest"] [data-value="individual"]', root).click();
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

    // Review fix #372 (SV-9): with one region there is nothing to combine and no second region to pick.
    T.test('X-review-SV-1', 'With one region, the bar offers no rest picker and no combined-figure explanation', function (a) {
      run(function () {
        var p = T_FIXTURE('mini');
        p.regions = p.regions.slice(0, 1);
        var root = startApp(p);
        clickMode(root, 'one');
        a.deepEqual(pickers(root), ['focus'], 'One vs the rest: the focus picker only');
        a.ok(!shown(root, '.tap-cmp__explain'), 'no explanation of a combined figure');
        clickMode(root, 'set');
        a.deepEqual(TAP.store.get().cmp.set, ['alpha'], 'Selected regions: the one region');
        a.equal(sentence(root), TAP.scope.sentence(TAP.store.get().cmp), 'the sentence follows the scope');
      });
    });

    T.test('X-review-SV-1', 'With two regions, the rest picker and the explanation still show', function (a) {
      run(function () {
        var p = T_FIXTURE('mini');
        p.regions = p.regions.slice(0, 2);
        var root = startApp(p);
        clickMode(root, 'one');
        a.deepEqual(pickers(root), ['focus', 'rest'], 'One vs the rest');
        a.ok(shown(root, '.tap-cmp__explain'), 'the explanation of the combined figure');
        clickMode(root, 'set');
        a.deepEqual(pickers(root), ['set'], 'Selected regions');
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

    T.test('X-d110-scroll-top', 'A new view starts at the top of the page, not where the last view was scrolled (D110)', function (a) {
      var spacer = document.body.appendChild(TAP.dom.el('div', { style: 'height: 4000px' })), y0 = window.scrollY;
      try {
        run(function () {
          startApp();
          window.scrollTo(0, 400);
          a.ok(window.scrollY > 0, 'the page was scrolled down (' + window.scrollY + ')');
          TAP.store.set({ view: 'regions', region: TAP.data.regions()[0].id });
          a.equal(window.scrollY, 0, 'the profile opens at its top');
        });
      } finally { spacer.parentNode.removeChild(spacer); window.scrollTo(0, y0); }
    });

    T.test('X-d110-close-no-scroll', 'Closing a side panel or a source popover gives focus back without scrolling (D110)', function (a) {
      run(function () {
        var root = startApp(), btn = root.appendChild(TAP.dom.el('button', { type: 'button' }, 'Opener')), args = null;
        btn.focus();
        TAP.layers.open('sources');
        btn.focus = function (o) { args = o; };
        TAP.layers.close();
        a.ok(args && args.preventScroll === true, 'the side panel hands focus back with preventScroll');
        TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        var x = window.SAMPLE_EXPECT.sources[0], tip = root.appendChild(TAP.sourceTip.icon(x.src, x.src.kind)), got = null;
        tip.click();
        tip.focus = function (o) { got = o; };
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        a.ok(got && got.preventScroll === true, 'the pinned popover hands focus back with preventScroll');
        TAP.sourceTip.close();
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
        TAP.store.set({ cmp: { mode: 'one', focus: 'charlie', restAs: 'combined', restAgg: 'total' } });
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
          a.ok(txt(row).indexOf(TAP.sources.address(cell.src).text) < 0, 'no address as text (D100)');
          var tip = window.T_TIP_TEXT(qs('.tap-srctip', row));
          a.ok(tip.indexOf(TAP.format.kind('IN').text) >= 0, 'its data icon shows the kind of value, glyph and word');
          a.ok(tip.indexOf(TAP.sources.address(cell.src).text) >= 0, 'and file › sheet › cell');
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

    /* ---------- review chore #374 (SV-6): TAP.app.stop() drops every listener of the running app ---------- */

    T.test('X-review-SV-6', 'After TAP.app.stop() the old frame and comparison bar no longer react', function (a) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
      try {
        TAP.app.stop();
        TAP.bus.emit('details:open', { target: { reportId: 'ov-ambition', regionIds: ['alpha'] } });
        a.equal(TAP.layers.top(), null, 'a details request opens nothing');
        TAP.store.set({ cmp: { mode: 'one', focus: 'alpha' } });
        a.equal(qs('.tap-cmp__mode[data-mode="one"]', root).getAttribute('aria-pressed'), 'false', 'the old bar is not redrawn');
        TAP.store.set({ view: 'industry' });
        a.equal(root.getAttribute('data-view'), 'overview', 'the old frame does not follow the view');
      } finally { TAP.layers.close(); TAP.data.load(T_FIXTURE('mini')); }
    });

    T.test('X-review-SV-6', 'A failed load after a good start leaves nothing of the old app listening', function (a) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: T_FIXTURE('mini') });
      try {
        TAP.app.start({ root: T.dom.mount(), plan: null });
        TAP.bus.emit('details:open', { target: { reportId: 'ov-ambition', regionIds: ['alpha'] } });
        a.equal(TAP.layers.top(), null, 'the shell no longer opens details');
        var e = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true });
        window.dispatchEvent(e);
        a.equal(TAP.store.get().view, 'overview', 'the number keys are unbound');
        a.ok(!e.defaultPrevented, 'and leave the key alone');
      } finally { TAP.layers.close(); TAP.data.load(T_FIXTURE('mini')); }
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

    T.test('X-shell-missing-sample-link', 'The no-data screen links to the sample edition (D67, published site)', function (a) {
      var root = T.dom.mount();
      TAP.app.start({ root: root, plan: null });
      var link = qs('[data-action="open-sample"]', root);
      a.ok(link, 'a link is offered');
      a.equal(link && link.getAttribute('href'), 'index-sample.html', 'it opens the sample edition, by a relative path');
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
      withApp(function () {
        var t0 = performance.now();
        var root = startApp(JSON.parse(JSON.stringify(window.PLAN_DATA)));
        var ms = performance.now() - t0;
        a.ok(TAP.app.current() === 'overview' && root.contains(TAP.shell.viewEl()), 'Overview mounted');
        a.ok(ms < 2000, 'start took ' + Math.round(ms) + ' ms');
      });
    });
  });
})(window.TAP);
