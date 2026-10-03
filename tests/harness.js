/*
 * File: tests/harness.js
 * Purpose: Small in-browser test runner that works from file:// with nothing installed.
 * Provides: window.T (suite, test, skip, run, dom, ids, list, release, timeout, resultsText, create)
 * Depends on: nothing (tests/harness.css for looks)
 * Used by: tests.html, tests/selftest.html and every tests/test-*.js file
 */
(function () {
  'use strict';

  var ID_RE = /^(TPV-TC-\d{3,4}|X-[A-Za-z0-9][A-Za-z0-9_.-]*)$/;
  var MAX_SHOW = 1500;

  // The harness that is currently running receives page errors, so a small
  // harness run inside a self-check keeps its stray errors to itself.
  var active = null;
  var early = [];

  function onPageError(msg) {
    if (active) active.pageErrors.push(msg);
    else early.push(msg);
  }

  // Capture phase also catches scripts or styles that fail to load.
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      onPageError('Failed to load ' + (t.src || t.href));
      return;
    }
    var where = e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '';
    onPageError((e.message || 'Unknown error') + where);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    onPageError('Unhandled rejection: ' + (r && r.message ? r.message : String(r)));
  });

  // ---- value display ----

  function show(v) {
    var seen = [];
    var s;
    if (v === undefined) return 'undefined';
    if (typeof v === 'number' && !isFinite(v)) return String(v);
    if (typeof v === 'function') return 'function ' + (v.name || '(anonymous)');
    try {
      s = JSON.stringify(v, function (k, x) {
        if (x === undefined) return '(undefined)';
        if (typeof x === 'number' && !isFinite(x)) return '(' + String(x) + ')';
        if (typeof x === 'function') return '(function)';
        if (x instanceof RegExp) return String(x);
        if (x && typeof x === 'object') {
          if (seen.indexOf(x) !== -1) return '(circular)';
          seen.push(x);
          if (!Array.isArray(x) && !(x instanceof Date)) {
            var sorted = {};
            Object.keys(x).sort().forEach(function (key) { sorted[key] = x[key]; });
            return sorted;
          }
        }
        return x;
      }, 2);
    } catch (err) {
      s = String(v);
    }
    if (s === undefined) s = String(v);
    if (s.length > MAX_SHOW) {
      s = s.slice(0, MAX_SHOW) + '\n... (truncated, ' + (s.length - MAX_SHOW) + ' more characters)';
    }
    return s;
  }

  function deepEq(x, y, depth) {
    if (x === y) return true;
    if (typeof x === 'number' && typeof y === 'number') return x !== x && y !== y;
    if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return false;
    if (depth > 100) return false;
    if (Array.isArray(x) !== Array.isArray(y)) return false;
    if (x instanceof Date || y instanceof Date) {
      return x instanceof Date && y instanceof Date && x.getTime() === y.getTime();
    }
    var kx = Object.keys(x);
    var ky = Object.keys(y);
    if (kx.length !== ky.length) return false;
    for (var i = 0; i < kx.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(y, kx[i])) return false;
      if (!deepEq(x[kx[i]], y[kx[i]], depth + 1)) return false;
    }
    return true;
  }

  // ---- assertions ----

  function Failure(message, expected, found) {
    this.message = message;
    this.expected = expected;
    this.found = found;
  }

  function makeAsserter(ctx) {
    function check(pass, msg, defMsg, expected, found) {
      ctx.count++;
      if (pass) return;
      var f = new Failure(msg || defMsg, expected, found);
      // Keep the first failure even if the code under test swallows the throw.
      if (!ctx.failure) ctx.failure = f;
      throw f;
    }
    return {
      ok: function (v, msg) {
        check(!!v, msg, 'expected a truthy value', 'truthy', show(v));
      },
      equal: function (actual, expected, msg) {
        check(actual === expected, msg, 'values are not equal (===)', show(expected), show(actual));
      },
      deepEqual: function (actual, expected, msg) {
        check(deepEq(actual, expected, 0), msg, 'values are not deeply equal', show(expected), show(actual));
      },
      near: function (actual, expected, tol, msg) {
        var pass = typeof actual === 'number' && Math.abs(actual - expected) <= tol;
        check(pass, msg, 'number is outside the tolerance', show(expected) + ' ± ' + tol, show(actual));
      },
      throws: function (fn, msg) {
        var threw = false;
        var ret;
        try { ret = fn(); } catch (e) { threw = true; }
        check(threw, msg, 'expected the function to throw', 'an error to be thrown', 'returned ' + show(ret));
      },
      match: function (str, re, msg) {
        var pass = typeof str === 'string' && re.test(str);
        check(pass, msg, 'string does not match', 'a string matching ' + String(re), show(str));
      }
    };
  }

  // ---- sandbox for DOM tests ----

  var mounts = [];
  var dom = {
    mount: function () {
      var box = document.getElementById('t-sandbox');
      if (!box) {
        box = document.createElement('div');
        box.id = 't-sandbox';
        box.setAttribute('aria-hidden', 'true');
        document.body.appendChild(box);
      }
      var el = document.createElement('div');
      box.appendChild(el);
      mounts.push(el);
      return el;
    },
    cleanup: function () { cleanupFrom(0); }
  };

  // Only remove what was mounted since `mark`, so a nested run keeps the outer test's nodes.
  function cleanupFrom(mark) {
    while (mounts.length > mark) {
      var el = mounts.pop();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }

  // ---- one harness instance ----

  function param(query, name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(query || '');
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  function listParam(query, name) {
    var v = param(query, name);
    return v ? v.split(',').map(function (s) { return s.trim().toLowerCase(); }) : null;
  }

  function create(opts) {
    opts = opts || {};
    var isGlobal = !!opts.global;
    var query = opts.query !== undefined ? opts.query : (isGlobal ? window.location.search : '');
    var registry = [];
    var currentSuite = '';
    var running = null;

    var h = {
      timeout: opts.timeout || 3000,
      results: null,
      pageErrors: [],
      dom: dom,
      create: create
    };

    h.suite = function (name, fn) {
      var prev = currentSuite;
      currentSuite = name;
      try { fn(); } finally { currentSuite = prev; }
    };

    h.test = function (id, title, fn) {
      registry.push({ suite: currentSuite, id: String(id), title: title || '', fn: fn });
    };

    h.skip = function (id, title, reason) {
      registry.push({ suite: currentSuite, id: String(id), title: title || '', skip: reason || 'skipped' });
    };

    h.release = param(query, 'release') === '1';

    // Registered ids, without repeats, in registration order (for the coverage check).
    h.ids = function () {
      var seen = {};
      return registry.map(function (t) { return t.id; }).filter(function (id) {
        if (seen[id]) return false;
        seen[id] = true;
        return true;
      });
    };

    h.list = function () {
      return registry.map(function (t) {
        return { suite: t.suite, id: t.id, title: t.title, skip: !!t.skip };
      });
    };

    function selected() {
      var only = listParam(query, 'only');
      var suites = listParam(query, 'suite');
      return {
        filtered: !!(only || suites),
        tests: registry.filter(function (t) {
          if (only && only.indexOf(t.id.toLowerCase()) === -1) return false;
          if (suites && suites.indexOf(t.suite.toLowerCase()) === -1) return false;
          return true;
        })
      };
    }

    function runOne(t) {
      var r = { suite: t.suite, id: t.id, title: t.title, status: 'pass', ms: 0, message: '', expected: '', found: '' };
      if (t.skip) {
        r.status = 'skip';
        r.message = t.skip;
        return Promise.resolve(r);
      }
      if (!ID_RE.test(t.id)) {
        r.status = 'fail';
        r.message = 'Invalid test id (use TPV-TC-nnn or X-name)';
        r.expected = 'TPV-TC-nnn or X-...';
        r.found = show(t.id);
        return Promise.resolve(r);
      }
      var ctx = { count: 0, failure: null };
      var mark = mounts.length;
      var start = performance.now();
      var timer;
      var hook = isGlobal ? window.T_BEFORE_EACH : opts.beforeEach;

      var body = Promise.resolve()
        .then(function () { if (typeof hook === 'function') return hook(); })
        .then(function () { return t.fn(makeAsserter(ctx)); });
      var limit = new Promise(function (resolve, reject) {
        timer = setTimeout(function () {
          reject(new Failure('Timed out after ' + h.timeout + ' ms', 'the test to finish', 'still running'));
        }, h.timeout);
      });

      return Promise.race([body, limit]).then(function () {
        if (ctx.failure) throw ctx.failure;
        if (ctx.count === 0) throw new Failure('Test made no assertions', 'at least one assertion', '0 assertions');
      }).catch(function (e) {
        var f = ctx.failure || e;
        r.status = 'fail';
        if (f instanceof Failure) {
          r.message = f.message;
          r.expected = f.expected;
          r.found = f.found;
        } else {
          r.message = 'Threw: ' + (f && f.message ? f.message : String(f));
          r.expected = 'no error';
          r.found = f && f.stack ? String(f.stack).split('\n').slice(0, 4).join('\n') : show(f);
        }
      }).then(function () {
        clearTimeout(timer);
        try { cleanupFrom(mark); } catch (err) { /* a broken node must not stop the run */ }
        r.ms = Math.round(performance.now() - start);
        return r;
      });
    }

    function pendingRows(tests) {
      var cases = opts.autoCases !== undefined ? opts.autoCases : (isGlobal ? window.TAP_AUTO_CASES : null);
      if (!Array.isArray(cases)) return [];
      var have = {};
      registry.forEach(function (t) { have[t.id] = true; });
      var release = param(query, 'release') === '1';
      return cases.filter(function (c) { return !have[c.id]; }).map(function (c) {
        return {
          suite: '(pending)', id: c.id, title: c.text || '', ms: 0,
          status: release ? 'fail' : 'pending',
          message: release ? 'No test registered for this automated case (release mode)' : 'No test registered yet',
          expected: release ? 'a registered test' : '', found: release ? 'none' : ''
        };
      });
    }

    function errorRows(list) {
      return list.map(function (msg) {
        return {
          suite: '(page)', id: 'X-page-error', title: msg, status: 'fail', ms: 0,
          message: msg, expected: 'no uncaught errors', found: msg
        };
      });
    }

    function summarise(rows, done) {
      var out = { done: done, passed: 0, failed: 0, skipped: 0, pending: 0, total: rows.length,
        release: param(query, 'release') === '1', results: rows,
        ids: { passed: 0, failed: 0, skipped: 0, pending: 0 } };
      var key = { pass: 'passed', fail: 'failed', skip: 'skipped', pending: 'pending' };
      var byId = {};
      rows.forEach(function (r) {
        out[key[r.status]]++;
        var prev = byId[r.id];
        // An id fails if any of its tests fail, and passes only if none fail.
        var rank = { fail: 4, pass: 3, pending: 2, skip: 1 };
        if (!prev || rank[r.status] > rank[prev]) byId[r.id] = r.status;
      });
      Object.keys(byId).forEach(function (id) { out.ids[key[byId[id]]]++; });
      return out;
    }

    h.run = function () {
      if (running) return running;
      var outer = active;
      active = h;
      if (isGlobal) {
        h.pageErrors = early.slice();
        early.length = 0;
      }
      var pick = selected();
      var rows = [];
      var ui = makeUi(h, opts, isGlobal);
      if (ui) ui.start(pick.tests.length);

      running = pick.tests.reduce(function (p, t) {
        return p.then(function () {
          return runOne(t).then(function (r) {
            rows.push(r);
            if (ui) ui.progress(rows.length, pick.tests.length);
          });
        });
      }, Promise.resolve()).then(function () {
        // Give stray async errors from the last test a moment to surface.
        return new Promise(function (resolve) { setTimeout(resolve, 0); });
      }).then(function () {
        active = outer;
        if (!pick.filtered) rows = rows.concat(pendingRows());
        rows = rows.concat(errorRows(h.pageErrors));
        h.results = summarise(rows, true);
        if (ui) ui.finish(h.results);
        return h.results;
      });
      return running;
    };

    h.resultsText = function () {
      var res = h.results;
      if (!res) return 'Not run yet';
      var label = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP', pending: 'PENDING' };
      var lines = res.results.map(function (r) {
        return (label[r.status] + '       ').slice(0, 8) + ' ' + r.id + '  ' + r.title;
      });
      var fails = res.results.filter(function (r) { return r.status === 'fail'; });
      if (fails.length) {
        lines.push('', 'Failures:');
        fails.forEach(function (r) {
          lines.push('FAIL ' + r.id + '  ' + r.title + (r.suite ? '  [' + r.suite + ']' : ''));
          lines.push('  message: ' + r.message);
          lines.push('  expected: ' + String(r.expected).replace(/\n/g, '\n    '));
          lines.push('  found: ' + String(r.found).replace(/\n/g, '\n    '));
        });
      }
      lines.push('', headline(res) + ' (' + counts(res) + ')' +
        (isGlobal ? ' ' + window.location.pathname.split('/').pop() + ' ' + new Date().toISOString() : ''));
      return lines.join('\n');
    };

    return h;
  }

  function headline(res) {
    var ran = res.passed + res.failed;
    return res.failed ? 'FAIL ' + res.failed + '/' + ran : 'PASS ' + res.passed + '/' + ran;
  }

  function counts(res) {
    return res.passed + ' passed, ' + res.failed + ' failed, ' + res.skipped + ' skipped, ' + res.pending + ' pending';
  }

  // ---- page output ----

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function copyText(text) {
    function fallback() {
      var ta = el('textarea', 't-copy-buffer');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok ? Promise.resolve() : Promise.reject(new Error('copy blocked'));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return fallback();
  }

  // Global runs use the fixed ids (#t-results, #t-json); nested runs use classes only.
  function makeUi(h, opts, isGlobal) {
    var root = opts.root || (isGlobal ? document.getElementById('t-root') || document.body : null);
    if (!root) return null;
    function find(id, tag) {
      var e = isGlobal ? document.getElementById(id) : null;
      if (!e) {
        e = el(tag, id);
        if (isGlobal) e.id = id;
        root.appendChild(e);
      }
      return e;
    }
    var banner = find('t-summary', 'div');
    var results = find('t-results', 'div');
    var jsonBox = find('t-json-wrap', 'details');
    var json;

    return {
      start: function (n) {
        banner.className = 't-summary t-running';
        banner.textContent = 'Running ' + n + ' tests...';
        while (results.firstChild) results.removeChild(results.firstChild);
        var old = isGlobal ? document.getElementById('t-json') : null;
        if (old && old.parentNode) old.parentNode.removeChild(old);
      },
      progress: function (i, n) { banner.textContent = 'Running ' + i + '/' + n + '...'; },
      finish: function (res) {
        var ok = res.failed === 0;
        banner.className = 't-summary ' + (ok ? 't-pass' : 't-fail');
        banner.textContent = '';
        banner.appendChild(el('strong', 't-headline', headline(res)));
        banner.appendChild(el('span', 't-counts', ' ' + counts(res) + (res.release ? ' (release mode)' : '')));
        var btn = el('button', 't-copy', 'Copy results');
        btn.type = 'button';
        var note = el('span', 't-copy-note', '');
        btn.addEventListener('click', function () {
          copyText(h.resultsText()).then(function () { note.textContent = 'Copied'; },
            function () { note.textContent = 'Copy was blocked: select the text in the box below instead'; });
        });
        if (isGlobal) btn.id = 't-copy';
        banner.appendChild(btn);
        banner.appendChild(note);
        // With hundreds of rows, list the failures first so they are seen without scrolling.
        var fails = res.results.filter(function (r) { return r.status === 'fail'; });
        if (fails.length) {
          var list = el('ul', 't-fail-list');
          fails.forEach(function (r) { list.appendChild(el('li', '', r.id + '  ' + r.title + ': ' + r.message)); });
          results.appendChild(list);
        }
        results.appendChild(table(res));
        if (!jsonBox.firstChild) jsonBox.appendChild(el('summary', '', 'Results as text and JSON'));
        var plain = el('pre', 't-plain', h.resultsText());
        json = el('pre', 't-json', JSON.stringify(res));
        if (isGlobal) json.id = 't-json';
        jsonBox.appendChild(plain);
        jsonBox.appendChild(json);
        if (isGlobal) document.title = headline(res);
      }
    };
  }

  function table(res) {
    var tbl = el('table', 't-table');
    var head = el('tr');
    ['Status', 'Suite', 'ID', 'Title', 'ms'].forEach(function (c) { head.appendChild(el('th', '', c)); });
    var thead = el('thead');
    thead.appendChild(head);
    tbl.appendChild(thead);
    var body = el('tbody');
    res.results.forEach(function (r) {
      var tr = el('tr', 't-row t-' + r.status);
      tr.setAttribute('data-id', r.id);
      tr.setAttribute('data-status', r.status);
      [r.status, r.suite, r.id, r.title, String(r.ms)].forEach(function (c, i) {
        tr.appendChild(el('td', i === 0 ? 't-status' : '', c));
      });
      body.appendChild(tr);
      if (r.status === 'fail' || r.status === 'skip' || r.status === 'pending') {
        var dt = el('tr', 't-detail t-' + r.status);
        var td = el('td', '');
        td.colSpan = 5;
        td.appendChild(el('div', 't-message', r.message));
        if (r.status === 'fail') {
          var grid = el('div', 't-diff');
          grid.appendChild(el('div', 't-label', 'Expected'));
          grid.appendChild(el('pre', 't-expected', String(r.expected)));
          grid.appendChild(el('div', 't-label', 'Found'));
          grid.appendChild(el('pre', 't-found', String(r.found)));
          td.appendChild(grid);
        }
        dt.appendChild(td);
        body.appendChild(dt);
      }
    });
    tbl.appendChild(body);
    return tbl;
  }

  var T = create({ global: true });
  window.T = T;

  window.addEventListener('load', function () {
    if (document.body && document.body.getAttribute('data-autorun') === 'false') return;
    T.run();
  });
})();
