/*
 * File: js/ui/import-panel.js
 * Purpose: The Import panel (D147): pick the workbooks, read them with a live status, show the report, then Use these
 *          plans now, Save data/plan-data.js and Copy report; docs/ARCHITECTURE.md section 20. It opens as a wide layer
 *          from the Import button on the comparison bar and inline under the no-data and invalid screens. Nothing is kept
 *          in browser storage.
 * Provides: TAP.importPanel (open, render, button, show, state)
 * Depends on: js/import/import-plan.js, js/import/import-map.js, js/import/import-write.js, js/ui/import-report.js,
 *             js/ui/layers.js, js/ui/app.js, js/panel/panel-table.js (clipboard) (all at call time), js/core/dom.js,
 *             js/core/content.js, js/core/icons.js
 * Used by: js/ui/compare-bar.js (button), js/ui/system-screens.js (render inline), js/ui/layers.js (the 'import' panel)
 * Owner: UI stream (#587)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('importPanel.' + key, vars); };
  var ui = null;                                     // the panel on screen: its elements, mapping and options
  var current = { phase: 'idle', result: null };     // 'idle' | 'reading' | 'done'

  // The mapping and what is wrong with it. A mapping module that cannot answer reads as a problem, never as a crash.
  function mapInfo() {
    try {
      var map = TAP.importMap.get();
      return { map: map, problems: map ? (TAP.importMap.problems(map) || []) : [] };
    } catch (e) { return { map: null, problems: [e.message] }; }
  }

  // Which mapping the import reads with, or why nothing can be read.
  function intro(info) {
    if (info.map && !info.problems.length) {
      var meta = info.map.meta || {};
      return el('p', { class: 'tap-imp__intro' }, [
        t('intro', { version: meta.templateVersion || '' }),
        meta.isSample ? ' ' : null,
        meta.isSample ? el('span', { class: 'tap-badge' }, t('sampleBadge')) : null
      ]);
    }
    return el('div', { class: 'tap-imp__intro tap-imp__intro--problem' }, [
      el('p', null, t(info.problems.length ? 'mapProblems' : 'mapMissing')),
      info.problems.length ? el('ul', { class: 'tap-imp__mapproblems' }, info.problems.map(function (s) { return el('li', null, s); })) : null
    ]);
  }

  // The file input, visually hidden inside a button-like label (it keeps the keyboard focus; css/import.css shows it).
  function pickControl(disabled) {
    var input = el('input', { type: 'file', class: 'tap-sr', multiple: true, accept: '.xlsx', disabled: disabled || null,
      onchange: function () { onPick(input); } });
    var label = el('label', { class: 'tap-btn tap-btn--primary tap-imp__pick' + (disabled ? ' is-disabled' : '') },
      [input, TAP.icons.svg('upload', { size: 18 }), el('span', null, t('pick'))]);
    return { input: input, label: label };
  }

  function action(id, label) {
    return el('button', { type: 'button', class: 'tap-btn tap-imp__action', 'data-action': id, disabled: true,
      onclick: function () { act(id); } }, label);
  }

  // Draws the panel into host. opts.inline: under a start-up screen (no layer, no shell); opts.onUse: called after Use.
  function render(host, opts) {
    TAP.dom.clear(host);
    host.classList.add('tap-imp');
    current = { phase: 'idle', result: null };
    var info = mapInfo(), pick = pickControl(!info.map || info.problems.length > 0);
    ui = {
      host: host, opts: opts || {}, map: info.map, input: pick.input,
      status: el('p', { class: 'tap-imp__status', role: 'status', 'aria-live': 'polite' }, t('statusIdle')),
      result: el('div', { class: 'tap-imp__result' }),
      use: action('use', t('use')), save: action('save', t('save')), copy: action('copy', t('copy')),
      why: el('p', { class: 'tap-imp__why' }),
      text: el('textarea', { class: 'tap-field tap-imp__text', readonly: 'readonly', rows: '10', hidden: true, 'aria-label': t('textLabel') })
    };
    TAP.dom.append(host, [intro(info), pick.label, ui.status, ui.result,
      el('div', { class: 'tap-imp__actions' }, [ui.use, ui.save, ui.copy]), ui.why, ui.text]);
    sync();
    return host;
  }

  function say(msg) { if (ui) TAP.dom.text(ui.status, msg); }

  function counts(r) {
    var all = r.regions || [];
    return { k: all.filter(function (x) { return x.ok; }).length, n: all.length };
  }

  // What stands in the way of using the plans: mapping problems, the regions' errors and the contract check's errors.
  function problemCount(r) {
    var n = (r.mapProblems || []).length + (r.check ? (r.check.errors || []).length : 0);
    (r.regions || []).forEach(function (x) { n += (x.errors || []).length; });
    return n;
  }

  // Brings the three buttons and the reason line in step with the state. Copy works with any result.
  function sync() {
    if (!ui) return;
    var r = current.result, usable = !!(r && r.usable && r.plan), c = r ? counts(r) : null;
    ui.use.disabled = !usable;
    ui.save.disabled = !usable;
    ui.copy.disabled = !r;
    TAP.dom.text(ui.use, usable && c.k < c.n ? t('useSome', c) : t('use'));
    var why = '';
    if (current.phase === 'reading') why = '';
    else if (!r) why = t('whyNoResult');
    else if (!usable) { var n = problemCount(r); why = n ? t('whyErrors', { n: n }) : t('whyNone'); }
    TAP.dom.text(ui.why, why);
  }

  /* ---------- reading ---------- */

  function onPick(input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    current = { phase: 'reading', result: null };
    TAP.dom.clear(ui.result);
    ui.text.hidden = true;
    sync();
    say(t('statusReading', { i: 1, n: files.length, name: files[0].name }));
    var p;
    try {
      p = TAP.importPlan.run(files, ui.map, {
        now: new Date().toISOString(),
        onProgress: function (i, n, name) { say(t('statusReading', { i: i, n: n, name: name })); }
      });
    } catch (e) { p = Promise.reject(e); }
    input.value = '';   // picking the same files again fires change again
    Promise.resolve(p).then(show, fail);
  }

  function fail(e) {
    current = { phase: 'idle', result: null };
    say(t('statusFailed', { message: e && e.message ? e.message : String(e) }));
    sync();
  }

  // Draws a result (from the import, or canned by a test) and moves focus to the report's heading.
  function show(result) {
    current = { phase: 'done', result: result };
    if (!ui) return;
    TAP.dom.clear(ui.result);
    TAP.importReport.render(ui.result, result);
    say(t('statusDone', counts(result)));
    sync();
    var h = TAP.dom.qs('.tap-imp__h', ui.result);
    if (h && h.focus) h.focus();
  }

  /* ---------- the three actions ---------- */

  function act(id) {
    var r = current.result;
    if (!r) return;
    if (id === 'use') use(r);
    else if (id === 'save') { TAP.importWrite.download(r.plan); say(t('saved')); }
    else if (id === 'copy') copyReport(r);
  }

  // A fresh start on the imported plans (no root: the title, store, notes and insights reset). As a layer, it closes
  // first; under a start-up screen the start replaces the screen itself.
  function use(r) {
    if (!r.usable || !r.plan) return;
    var opts = ui ? ui.opts : {};
    if (!opts.inline) TAP.layers.close();
    TAP.app.start({ plan: r.plan });
    if (opts.inline && typeof opts.onUse === 'function') opts.onUse(r);
  }

  // The clipboard first; where it is refused (file://), the text is shown selected, to copy by hand.
  function copyReport(r) {
    var text = TAP.importWrite.report(r), box = ui && ui.text;
    Promise.resolve(TAP.panelTable.clipboard(text)).then(function (ok) {
      say(t(ok ? 'copied' : 'copyManual'));
      if (!box) return;
      box.hidden = !!ok;
      if (ok) return;
      box.value = text;
      box.select();
    });
  }

  /* ---------- entry points ---------- */

  function open() { TAP.layers.open('import'); }

  // The Import button, once per slot: "Import" on screen, "Import workbooks" to a screen reader (as TAP.tour.button).
  function button(slot) {
    if (!slot || slot.querySelector('.tap-imp__button')) return;
    slot.appendChild(el('button', { type: 'button', class: 'tap-btn tap-imp__button', 'aria-label': t('buttonLabel'), title: t('buttonLabel'),
      onclick: function () { open(); } }, [TAP.icons.svg('upload', { size: 18 }), el('span', null, t('button'))]));
  }

  function state() { return { phase: current.phase, result: current.result }; }

  TAP.importPanel = { open: open, render: render, button: button, show: show, state: state };
})(window.TAP);
