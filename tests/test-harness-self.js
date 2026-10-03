/*
 * File: tests/test-harness-self.js
 * Purpose: Proves the test harness itself works, by running small throwaway harnesses inside it.
 * Provides: self-check tests registered with T (ids X-harness-*)
 * Depends on: tests/harness.js
 * Used by: tests/selftest.html
 */
(function () {
  'use strict';

  // Each check builds its own harness with T.create so its results can be inspected
  // without touching the page's own run.
  function runInner(setup, opts) {
    var h = T.create(opts || {});
    setup(h);
    return h.run();
  }

  function byId(res, id) {
    return res.results.filter(function (r) { return r.id === id; });
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  T.suite('harness', function () {
    T.test('X-harness-pass', 'a passing sync test is recorded as pass with a time', function (a) {
      return runInner(function (h) {
        h.test('TPV-TC-901', 'adds', function (b) { b.equal(1 + 1, 2); });
      }).then(function (res) {
        a.equal(res.done, true, 'run finished');
        a.equal(res.passed, 1, 'one pass');
        a.equal(res.failed, 0, 'no failures');
        a.equal(res.results[0].status, 'pass');
        a.equal(typeof res.results[0].ms, 'number', 'ms recorded');
      });
    });

    T.test('X-harness-fail-detail', 'a failing equal records message, expected and found', function (a) {
      return runInner(function (h) {
        h.test('TPV-TC-902', 'bad sum', function (b) { b.equal(2, 3, 'sum is wrong'); });
      }).then(function (res) {
        var r = res.results[0];
        a.equal(r.status, 'fail');
        a.equal(r.message, 'sum is wrong');
        a.equal(r.expected, '3');
        a.equal(r.found, '2');
        a.equal(res.failed, 1);
      });
    });

    T.test('X-harness-deep-equal', 'deepEqual ignores key order but not values', function (a) {
      return runInner(function (h) {
        h.test('X-in-deep-ok', 'same', function (b) {
          b.deepEqual({ x: 1, y: [1, { z: 2 }] }, { y: [1, { z: 2 }], x: 1 });
        });
        h.test('X-in-deep-bad', 'different', function (b) {
          b.deepEqual({ x: 1, y: [1, 2] }, { x: 1, y: [2, 1] }, 'order of arrays matters');
        });
      }).then(function (res) {
        a.equal(byId(res, 'X-in-deep-ok')[0].status, 'pass');
        var bad = byId(res, 'X-in-deep-bad')[0];
        a.equal(bad.status, 'fail');
        a.match(bad.expected, /"y": \[\s*2,\s*1\s*\]/, 'expected is pretty JSON');
        a.match(bad.found, /"y": \[\s*1,\s*2\s*\]/, 'found is pretty JSON');
      });
    });

    T.test('X-harness-assertions', 'near, throws, match and ok pass and fail correctly', function (a) {
      return runInner(function (h) {
        h.test('X-in-near-ok', '', function (b) { b.near(0.1 + 0.2, 0.3, 1e-9); });
        h.test('X-in-near-bad', '', function (b) { b.near(1.5, 1, 0.1, 'too far'); });
        h.test('X-in-throws-ok', '', function (b) { b.throws(function () { throw new Error('x'); }); });
        h.test('X-in-throws-bad', '', function (b) { b.throws(function () { return 5; }, 'should throw'); });
        h.test('X-in-match-ok', '', function (b) { b.match('1,234', /^\d,\d{3}$/); });
        h.test('X-in-match-bad', '', function (b) { b.match('1234', /,/, 'needs comma'); });
        h.test('X-in-ok-bad', '', function (b) { b.ok(0, 'zero is falsy'); });
      }).then(function (res) {
        ['X-in-near-ok', 'X-in-throws-ok', 'X-in-match-ok'].forEach(function (id) {
          a.equal(byId(res, id)[0].status, 'pass', id);
        });
        ['X-in-near-bad', 'X-in-throws-bad', 'X-in-match-bad', 'X-in-ok-bad'].forEach(function (id) {
          a.equal(byId(res, id)[0].status, 'fail', id);
        });
        a.match(byId(res, 'X-in-near-bad')[0].expected, /1 ± 0\.1/, 'near shows tolerance');
        a.equal(byId(res, 'X-in-near-bad')[0].found, '1.5');
        a.match(byId(res, 'X-in-throws-bad')[0].found, /returned 5/);
        a.equal(byId(res, 'X-in-match-bad')[0].expected, 'a string matching /,/');
      });
    });

    T.test('X-harness-async', 'async tests pass on resolve and fail on reject', function (a) {
      return runInner(function (h) {
        h.test('X-in-async-ok', '', function (b) {
          return wait(20).then(function () { b.equal('a', 'a'); });
        });
        h.test('X-in-async-bad', '', function (b) {
          b.ok(true);
          return wait(5).then(function () { throw new Error('async broke'); });
        });
        h.test('X-in-async-assert', '', function (b) {
          return wait(5).then(function () { b.equal(1, 2, 'late assert'); });
        });
      }).then(function (res) {
        a.equal(byId(res, 'X-in-async-ok')[0].status, 'pass');
        var bad = byId(res, 'X-in-async-bad')[0];
        a.equal(bad.status, 'fail');
        a.match(bad.found, /async broke/);
        a.equal(byId(res, 'X-in-async-assert')[0].message, 'late assert');
      });
    });

    T.test('X-harness-timeout', 'a test that never settles fails after the timeout', function (a) {
      return runInner(function (h) {
        h.timeout = 50;
        h.test('X-in-hang', 'never resolves', function (b) {
          b.ok(true);
          return new Promise(function () {});
        });
        h.test('X-in-after', 'still runs', function (b) { b.ok(true); });
      }).then(function (res) {
        var hang = byId(res, 'X-in-hang')[0];
        a.equal(hang.status, 'fail');
        a.match(hang.message, /timed out after 50 ms/i);
        a.equal(byId(res, 'X-in-after')[0].status, 'pass', 'next test still runs');
      });
    });

    T.test('X-harness-pending', 'auto cases without a test are pending, and fail in release mode', function (a) {
      var cases = [
        { id: 'TPV-TC-910', story: 'US-0.0.1', smoke: false, text: 'covered case' },
        { id: 'TPV-TC-911', story: 'US-0.0.1', smoke: true, text: 'uncovered case' }
      ];
      function setup(h) { h.test('TPV-TC-910', 'covered', function (b) { b.ok(true); }); }
      return runInner(setup, { autoCases: cases }).then(function (res) {
        var p = byId(res, 'TPV-TC-911')[0];
        a.equal(p.status, 'pending');
        a.equal(p.title, 'uncovered case');
        a.equal(res.pending, 1);
        a.equal(res.failed, 0, 'pending is not a failure');
        a.equal(res.release, false);
        return runInner(setup, { autoCases: cases, query: '?release=1' });
      }).then(function (res) {
        a.equal(res.release, true);
        a.equal(byId(res, 'TPV-TC-911')[0].status, 'fail', 'pending fails in release');
        a.equal(res.failed, 1);
        a.equal(res.pending, 0);
      });
    });

    T.test('X-harness-skip', 'skipped tests are listed with their reason', function (a) {
      return runInner(function (h) {
        h.skip('TPV-TC-912', 'later', 'needs the report engine');
      }).then(function (res) {
        var r = res.results[0];
        a.equal(r.status, 'skip');
        a.equal(r.message, 'needs the report engine');
        a.equal(res.skipped, 1);
      });
    });

    T.test('X-harness-filter', '?only and ?suite run a subset', function (a) {
      function setup(h) {
        h.suite('format', function () {
          h.test('TPV-TC-920', 'one', function (b) { b.ok(true); });
          h.test('TPV-TC-921', 'two', function (b) { b.ok(true); });
        });
        h.suite('rules', function () {
          h.test('TPV-TC-922', 'three', function (b) { b.ok(true); });
        });
      }
      var cases = [{ id: 'TPV-TC-929', story: '', smoke: false, text: 'uncovered' }];
      return runInner(setup, { query: '?only=TPV-TC-921', autoCases: cases }).then(function (res) {
        a.deepEqual(res.results.map(function (r) { return r.id; }), ['TPV-TC-921'], 'pending hidden when filtered');
        return runInner(setup, { query: '?suite=format' });
      }).then(function (res) {
        a.deepEqual(res.results.map(function (r) { return r.id; }), ['TPV-TC-920', 'TPV-TC-921']);
      });
    });

    T.test('X-harness-shared-id', 'a case id shared by several tests passes only if all pass', function (a) {
      return runInner(function (h) {
        h.test('TPV-TC-930', 'part a', function (b) { b.ok(true); });
        h.test('TPV-TC-930', 'part b', function (b) { b.ok(false, 'part b broke'); });
        h.test('TPV-TC-931', 'only part', function (b) { b.ok(true); });
      }).then(function (res) {
        a.deepEqual(res.ids, { passed: 1, failed: 1, skipped: 0, pending: 0 });
        a.equal(byId(res, 'TPV-TC-930').length, 2, 'both rows listed');
      });
    });

    T.test('X-harness-page-error', 'uncaught errors and rejections during a run fail as X-page-error', function (a) {
      return runInner(function (h) {
        h.test('X-in-stray', 'throws outside the test chain', function (b) {
          b.ok(true);
          setTimeout(function () { throw new Error('stray boom'); }, 0);
          Promise.reject(new Error('stray rejection'));
          return wait(30);
        });
      }).then(function (res) {
        var errs = byId(res, 'X-page-error');
        a.equal(errs.length, 2, 'both captured');
        a.ok(errs.every(function (r) { return r.status === 'fail'; }), 'all fail');
        var text = errs.map(function (r) { return r.message; }).join(' | ');
        a.match(text, /stray boom/);
        a.match(text, /stray rejection/);
      });
    });

    T.test('X-harness-before-each', 'the before-each hook runs before every test', function (a) {
      var calls = 0;
      return runInner(function (h) {
        h.test('X-in-one', '', function (b) { b.equal(calls, 1); });
        h.test('X-in-two', '', function (b) { b.equal(calls, 2); });
      }, { beforeEach: function () { calls++; } }).then(function (res) {
        a.equal(res.passed, 2);
      });
    });

    T.test('X-harness-dom', 'dom.mount gives an empty container that is removed after each test', function (a) {
      return runInner(function (h) {
        h.test('X-in-mount', '', function (b) {
          var el = T.dom.mount();
          b.equal(el.parentNode.id, 't-sandbox');
          b.equal(el.childNodes.length, 0);
          el.appendChild(document.createElement('span'));
        });
        h.test('X-in-clean', '', function (b) {
          b.equal(document.getElementById('t-sandbox').childNodes.length, 0, 'sandbox emptied');
        });
      }).then(function (res) {
        a.equal(res.passed, 2);
      });
    });

    T.test('X-harness-no-assert', 'a test with no assertions fails, so empty stubs stand out', function (a) {
      return runInner(function (h) {
        h.test('X-in-empty', '', function () {});
      }).then(function (res) {
        a.equal(res.results[0].status, 'fail');
        a.match(res.results[0].message, /no assertions/);
      });
    });

    T.test('X-harness-bad-id', 'an id that is neither TPV-TC-nnn nor X-... fails', function (a) {
      return runInner(function (h) {
        h.test('TC-77', 'wrong id', function (b) { b.ok(true); });
      }).then(function (res) {
        a.equal(res.results[0].status, 'fail');
        a.match(res.results[0].message, /invalid test id/i);
      });
    });

    T.test('X-harness-truncate', 'very long expected or found values are truncated', function (a) {
      var big = [];
      for (var i = 0; i < 2000; i++) big.push(i);
      return runInner(function (h) {
        h.test('X-in-big', '', function (b) { b.deepEqual(big, []); });
      }).then(function (res) {
        var f = res.results[0].found;
        a.ok(f.length < 2200, 'found is short: ' + f.length);
        a.match(f, /truncated/);
      });
    });

    T.test('X-harness-render', 'results render with data-id, data-status and failure details', function (a) {
      var root = T.dom.mount();
      return runInner(function (h) {
        h.test('TPV-TC-940', 'good', function (b) { b.ok(true); });
        h.test('TPV-TC-941', 'bad', function (b) { b.equal('found-val', 'expected-val'); });
      }, { root: root }).then(function () {
        var rows = root.querySelectorAll('tr[data-id]');
        a.equal(rows.length, 2);
        a.equal(rows[1].getAttribute('data-status'), 'fail');
        a.match(root.textContent, /expected-val/);
        a.match(root.textContent, /found-val/);
        a.match(root.textContent, /1 passed, 1 failed/);
        var json = JSON.parse(root.querySelector('pre.t-json').textContent);
        a.equal(json.done, true);
        a.equal(json.total, 2);
      });
    });

    T.test('X-harness-copy-text', 'copied results are plain text with status, id, title and a summary', function (a) {
      var h = T.create({});
      h.suite('fmt', function () {
        h.test('TPV-TC-950', 'formats', function (b) { b.ok(true); });
        h.test('TPV-TC-951', 'rounds', function (b) { b.equal(1, 2, 'rounding'); });
      });
      return h.run().then(function () {
        var text = h.resultsText();
        var lines = text.split('\n');
        a.match(lines[0], /^PASS\s+TPV-TC-950\s+formats$/);
        a.match(lines[1], /^FAIL\s+TPV-TC-951\s+rounds$/);
        a.match(text, /expected: 2/);
        a.match(text, /found: 1/);
        a.match(lines[lines.length - 1], /^FAIL 1\/2 /);
      });
    });

    T.test('X-harness-list', 'T.list returns every registered test, for the coverage check', function (a) {
      var h = T.create({ query: '?only=TPV-TC-961' });
      h.test('TPV-TC-960', 'a', function (b) { b.ok(true); });
      h.test('TPV-TC-961', 'b', function (b) { b.ok(true); });
      a.deepEqual(h.list().map(function (t) { return t.id; }), ['TPV-TC-960', 'TPV-TC-961']);
    });
  });

  // A deliberate failure, only with ?selftest-fail=1, to prove a broken test
  // makes the headless run fail.
  if (/[?&]selftest-fail=1(&|$)/.test(window.location.search)) {
    T.suite('forced', function () {
      T.test('X-selftest-forced-fail', 'deliberate failure (selftest-fail=1)', function (a) {
        a.equal(1 + 1, 3, 'deliberate failure');
      });
    });
  }
})();
