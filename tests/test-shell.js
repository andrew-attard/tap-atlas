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
})(window.TAP);
