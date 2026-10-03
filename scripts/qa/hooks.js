/*
 * File: scripts/qa/hooks.js
 * Purpose: Loaded first on the QA page: records console errors and warnings, uncaught exceptions, rejected
 *          promises and files that failed to load, so the QA checks can report them with their level.
 * Provides: window.TAP_QA (log, mark, result, done)
 * Depends on: nothing (runs before every app script)
 * Used by: tests/qa.html, scripts/qa/text-size.js, scripts/qa/smoke.js, scripts/qa/qa-run.js
 */
(function () {
  'use strict';

  var log = [];       // {level: 'error'|'warn'|'exception'|'rejection'|'resource', text, step}
  var step = 'load';  // the check running when a message arrived

  function text(args) {
    return Array.prototype.map.call(args, function (a) {
      if (a && a.stack) return String(a.stack).split('\n').slice(0, 3).join(' | ');
      if (a && typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
      return String(a);
    }).join(' ');
  }

  function add(level, msg) { log.push({ level: level, text: msg, step: step }); }

  ['error', 'warn'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      add(level, text(arguments));
      return orig.apply(console, arguments);
    };
  });

  // Capture phase: a script, stylesheet, font or image that fails to load fires 'error' on its element.
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      add('resource', 'failed to load ' + (t.tagName || '').toLowerCase() + ': ' + (t.src || t.href));
      return;
    }
    add('exception', (e.message || 'error') + (e.filename ? ' at ' + e.filename.split('/').slice(-2).join('/') + ':' + e.lineno : '') +
      (e.error && e.error.stack ? ' | ' + String(e.error.stack).split('\n').slice(1, 3).join(' | ') : ''));
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    add('rejection', r && r.message ? r.message : String(r));
  });

  var result = {};
  window.TAP_QA = {
    log: log,
    mark: function (name) { step = name; },
    result: result,
    // Writes everything into the page as JSON, where the dumped DOM can be read by scripts/qa/parse-qa.js.
    done: function () {
      result.log = log;
      var pre = document.getElementById('qa-result') || document.createElement('pre');
      pre.id = 'qa-result';
      pre.hidden = true;
      pre.textContent = JSON.stringify(result);
      if (!pre.parentNode) document.body.appendChild(pre);
      document.title = 'QA done';
    }
  };
})();
