/*
 * File: scripts/qa/watch.js
 * Purpose: Watches a variant QA page while the smoke test runs and reports what should never reach the screen:
 *          markup from the data that ran or became elements, NaN, undefined, null or a raw wording key, and
 *          sideways scrolling. After the smoke test it opens every region profile, a few odd addresses and the
 *          presentation, so those are covered too.
 * Provides: wraps TAP_QA.smoke; reports through console.error lines starting "WATCH" (recorded by hooks.js)
 * Depends on: scripts/qa/hooks.js, scripts/qa/smoke.js (loaded before), the app
 * Used by: the variant pages written by scripts/qa/variants.js
 */
(function () {
  'use strict';

  var QA = window.TAP_QA, seen = {};
  var BAD = /\bNaN\b|\bundefined\b|\bInfinity\b|\[object |\bnull\b|\[[a-z]+[A-Za-z0-9]*(\.[a-zA-Z0-9]+)+\]|Not built yet/g;

  function report(kind, text) {
    var view = window.TAP && TAP.store ? TAP.store.get().view : '?', key = kind + '|' + view + '|' + text;
    if (seen[key]) return;
    seen[key] = 1;
    console.error('WATCH ' + kind + ' [' + view + '] ' + text);
  }

  function scan() {
    var t = document.body.innerText || '', m, n = 0;
    BAD.lastIndex = 0;
    while ((m = BAD.exec(t)) && n++ < 20) report('text', JSON.stringify(t.slice(Math.max(0, m.index - 50), m.index + 40)));
    if (window.__qaProbe) report('markup-ran', 'markup from the data ran as code (' + window.__qaProbe + ' times)');
    var live = document.querySelectorAll('img[src="x"], .tap-app b:not([class]), .tap-app i:not([class])');
    if (live.length) report('markup-elements', live.length + ' elements made from data markup, e.g. ' + live[0].outerHTML.slice(0, 80));
    var sx = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (sx > 1) report('scroll-x', 'the page scrolls sideways by ' + sx + ' px at width ' + window.innerWidth);
  }

  var timer = null;
  new MutationObserver(function () { if (!timer) timer = setTimeout(function () { timer = null; scan(); }, 30); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  function key(k, code) {
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true, cancelable: true }));
  }

  // Steps after the smoke test: every profile, odd addresses (D76), presentation mode.
  function extras(steps, done) {
    var plan = [];
    function add(name, fn) { plan.push({ name: 'extra: ' + name, fn: fn }); }
    TAP.data.regions().forEach(function (r) {
      add('profile ' + r.id, function () { window.location.hash = '#regions/' + encodeURIComponent(r.id); });
      add('profile ' + r.id + ' drawn', function () {
        var v = document.querySelector('.tap-view');
        if (TAP.store.get().region !== r.id) throw new Error('state.region is ' + TAP.store.get().region);
        if (!v || (v.innerText || '').trim().length < 50) throw new Error('the profile is nearly empty');
      });
    });
    ['#other', '#no-such-view', '#regions/no-such-region', '#overview'].forEach(function (h) {
      add('address ' + h, function () { window.location.hash = h; });
      add('address ' + h + ': result', function () {
        var s = TAP.store.get();
        return 'view ' + s.view + ', region ' + s.region + ', address ' + window.location.hash;
      });
    });
    add('present: P', function () { key('p', 'KeyP'); });
    add('present: started', function () { if (!TAP.present.active()) throw new Error('presentation did not start'); });
    for (var i = 0; i < 12; i++) add('present: next', function () { if (TAP.present.active()) key('ArrowRight'); });
    add('present: Esc', function () { key('Escape'); });
    add('present: ended', function () { if (TAP.present.active()) key('Escape'); if (TAP.present.active()) throw new Error('still presenting'); });

    var i2 = 0;
    (function next() {
      if (i2 >= plan.length) { done(steps); return; }
      var s = plan[i2++], before = QA.log.length, rec = { name: s.name, ok: true };
      QA.mark(rec.name);
      try { var note = s.fn(); if (note) rec.note = note; } catch (e) { rec.ok = false; rec.note = e.message; }
      setTimeout(function () {
        scan();
        var errs = QA.log.slice(before).filter(function (x) { return x.level !== 'warn'; });
        if (errs.length) { rec.ok = false; rec.errors = errs.map(function (x) { return x.level + ': ' + x.text; }); }
        steps.push(rec);
        next();
      }, 120);
    })();
  }

  var smoke = QA.smoke;
  QA.smoke = function (done) { smoke(function (steps) { extras(steps, done); }); };
})();
