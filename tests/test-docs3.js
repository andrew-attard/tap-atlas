/*
 * File: tests/test-docs3.js
 * Purpose: Tests for the handover pack and portfolio pages. Most of these are file checks, which the browser
 *          can't make from the test page, so they run in tools/check-docs3.js and are listed here as skipped.
 * Provides: test cases TPV-TC-615, TPV-TC-617, TPV-TC-621, TPV-TC-623, TPV-TC-627, TPV-TC-628
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, data/sample-plan-data.js, index-sample.html
 * Used by: tests.html
 * Owner: DOCS3 stream
 */
(function (TAP) {
  'use strict';

  var FILE_CHECK = 'Checked by tools/check-docs3.js in scripts/verify.sh';

  function empty(o) { return o == null || (typeof o === 'object' && Object.keys(o).length === 0); }

  // Opens a page of the folder in a hidden frame and waits until its app has drawn the banner.
  // Resolves with the frame's window, or null when the browser won't let one file read another's page
  // (a double-clicked test page; the headless runs allow it).
  function framePage(src, ms) {
    var frame = TAP.dom.el('iframe', { src: src, title: 'page under test', 'aria-hidden': 'true', tabindex: '-1' });
    frame.style.position = 'absolute';
    frame.style.left = '-10000px';
    frame.style.width = '1280px';
    frame.style.height = '800px';
    document.body.appendChild(frame);
    var start = Date.now();
    return new Promise(function (resolve) {
      (function poll() {
        var win = null, doc = null;
        try {
          win = frame.contentWindow;
          doc = win.document;
          if (doc) doc.querySelector('body');
        } catch (e) {
          resolve({ frame: frame, win: null, blocked: true });
          return;
        }
        if (!doc && Date.now() - start > 300) { resolve({ frame: frame, win: null, blocked: true }); return; }
        var drawn = doc && win.TAP && win.TAP.shell && doc.querySelector('.tap-banner');
        if (drawn) { resolve({ frame: frame, win: win, blocked: false }); return; }
        if (Date.now() - start > ms) { resolve({ frame: frame, win: win, blocked: false, timedOut: true }); return; }
        setTimeout(poll, 50);
      })();
    });
  }

  T.suite('docs3', function () {
    T.skip('TPV-TC-621', 'index-sample.html and every file it loads use relative paths only and nothing depends on file://',
      FILE_CHECK);
    T.skip('TPV-TC-615', 'Every link and image path in docs/index.html is relative and points to a file that exists', FILE_CHECK);
    T.skip('TPV-TC-617', 'docs/index.html has no denylisted term', 'Checked by the denylist scan in scripts/verify.sh');
    T.skip('TPV-TC-627', 'docs/screenshots holds one 1440 x 900 image per view', FILE_CHECK);
    T.skip('TPV-TC-628', 'Screenshot names are stable and match every path in docs/index.html and docs/CASE-STUDY.md', FILE_CHECK);

    // The test page loads the same app scripts as index-sample.html, without an organization layer,
    // so this part always runs; the real page is checked in a frame when the browser allows it.
    T.test('TPV-TC-623', 'Sample data on the app scripts: no organization layer and the sample label', function (a) {
      TAP.data.load(JSON.parse(JSON.stringify(window.PLAN_DATA)));
      a.ok(empty(window.TAP_ORG), 'TAP_ORG is empty on a page without the organization file');
      var l = TAP.shell.label();
      a.equal(l && l.kind, 'sample', 'data status label kind');
      a.equal(l && l.text, TAP.content.text('banner.sample'), 'data status label text');
    });

    T.test('TPV-TC-623', 'index-sample.html loads no organization file, TAP_ORG is empty, the label is the sample one', function (a) {
      return framePage('index-sample.html', 2600).then(function (r) {
        try {
          if (r.blocked) {
            // Can't look inside another file from a double-clicked page; the file check covers the script list.
            a.ok(true, 'frame not readable here; the script list is checked by tools/check-docs3.js');
            return;
          }
          a.ok(!r.timedOut, 'the sample edition drew its banner in time');
          var srcs = Array.prototype.map.call(r.win.document.querySelectorAll('script[src]'), function (s) {
            return s.getAttribute('src');
          });
          a.ok(srcs.indexOf('data/sample-plan-data.js') >= 0, 'the sample data file is loaded');
          a.deepEqual(srcs.filter(function (s) { return /organization/.test(s) || s === 'data/plan-data.js'; }), [],
            'organization or real data files loaded');
          a.ok(empty(r.win.TAP_ORG), 'TAP_ORG is empty in the sample edition');
          var l = r.win.TAP.shell.label();
          a.equal(l && l.kind, 'sample', 'data status label kind');
          var banner = r.win.document.querySelector('.tap-banner');
          a.equal(banner && banner.textContent.trim(), r.win.TAP.content.text('banner.sample'), 'banner text on screen');
        } finally {
          r.frame.parentNode.removeChild(r.frame);
        }
      });
    });
  });
})(window.TAP);
