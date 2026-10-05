/*
 * File: js/ui/present.js
 * Purpose: Presentation mode: steps through the running order full screen, each step with its own report, measure,
 *          comparison and highlight, then puts the screen back as it was (Epic 3.1, D65, D70). Recording steps from
 *          the screen lives in js/ui/present-record.js; checking them in js/ui/present-steps.js.
 * Provides: TAP.present (check, start, stop, next, prev, first, current, active, record, recorded, move, remove,
 *           clearRecorded, asFileText, button)
 * Depends on: config/running-order.js, js/ui/present-steps.js, js/panel/panel.js, js/panel/panel-drill.js (keys),
 *             js/core/store.js, js/core/dom.js, js/core/icons.js, js/core/content.js, js/ui/shell.js, js/ui/layers.js
 *             (all at call time)
 * Used by: js/ui/shell.js (Present button), js/ui/keys.js (P), js/views/guide.js (recorded steps, through Guide extras)
 * Owner: PRESENT stream (#233)
 *
 * While presenting, this owns Space, Right, Left, Backspace, Home and Esc (D70). The panel's own keys (drill steps,
 * popover and expanded-chart Esc) are switched off with TAP.panelDrill.keys(false), and keys.js stands aside, so an
 * Esc here first closes an open chart menu, then leaves. A side panel's Esc stays with js/ui/layers.js.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('present.' + key, vars); }

  var run = null;   // {steps, i, saved, layer, host, row, panel, off, busy, focus}

  // Typing in a field: the keys belong to the text.
  function typing(a) { return !!a && (/^(input|select|textarea)$/i.test(a.tagName || '') || !!a.isContentEditable); }

  function appRoot() {
    try { return TAP.shell.viewEl().parentNode || document.body; } catch (e) { return document.body; }
  }

  function check(steps) { return TAP.presentSteps.check(steps); }

  /* ---------- the Present button and its message (US-3.1.2) ---------- */

  // Says why the file's running order can't start, next to the button. Cleared by a start or a click elsewhere.
  function say(text) {
    TAP.dom.qsa('.tap-present__msg').forEach(function (m) { TAP.dom.text(m, text || ''); });
  }

  function button(slot) {
    if (!slot || slot.querySelector('.tap-present__button')) return;
    var box = el('div', { class: 'tap-present__start' }, [
      el('button', { type: 'button', class: 'tap-btn tap-present__button', onclick: function () { start(); } },
        [TAP.icons.svg('fullscreen', { size: 18 }), el('span', null, t('button'))]),
      el('p', { class: 'tap-present__msg', role: 'status', 'aria-live': 'polite' })
    ]);
    slot.insertBefore(box, slot.firstChild);
  }
  document.addEventListener('mousedown', function (e) {
    if (!(e.target && e.target.closest && e.target.closest('.tap-present__start'))) say('');
  });

  /* ---------- the presentation layer ---------- */

  // The thin progress row: where we are, the step title, and buttons for anyone not using the keys (D24).
  function bar() {
    function nav(id, fn, label, keys) {
      return el('button', { type: 'button', class: 'tap-btn tap-present__nav', 'data-present': id, onclick: fn },
        [el('span', null, label), el('kbd', { class: 'tap-present__kbd' }, keys)]);
    }
    return el('div', { class: 'tap-present__bar', role: 'navigation', 'aria-label': t('barLabel') }, [
      el('p', { class: 'tap-present__where', 'aria-live': 'polite' }),
      el('div', { class: 'tap-present__navs' }, [
        nav('prev', prev, t('prev'), t('prevKeys')),
        nav('next', next, t('next'), t('nextKeys')),
        nav('leave', stop, t('leave'), t('leaveKeys'))
      ])
    ]);
  }

  function progress() {
    var s = run.steps[run.i], where = TAP.dom.qs('.tap-present__where', run.row);
    TAP.dom.clear(where);
    TAP.dom.append(where, [
      el('strong', { class: 'tap-present__count' }, t('progress', { n: run.i + 1, total: run.steps.length })),
      s.title ? el('span', { class: 'tap-present__title' }, s.title) : null
    ]);
    TAP.dom.qs('[data-present="prev"]', run.row).disabled = run.i === 0;
    TAP.dom.qs('[data-present="next"]', run.row).disabled = run.i === run.steps.length - 1;
  }

  // Shows step i at once (no transition, D24): a fresh panel in the layer, the step's comparison in the store,
  // and the panel expanded. A fresh highlight object each step, so "Show me" clearing on a comparison change
  // never takes it away.
  function show(i) {
    var s = run.steps[i];
    run.i = i;
    if (run.panel) { run.panel.destroy(); run.panel = null; }
    TAP.dom.clear(run.host);
    run.busy = true;
    // A chart of the view behind that leaves its expanded state focuses its own button, which would scroll the page
    var x = window.scrollX, y = window.scrollY;
    try {
      TAP.store.set({ cmp: s.cmp, expanded: s.reportId, highlight: s.highlight ? Object.assign({}, s.highlight, { presentStep: i }) : null });
      run.panel = TAP.panel.create(run.host, s.def || s.reportId, { cmp: s.cmp, initial: s.initial });
    } finally { run.busy = false; }
    window.scrollTo(x, y);
    progress();
    // Focus stays on the layer, not the strip's Close button the panel focuses, so Space never presses a button
    if (run.layer.focus) run.layer.focus({ preventScroll: true });
    return true;
  }

  function go(i) { return !!run && i >= 0 && i < run.steps.length && i !== run.i && show(i); }
  function next() { return run ? go(run.i + 1) : false; }
  function prev() { return run ? go(run.i - 1) : false; }
  function first() { return run ? (run.i === 0 ? false : go(0)) : false; }

  function onKey(e) {
    if (!run || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') {
      if (TAP.layers.top()) return;   // the side panel closes first (js/ui/layers.js)
      e.preventDefault();
      var open = TAP.dom.qs('.tap-panel__tools [aria-expanded="true"]', run.layer);
      if (open) { open.click(); return; }   // an open chart menu closes first; the panel's own Esc is off (D70)
      stop();
      return;
    }
    var fn = { ' ': next, Spacebar: next, ArrowRight: next, ArrowLeft: prev, Backspace: prev, Home: first }[e.key];
    if (!fn || typing(e.target)) return;
    e.preventDefault();
    fn();
  }

  // Close on the expanded strip, or anything else that collapses the step's chart or changes the view, leaves.
  function onStore(state, changed) {
    if (!run || run.busy) return;
    var mine = run.steps[run.i].reportId;
    if ((changed.indexOf('expanded') >= 0 && state.expanded !== mine) || changed.indexOf('view') >= 0) stop();
  }

  /*
   * Starts at step 1 of the given steps, or of config/running-order.js. Returns {started, total, skipped} or, when
   * nothing can be shown, {started: false, reason: 'empty'|'invalid', message, skipped}. For the file's order the
   * message also shows next to the Present button.
   */
  function start(steps) {
    var fromFile = steps === undefined;
    var list = fromFile ? (window.TAP_RUNNING_ORDER || {}).steps : steps;
    var res = check(list);
    if (!res.ok.length) {
      var empty = !Array.isArray(list) || !list.length;
      var message = empty ? t('empty') : t(list.length === 1 ? 'noneValidOne' : 'noneValid', { n: list.length });
      if (fromFile) say(message);
      return { started: false, reason: empty ? 'empty' : 'invalid', message: message, skipped: res.skipped };
    }
    say('');
    var saved = run ? run.saved : null, focus = run ? run.focus : document.activeElement;
    if (run) teardown();
    if (TAP.layers.top()) TAP.layers.close();
    var s0 = TAP.store.get();
    run = { steps: res.ok, i: 0, off: [], busy: false, focus: focus,
      saved: saved || { view: s0.view, cmp: JSON.parse(JSON.stringify(s0.cmp)), expanded: s0.expanded, highlight: s0.highlight,
        x: window.scrollX, y: window.scrollY } };
    run.host = el('div', { class: 'tap-present__stage' });
    run.row = bar();
    run.layer = el('div', { class: 'tap-present', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('layerLabel'), tabindex: '-1' },
      [run.host, run.row]);
    var root = appRoot(), layers = TAP.dom.qs('.tap-layers', root);
    root.insertBefore(run.layer, layers && layers.parentNode === root ? layers : null);   // side panels stay above it
    TAP.panelDrill.keys(false);
    window.addEventListener('keydown', onKey);
    run.off.push(function () { window.removeEventListener('keydown', onKey); });
    run.off.push(TAP.store.on(onStore));
    show(0);
    return { started: true, total: res.ok.length, skipped: res.skipped };
  }

  function teardown() {
    run.off.forEach(function (fn) { fn(); });
    if (run.panel) run.panel.destroy();
    if (run.layer.parentNode) run.layer.parentNode.removeChild(run.layer);
  }

  // Leaves presentation mode and puts back the view, comparison, expanded chart, highlight and scroll from before.
  function stop() {
    if (!run) return false;
    var r = run;
    teardown();
    run = null;
    TAP.panelDrill.keys(true);
    var s = r.saved;
    if (TAP.store.get().view !== s.view) TAP.store.set({ view: s.view });
    TAP.store.set({ cmp: s.cmp });
    TAP.store.set({ expanded: s.expanded, highlight: s.highlight });
    window.scrollTo(s.x, s.y);
    if (r.focus && r.focus.isConnected && r.focus.focus) r.focus.focus({ preventScroll: true });
    return true;
  }

  function active() { return !!run; }

  // {n, total, title, reportId, kind, index (the step's position in the order given)} or null.
  function current() {
    if (!run) return null;
    var s = run.steps[run.i];
    return { n: run.i + 1, total: run.steps.length, title: s.title, reportId: s.reportId, kind: s.kind, index: s.index };
  }

  // Recording from the screen comes with US-3.1.3 (#234), in js/ui/present-record.js.
  var REC = ['record', 'recorded', 'move', 'remove', 'clearRecorded', 'asFileText'];
  TAP.stub('presentRecord', REC, 234);

  TAP.present = { check: check, start: start, stop: stop, next: next, prev: prev, first: first, current: current,
    active: active, button: button };
  // Each keeps the stub mark while recording isn't built, so other streams' tests can wait for it
  REC.forEach(function (fn) {
    var w = function () { return TAP.presentRecord[fn].apply(null, arguments); };
    if (TAP.presentRecord.__stub) w.__stub = TAP.presentRecord.__stub;
    TAP.present[fn] = w;
  });
})(window.TAP);
