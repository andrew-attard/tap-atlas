/*
 * File: js/core/tap.js
 * Purpose: lint fixture.
 * Provides: nothing
 * Depends on: nothing
 * Used by: tools/lint.js --self-test
 */
// Docs live at https://example.com/docs, which is fine inside a comment.
window.TAP = window.TAP || {};
(function () {
  var SVG = 'http://www.w3.org/2000/svg';
  var XL = 'http://www.w3.org/1999/xlink';
  var REPO = 'https://github.com/andrew-attard/tap-atlas/issues';
  var quote = /["'`]/g;
  var slashes = /\/\//;
  function show(el, safe) { el.innerHTML = safe; } // html-ok: input is escaped first
  TAP.ns = { svg: SVG, xlink: XL, repo: REPO, q: quote, s: slashes, show: show, sel: '#t-results' };
})();
