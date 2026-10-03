/*
 * File: js/core/namespace.js
 * Purpose: Creates the shared TAP namespace and the stub helper used for parts not built yet.
 * Provides: window.TAP, TAP.version, TAP.schemaVersion, TAP.stub (+ .builder, .view, .rules, .fn, .list)
 * Depends on: nothing (loads first after the theme)
 * Used by: every module
 */
(function () {
  'use strict';
  var TAP = window.TAP = window.TAP || {};

  TAP.version = '0.1.0';
  // The Data Contract version this build reads. The data file's meta.schemaVersion must match.
  TAP.schemaVersion = '0.2';

  var stubs = [];

  function notBuilt(what, issue) {
    return 'Not built yet (#' + issue + '): ' + what;
  }

  // A module of the right shape whose functions say "not built yet" when called.
  function stub(name, fns, issue) {
    var mod = { __stub: issue };
    fns.forEach(function (fn) {
      mod[fn] = function () { throw new Error(notBuilt('TAP.' + name + '.' + fn, issue)); };
    });
    TAP[name] = mod;
    stubs.push({ what: 'TAP.' + name, issue: issue });
    return mod;
  }

  // A chart builder that returns an error result instead of a chart.
  stub.builder = function (name, issue) {
    var fn = function () { return { error: notBuilt('builder ' + name, issue), empty: false }; };
    fn.__stub = issue;
    TAP.builders.register(name, fn);
    stubs.push({ what: 'builder ' + name, issue: issue });
  };

  // A view that only shows "not built yet".
  stub.view = function (id, title, issue) {
    TAP.views.register(id, {
      title: title,
      __stub: issue,
      mount: function (el) {
        TAP.dom.clear(el);
        el.appendChild(TAP.dom.el('p', { class: 'tap-stub' }, notBuilt('the ' + title + ' view', issue)));
        return { destroy: function () {} };
      }
    });
    stubs.push({ what: 'view ' + id, issue: issue });
  };

  // A single function inside an otherwise built module.
  stub.fn = function (what, issue) {
    stubs.push({ what: what, issue: issue });
    var fn = function () { throw new Error(notBuilt(what, issue)); };
    fn.__stub = issue;
    return fn;
  };

  // An insight rule file with no rules yet.
  stub.rules = function (family, issue) {
    stubs.push({ what: 'insight rules: ' + family, issue: issue });
  };

  stub.list = function () { return stubs.slice(); };
  stub.message = notBuilt;

  TAP.stub = stub;
})();
