/*
 * File: js/ui/present.js
 * Purpose: Presentation mode: steps through charts full screen, each step with its own report, measure, comparison
 *          and highlight, then puts the screen back as it was (Epic 3.1, D65, D70). Present and the P key present the
 *          charts on the page as they are on screen, then continue page by page (D141, js/ui/present-screen.js); the
 *          Guide plays the file (config/running-order.js) or the recorded list. Recording steps from the screen
 *          lives in js/ui/present-record.js; checking them in js/ui/present-steps.js.
 * Provides: TAP.present (check, start, startScreen, stop, next, prev, first, current, active, record, recorded, move,
 *           remove, clearRecorded, asFileText, button, fromPanel)
 * Depends on: config/running-order.js, js/ui/present-steps.js, js/ui/present-record.js, js/ui/present-screen.js,
 *             js/panel/panel.js, js/panel/panel-drill.js (keys), js/core/store.js, js/core/dom.js, js/core/icons.js,
 *             js/core/content.js, js/ui/shell.js, js/ui/layers.js (all at call time)
 * Used by: js/ui/shell.js (Present button), js/ui/keys.js (P), js/panel/panel-menus.js (Add to presentation),
 *          js/ui/present-record.js (the Guide's buttons)
 * Owner: PRESENT stream (#233, #570)
 *
 * While presenting, this owns Space, Right, Left, Backspace, Home and Esc (D70). The panel's own keys (drill steps,
 * popover and expanded-chart Esc) are switched off with TAP.panelDrill.keys(false), and keys.js stands aside, so an
 * Esc here first closes an open chart menu, then leaves. A side panel's Esc stays with js/ui/layers.js.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('present.' + key, vars); }

  var run = null;   // {steps, i, saved, page, moved, layer, host, row, panel, off, busy, focus}

  // Typing in a field: the keys belong to the text (the panel keys' test, js/panel/panel-drill.js).
  function typing(a) { return TAP.panelKeys.typing(a); }

  function appRoot() {
    try { return TAP.shell.viewEl().parentNode || document.body; } catch (e) { return document.body; }
  }

  function check(steps) { return TAP.presentSteps.check(steps); }
  function isMarker(s) { return !!s && s.kind === 'marker'; }
  function charts() { return run.steps.filter(function (s) { return !isMarker(s); }); }   // the steps counted (D141)

  /* ---------- the Present button and its message (US-3.1.2) ---------- */

  // Says why nothing can be presented, next to the button. Cleared by a start or a click elsewhere.
  function say(text) {
    TAP.dom.qsa('.tap-present__msg').forEach(function (m) { TAP.dom.text(m, text || ''); });
  }

  function button(slot) {
    if (!slot || slot.querySelector('.tap-present__button')) return;
    var box = el('div', { class: 'tap-present__start' }, [
      el('button', { type: 'button', class: 'tap-btn tap-present__button', onclick: function () { startScreen(); } },
        [TAP.icons.svg('fullscreen', { size: 18 }), el('span', null, t('button'))]),
      el('p', { class: 'tap-present__msg', role: 'status', 'aria-live': 'polite' })
    ]);
    slot.insertBefore(box, slot.firstChild);
  }
  document.addEventListener('mousedown', function (e) {
    if (!(e.target && e.target.closest && e.target.closest('.tap-present__start'))) say('');
  });

  /* ---------- the presentation layer ---------- */

  // "Step n of m" counts the charts, not the marker; the marker shows its title alone.
  function progress() {
    var s = run.steps[run.i], where = TAP.dom.qs('.tap-present__where', run.row), list = charts();
    TAP.dom.clear(where);
    TAP.dom.append(where, [
      isMarker(s) ? null : el('strong', { class: 'tap-present__count' }, t('progress', { n: list.indexOf(s) + 1, total: list.length })),
      s.label ? el('span', { class: 'tap-present__label' }, s.label) : null,   // an insight step: framed for discussion (D20)
      s.title ? el('span', { class: 'tap-present__title' }, s.title) : null
    ]);
    TAP.dom.qs('[data-present="prev"]', run.row).disabled = run.i === 0;
    TAP.dom.qs('[data-present="next"]', run.row).disabled = !isMarker(s) && run.i === run.steps.length - 1;
  }

  // Shows step i at once (no transition, D24): a fresh panel in the layer, expanded, with the step's comparison
  // (opts.cmp) and highlight given to that panel only. Neither goes into the shared state, so the charts behind
  // keep their drill level, own comparison and choices (D74). A marker step shows no panel and expands nothing.
  function show(i) {
    var s = run.steps[i];
    run.i = i;
    if (run.panel) { run.panel.destroy(); run.panel = null; }
    TAP.dom.clear(run.host);
    run.busy = true;
    // A chart of the view behind that leaves its expanded state focuses its own button, which would scroll the page
    var x = window.scrollX, y = window.scrollY;
    try {
      if (isMarker(s)) {
        TAP.store.set({ expanded: null });
        run.host.appendChild(TAP.presentScreen.markerEl(s));
      } else {
        TAP.store.set({ expanded: s.reportId });
        var def = s.def || TAP.reports.get(s.reportId);   // an Overview chart offers no comparison, as on the Overview (D118)
        run.panel = TAP.panel.create(run.host, s.def || s.reportId, { cmp: s.cmp, initial: s.initial, local: true,
          noCompare: !!def && def.view === 'overview' });
        if (s.highlight) run.panel.highlight(Object.assign({}, s.highlight));
      }
    } finally { run.busy = false; }
    window.scrollTo(x, y);
    run.host.scrollTop = 0;   // each step starts at its top
    progress();
    reveal();
    // Focus stays on the layer, not the strip's Close button the panel focuses, so Space never presses a button
    if (run.layer.focus) run.layer.focus({ preventScroll: true });
    return true;
  }

  // Outlined rows or cells (an insight step) that sit below the fold are brought up, a third of the way down the
  // stage, at once (D24). Chart marks are always in view, so only HTML highlights need this.
  function reveal() {
    var hit = TAP.dom.qs('.is-hl', run.host);
    if (!hit) return;
    var r = hit.getBoundingClientRect(), box = run.host.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) run.host.scrollTop += r.top - box.top - box.height / 3;
  }

  function go(i) { return !!run && i >= 0 && i < run.steps.length && i !== run.i && show(i); }
  function next() { return run ? (isMarker(run.steps[run.i]) ? continueTo(run.steps[run.i].next) : go(run.i + 1)) : false; }
  function prev() { return run ? go(run.i - 1) : false; }
  function first() { return run ? (run.i === 0 ? false : go(0)) : false; }

  // The page's steps with the marker that leads to the page after it, when there is one.
  function withMarker(pg) { return pg.next ? pg.steps.concat([TAP.presentScreen.marker(pg.next)]) : pg.steps; }

  // Next on a marker (D141): opens the next page under the layer, in one change and under busy so the move is not
  // taken as leaving, then presents that page from its first chart. A page with no charts is passed over; after
  // the last page, presentation ends on the page reached.
  function continueTo(to) {
    if (!run) return false;
    if (run.panel) { run.panel.destroy(); run.panel = null; }
    run.busy = true;
    try { TAP.presentScreen.go(to); } finally { run.busy = false; }
    var s = TAP.store.get();
    run.moved = true;
    run.page = { view: s.view, region: s.region };
    var pg = TAP.presentScreen.page();
    if (!pg.steps.length) return pg.next ? continueTo(pg.next) : stop();
    run.steps = withMarker(pg);
    return show(0);
  }

  function onKey(e) {
    if (!run || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
    if (e.key === 'Escape') {
      if (TAP.layers.top()) return;   // the side panel closes first (js/ui/layers.js)
      e.preventDefault();
      var open = TAP.dom.qs('.tap-panel__tools [aria-expanded="true"]', run.layer);
      if (open) { open.click(); return; }   // an open chart menu closes first; the panel's own Esc is off (D70)
      stop();
      return;
    }
    var fn = { ' ': next, Spacebar: next, ArrowRight: next, ArrowLeft: prev, Backspace: prev, Home: first }[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  }

  // Close on the expanded strip, or anything else that collapses the step's chart or changes the page, leaves.
  function onStore(state, changed) {
    if (!run || run.busy) return;
    var s = run.steps[run.i], mine = isMarker(s) ? null : s.reportId;
    // The app is changing the page (Show all, Back, a link): the new page wins (#366). Checked on the state, not the
    // change list, because the app's own listener clears the expanded chart before this one hears of the view change.
    if (state.view !== run.page.view || (state.view === 'regions' && state.region !== run.page.region)) leave(true);
    else if (changed.indexOf('expanded') >= 0 && state.expanded !== mine) stop();
  }

  /*
   * Plays a list of steps, or the file (config/running-order.js) when none is given, from step 1: the Guide's
   * buttons. Returns {started, total, skipped} or, when nothing can be shown, {started: false, reason:
   * 'empty'|'invalid'|'error', message, skipped}.
   */
  function start(steps) {
    var list = steps === undefined ? (window.TAP_RUNNING_ORDER || {}).steps : steps;
    var res = check(list);
    if (!res.ok.length) {
      var empty = !Array.isArray(list) || !list.length;
      var message = empty ? t('empty') : t(list.length === 1 ? 'noneValidOne' : 'noneValid', { n: list.length });
      return { started: false, reason: empty ? 'empty' : 'invalid', message: message, skipped: res.skipped };
    }
    return open(res.ok, 0, null, res.skipped);
  }

  // Presents the charts on the page (the Present button, the P key; D141), from the expanded chart or the first.
  // With no chart on the page it says so beside the button: {started: false, reason: 'none', message, skipped: []}.
  function startScreen() {
    var pg = TAP.presentScreen.page();
    if (!pg.steps.length) {
      say(t('nothingOnPage'));
      return { started: false, reason: 'none', message: t('nothingOnPage'), skipped: [] };
    }
    return open(withMarker(pg), pg.startAt, say, []);
  }

  // Draws the layer and shows step i0. tell: where a start error is shown, if anywhere.
  function open(steps, i0, tell, skipped) {
    say('');
    var saved = run ? run.saved : null, focus = run ? run.focus : document.activeElement, moved = !!run && run.moved;
    if (run) teardown();
    if (TAP.layers.top()) TAP.layers.close();
    var s0 = TAP.store.get();
    run = { steps: steps, i: 0, off: [], busy: false, focus: focus, moved: moved, page: { view: s0.view, region: s0.region },
      saved: saved || { view: s0.view, expanded: s0.expanded, x: window.scrollX, y: window.scrollY } };
    run.host = el('div', { class: 'tap-present__stage' });
    run.row = TAP.presentScreen.bar({ prev: prev, next: next, leave: stop });
    run.layer = el('div', { class: 'tap-present', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('layerLabel'), tabindex: '-1' },
      [run.host, run.row]);
    var root = appRoot(), layers = TAP.dom.qs('.tap-layers', root);
    root.insertBefore(run.layer, layers && layers.parentNode === root ? layers : null);   // side panels stay above it
    TAP.panelDrill.keys(false);
    window.addEventListener('keydown', onKey);
    run.off.push(function () { window.removeEventListener('keydown', onKey); });
    run.off.push(TAP.store.on(onStore));
    try { show(i0); } catch (e) {
      stop();   // a step that can't be drawn never leaves a half-open layer
      var msg = t('startError', { message: e.message });
      if (tell) tell(msg);
      return { started: false, reason: 'error', message: msg, skipped: skipped };
    }
    return { started: true, total: charts().length, skipped: skipped };
  }

  function teardown() {
    run.off.forEach(function (fn) { fn(); });
    if (run.panel) run.panel.destroy();
    if (run.layer.parentNode) run.layer.parentNode.removeChild(run.layer);
  }

  // Leaves presentation mode and puts back the view, expanded chart and scroll from before. The comparison and
  // highlight were never changed (D74). After a continuation the page reached stays, with nothing expanded (D141).
  function stop() { return leave(false); }

  // moved: the page is being changed under the presentation, so the new page stays, with nothing expanded.
  function leave(moved) {
    if (!run) return false;
    var r = run;
    try { teardown(); } finally { run = null; TAP.panelDrill.keys(true); }
    var s = r.saved;
    if (moved || r.moved) { TAP.store.set({ expanded: null }); window.scrollTo(0, 0); return true; }
    if (TAP.store.get().view !== s.view) TAP.store.set({ view: s.view });
    TAP.store.set({ expanded: s.expanded });
    window.scrollTo(s.x, s.y);
    if (r.focus && r.focus.isConnected && r.focus.focus) r.focus.focus({ preventScroll: true });
    return true;
  }

  function active() { return !!run; }

  // {n, total (the charts), title, reportId, kind, index (the step's position in the order given), page: {view,
  // region}} or null. On a marker, n is the count of the charts and reportId is undefined.
  function current() {
    if (!run) return null;
    var s = run.steps[run.i], list = charts();
    return { n: isMarker(s) ? list.length : list.indexOf(s) + 1, total: list.length, title: s.title, reportId: s.reportId,
      kind: s.kind, index: s.index, page: { view: run.page.view, region: run.page.region } };
  }

  TAP.present = { check: check, start: start, startScreen: startScreen, stop: stop, next: next, prev: prev, first: first,
    current: current, active: active, button: button };
  // Recording from the screen (US-3.1.3) lives in js/ui/present-record.js; read at call time.
  ['record', 'recorded', 'move', 'remove', 'clearRecorded', 'asFileText', 'fromPanel'].forEach(function (fn) {
    TAP.present[fn] = function () { return TAP.presentRecord[fn].apply(null, arguments); };
  });
})(window.TAP);
