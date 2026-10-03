/*
 * File: scripts/qa/qa-run.js
 * Purpose: Runs the QA checks named in the page address once the app has drawn, then writes the results into
 *          the page for the shell scripts to read: ?qa=console, text, offline, smoke (comma list, or all).
 * Provides: nothing global; fills TAP_QA.result and calls TAP_QA.done()
 * Depends on: scripts/qa/hooks.js, scripts/qa/text-size.js, scripts/qa/smoke.js, the app (TAP)
 * Used by: tests/qa.html (loaded last)
 */
(function () {
  'use strict';

  var QA = window.TAP_QA;
  var q = new URLSearchParams(window.location.search);
  var want = (q.get('qa') || 'console').split(',');
  var settle = +(q.get('settle') || 1500);
  function on(name) { return want.indexOf('all') >= 0 || want.indexOf(name) >= 0; }

  // What is on screen: enough to tell a drawn app from a blank or error page.
  function render() {
    var view = document.querySelector('.tap-view');
    var txt = document.body.innerText || '';
    var shown = function (sel) {
      return Array.prototype.filter.call(document.querySelectorAll(sel), function (n) { return n.getClientRects().length; }).length;
    };
    var banners = Array.prototype.map.call(document.querySelectorAll('.tap-banner'), function (n) { return n.textContent.trim(); });
    return {
      view: window.TAP && TAP.store ? TAP.store.get().view : null,
      cmp: window.TAP && TAP.store ? TAP.store.get().cmp : null,
      sentence: (document.querySelector('.tap-cmp__sentence') || {}).textContent || null,
      banners: banners,
      screen: !!document.querySelector('.tap-screen'),
      viewChars: view ? (view.innerText || '').length : 0,
      panels: shown('.tap-panel'),
      charts: document.querySelectorAll('[_echarts_instance_]').length,
      notBuilt: (txt.match(/Not built yet[^\n]*/g) || []).slice(0, 10),
      missingText: (txt.match(/\[[a-z]+(\.[a-zA-Z0-9]+)+\]/g) || []).slice(0, 10),
      scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      width: window.innerWidth
    };
  }

  // Every request the page made, by scheme; anything not file:, data: or blob: went to a network.
  function requests() {
    var entries = performance.getEntriesByType('resource').map(function (e) { return e.name; });
    entries.unshift(window.location.href.split('?')[0]);
    var web = entries.filter(function (u) { return !/^(file|data|blob|about):/.test(u); });
    var faces = [];
    if (document.fonts && document.fonts.forEach) {
      document.fonts.forEach(function (f) { faces.push({ family: f.family.replace(/["']/g, ''), weight: f.weight, status: f.status }); });
    }
    var shipped = Array.prototype.map.call(document.querySelectorAll('script[src], link[href]'), function (n) {
      return n.src || n.href;
    });
    return {
      total: entries.length, web: web, entries: entries.slice(0, 200),
      fonts: faces, archivo: !!(document.fonts && document.fonts.check('16px Archivo')),
      echarts: typeof window.echarts !== 'undefined' ? window.echarts.version : null,
      echartsSrc: shipped.filter(function (u) { return /echarts/.test(u); }),
      nonFileRefs: shipped.filter(function (u) { return !/^file:/.test(u); })
    };
  }

  function finish() {
    QA.mark('report');
    QA.result.render = render();
    QA.done();
  }

  function run() {
    QA.mark('checks');
    QA.result.query = window.location.search;
    QA.result.render0 = render();
    if (on('text')) QA.result.text = QA.textSize(document.body);
    if (on('offline')) QA.result.offline = requests();
    if (on('smoke') && QA.smoke) {
      QA.smoke(function (steps) { QA.result.smoke = steps; finish(); });
      return;
    }
    finish();
  }

  window.addEventListener('load', function () { setTimeout(run, settle); });
})();
