/*
 * File: js/ui/compare-bar.js
 * Purpose: The comparison bar: three modes (D99, D114), only the pickers a mode needs and an explanation of combined
 *          figures. It writes only state.cmp.
 *          One row (D116): "Compare", the modes and pickers on the left; the page buttons (Data with the data date,
 *          Present, Tour) at the end. The plain sentence is for screen readers only, in a visually hidden live region.
 *          Where nothing follows the comparison (the Guide) or the view shows every region (the Overview, D118), the
 *          row holds only the buttons.
 * Provides: TAP.compareBar (mount: returns a function that removes the bar's listeners; pageButtons: the compact
 *           Data, Present and Tour buttons, shared with the region profile)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/store.js, js/core/content.js, js/core/data.js,
 *             js/core/format.js, js/core/sources.js (dataDate), js/engine/scope.js (sentence, colorOf),
 *             js/ui/layers.js (opens the data sources panel), js/ui/present.js and js/ui/tour.js (their buttons)
 * Used by: js/ui/shell.js, js/views/regions.js (pageButtons)
 */
(function (TAP) {
  'use strict';

  // All regions, Selected regions, One vs the rest (D99, D114). One vs one ('pair') and All regions combined ('org')
  // are not offered; an old setting naming one is read as a selection of its regions, or as all regions
  // (TAP.scope.upgrade).
  var MODES = ['all', 'set', 'one'];
  var t = function (key, vars) { return TAP.content.text(key, vars); };
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var active = null;   // cleanup for the bar on screen
  // Views with no comparison: the bar holds only its buttons there (QA-13; the Overview shows every region, D118)
  var QUIET = ['guide', 'overview'];

  function cmp() { return TAP.store.get().cmp; }
  function write(patch) { TAP.store.set({ cmp: patch }); }
  function ids() { return TAP.data.regions().map(function (r) { return r.id; }); }
  function known(id) { return ids().indexOf(id) >= 0; }
  function inFileOrder(list) { var all = ids(); return all.filter(function (id) { return list.indexOf(id) >= 0; }); }

  function colour(id) { return TAP.scope.colorOf(id); }

  // Switching mode fills in whatever the new mode needs, from the regions in file order (never a fixed name).
  // A selection starts with the focus region alone, or the first region (D99); one already in use keeps its regions.
  function modePatch(mode) {
    var c = cmp(), all = ids(), p = { mode: mode };
    var focus = known(c.focus) ? c.focus : all[0];
    if (mode === 'one') p.focus = focus;
    if (mode === 'set') {
      var set = c.mode === 'set' ? inFileOrder((c.set || []).filter(known)) : [];
      p.set = set.length ? set : inFileOrder([focus]);
    }
    return p;
  }

  // A row of mutually exclusive buttons (ink fill when selected).
  function seg(label, options, onPick, cls) {
    var group = el('div', { class: 'tap-seg', role: 'group', 'aria-label': label });
    options.forEach(function (o) {
      group.appendChild(el('button', { type: 'button', class: 'tap-seg__opt' + (cls ? ' ' + cls : ''), 'data-value': o.value,
        'data-mode': cls ? o.value : null, 'aria-pressed': 'false', onclick: function () { onPick(o.value); } }, o.label));
    });
    return group;
  }
  function press(group, value) {
    TAP.dom.qsa('.tap-seg__opt', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === value)); });
  }

  function regionSelect(onPick) {
    var s = el('select', { class: 'tap-field tap-cmp__select', onchange: function () { onPick(s.value); } });
    TAP.data.regions().forEach(function (r) { s.appendChild(el('option', { value: r.id }, TAP.content.regionName(r))); });
    return s;
  }

  function field(name, labelEl, control) {
    return el('div', { class: 'tap-cmp__picker', 'data-picker': name }, [labelEl].concat(control));
  }

  // The others in one vs the rest, as one control (D50): one by one, or combined as their average or total.
  function restValue(c) { return c.restAs === 'individual' ? 'individual' : c.restAgg; }
  function restPatch(v) { return v === 'individual' ? { restAs: 'individual' } : { restAs: 'combined', restAgg: v }; }

  function build(root, actions) {
    var ui = {};
    var status = el('p', { class: 'tap-cmp__status', role: 'status' });
    function say(msg) { TAP.dom.text(status, msg || ''); }

    ui.modes = seg(t('compare.modesLabel'), MODES.map(function (m) { return { value: m, label: t('compare.modes.' + m) }; }),
      function (m) { say(); write(modePatch(m)); }, 'tap-cmp__mode');

    ui.focusLabel = el('span', { class: 'tap-cmp__label' }, t('compare.focus'));
    ui.focus = regionSelect(function (id) { say(); write({ focus: id }); });
    ui.rest = seg(t('compare.rest'), [{ value: 'individual', label: t('compare.restIndividual') },
      { value: 'average', label: t('compare.restAverage') }, { value: 'total', label: t('compare.restTotal') }],
      function (v) { say(); write(restPatch(v)); });

    ui.chips = el('div', { class: 'tap-cmp__chips', role: 'group', 'aria-label': t('compare.setLabel') });
    TAP.data.regions().forEach(function (r) {
      ui.chips.appendChild(el('button', { type: 'button', class: 'tap-cmp__chip', 'data-region': r.id, 'aria-pressed': 'false',
        onclick: function () { toggle(r.id); } }, [
        el('span', { class: 'tap-swatch', style: 'background:' + colour(r.id) }),
        TAP.content.regionName(r),
        el('span', { class: 'tap-cmp__tick', 'aria-hidden': 'true' })
      ]));
    });
    function toggle(id) {
      var set = (cmp().set || []).slice(), i = set.indexOf(id);
      if (i >= 0 && set.length <= 1) { say(t('compare.setMin')); return; }   // at least one region stays (D99)
      if (i >= 0) set.splice(i, 1); else set.push(id);
      say();
      write({ set: inFileOrder(set) });
    }

    // Selected regions is one button with the count; the regions open below it by click (D50)
    ui.setCount = el('span', { class: 'tap-cmp__setcount' });
    ui.setPop = el('div', { class: 'tap-cmp__setpop', id: 'tap-cmp-setpop', hidden: true }, [
      ui.chips, status,
      el('button', { type: 'button', class: 'tap-btn tap-cmp__setdone', onclick: function () { showSet(false, true); } }, t('compare.setDone'))
    ]);
    ui.setBtn = el('button', { type: 'button', class: 'tap-btn tap-cmp__setbtn', 'aria-expanded': 'false', 'aria-controls': 'tap-cmp-setpop',
      onclick: function () { showSet(ui.setPop.hidden); } }, [ui.setCount, TAP.icons.svg('down')]);
    function showSet(on, refocus) {
      ui.setPop.hidden = !on;
      ui.setBtn.setAttribute('aria-expanded', String(!!on));
      if (on) fit(ui.setPop);
      if (!on) say();
      if (refocus) ui.setBtn.focus();
    }
    ui.showSet = showSet;
    // A popover opens under its button; where that would run past the bar's right edge (1024 px at 125%), it moves left.
    function fit(pop) {
      pop.style.left = '';
      var r = pop.getBoundingClientRect(), box = root.getBoundingClientRect(), pad = parseFloat(getComputedStyle(root).paddingRight) || 0;
      var over = r.right - (box.right - pad);
      if (over > 0) pop.style.left = -Math.min(over, r.left - box.left) + 'px';
    }
    ui.fit = fit;

    // The sentence is heard, not shown (D116): the bar and the charts already say what is compared
    ui.sentence = el('span', { class: 'tap-cmp__sentence tap-sr', 'aria-live': 'polite' });
    ui.pop = el('div', { class: 'tap-cmp__pop', role: 'note', hidden: true });
    ui.explain = el('button', { type: 'button', class: 'tap-iconbtn tap-cmp__explain', 'aria-expanded': 'false',
      'aria-label': t('compare.explain'), onclick: function () { showPop(ui.pop.hidden); } }, TAP.icons.svg('info'));

    function showPop(on) {
      ui.pop.hidden = !on;
      ui.explain.setAttribute('aria-expanded', String(!!on));
      if (on) fit(ui.pop);
    }
    ui.showPop = showPop;

    ui.pickers = {
      focus: field('focus', ui.focusLabel, ui.focus),
      // The explanation of a combined figure sits beside the control that makes one, and opens under it
      rest: field('rest', el('span', { class: 'tap-cmp__label' }, t('compare.rest')), [ui.rest, ui.explain, ui.pop]),
      set: field('set', null, [ui.setBtn, ui.setPop])
    };

    TAP.dom.append(root, el('div', { class: 'tap-cmp__row' }, [
      el('div', { class: 'tap-cmp__controls' }, [
        el('span', { class: 'tap-cmp__title' }, t('compare.label')), ui.modes,
        ui.pickers.focus, ui.pickers.rest, ui.pickers.set
      ]),
      pageButtons(actions), ui.sentence
    ]));
    return ui;
  }

  // The page-wide buttons, compact (D116): Data with the short data date, Present and Tour, each an icon and a short
  // word at the height of the mode buttons. One builder for the bar and the region profile. actions: the shell's
  // slot (TAP.shell.actionsEl) the other streams fill; without one, a slot of its own.
  function pageButtons(actions) {
    var slot = actions || el('div', { class: 'tap-topbar__actions' });
    try { if (!TAP.present.__stub) TAP.present.button(slot); } catch (e) { /* presentation mode is optional */ }
    if (TAP.tour && TAP.tour.button) TAP.tour.button(slot);
    var iso = TAP.sources.dataDate(), label = t('compare.dataLabel', { date: TAP.format.date(iso) });
    var data = el('button', { type: 'button', class: 'tap-btn tap-cmp__date', 'data-tour': 'datadate', 'data-action': 'sources',
      'aria-label': label, title: label, onclick: openSources },
      [TAP.icons.svg('data', { size: 18 }), el('span', null, t('compare.dataButton', { date: TAP.format.date(iso, { short: true }) }))]);
    return el('div', { class: 'tap-pagebtns' }, [data, slot]);
  }

  // The side panels may not be built yet (#6); a click must never end in a console error.
  function openSources() {
    if (!TAP.layers.__stub) TAP.layers.open('sources');
  }

  // What a combined figure on screen means, in plain words, or null when none is shown (with one region, the
  // scope draws no rest).
  function combinedNote(c) {
    if (c.mode !== 'one' || c.restAs !== 'combined') return null;
    var label = combinedLabel(c);
    if (!label) return null;
    return { label: label, text: t(c.restAgg === 'total' ? 'combined.explainTotal' : 'combined.explainAverage') };
  }

  // The same label the charts use: the combined scope entity's own.
  function combinedLabel(c) {
    var e = TAP.scope.entities(c).filter(function (x) { return x.kind === 'combined'; })[0];
    return e ? e.label : '';
  }

  // Brings every part in line with state.cmp. Elements are kept, so keyboard focus stays where it was.
  function render(ui) {
    var c = cmp();
    press(ui.modes, c.mode);
    // With one region there is no rest to pick
    var need = { focus: c.mode === 'one', rest: c.mode === 'one' && ids().length > 1, set: c.mode === 'set' };
    Object.keys(need).forEach(function (k) { ui.pickers[k].hidden = !need[k]; });
    if (!need.set) ui.showSet(false);
    if (c.focus) ui.focus.value = c.focus;
    press(ui.rest, restValue(c));
    TAP.dom.text(ui.setCount, t('compare.setButton', { n: (c.set || []).length, total: ids().length }));
    TAP.dom.qsa('.tap-cmp__chip', ui.chips).forEach(function (b) {
      var on = (c.set || []).indexOf(b.getAttribute('data-region')) >= 0;
      b.setAttribute('aria-pressed', String(on));
      TAP.dom.text(TAP.dom.qs('.tap-cmp__tick', b), on ? '✓' : '');
    });
    TAP.dom.text(ui.sentence, TAP.scope.sentence(c));

    var note = combinedNote(c);
    ui.explain.hidden = !note;
    if (!note) ui.showPop(false);
    TAP.dom.clear(ui.pop);
    if (note) TAP.dom.append(ui.pop, [el('h3', { class: 'tap-cmp__pop-title' }, note.label), el('p', null, note.text)]);
  }

  // A comparison can name regions the data doesn't have (an opening state from the address bar, or other data), or
  // a mode no longer offered. Fill in what the mode needs from the data instead, so the pickers and the sentence agree.
  function repair() {
    var up = TAP.scope.upgrade(cmp());
    if (up !== cmp()) write(up);
    var c = cmp(), p = modePatch(c.mode), fix = {};
    ['focus', 'set'].forEach(function (k) {
      if (k in p && JSON.stringify(p[k]) !== JSON.stringify(c[k])) fix[k] = p[k];
    });
    if (Object.keys(fix).length) write(fix);
  }

  // opts.actions: the shell's page-wide actions slot, placed after the Data button.
  function mount(root, opts) {
    if (active) active();
    TAP.dom.clear(root);
    repair();
    var ui = build(root, opts && opts.actions);
    render(ui);
    function quiet() { root.classList.toggle('tap-cmp--slim', QUIET.indexOf(TAP.store.get().view) >= 0); }
    quiet();

    var offStore = TAP.store.on(function (state, changed) {
      if (!root.isConnected) { stop(); return; }
      if (changed.indexOf('cmp') >= 0) render(ui);
      if (changed.indexOf('view') >= 0) quiet();
    });
    // Esc closes the explanation or the set's regions before any side panel (layers skip an Esc already handled).
    function onKey(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (!ui.pop.hidden) { ui.showPop(false); ui.explain.focus(); } else if (!ui.setPop.hidden) ui.showSet(false, true);
      else return;
      e.preventDefault();
    }
    function onDown(e) {
      if (!ui.pop.hidden && !ui.pop.contains(e.target) && !ui.explain.contains(e.target)) ui.showPop(false);
      if (!ui.setPop.hidden && !ui.pickers.set.contains(e.target)) ui.showSet(false);
    }
    function onResize() { [ui.setPop, ui.pop].forEach(function (p) { if (!p.hidden) ui.fit(p); }); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onResize);
    function stop() {
      offStore();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onResize);
      if (active === stop) active = null;
    }
    active = stop;
    return stop;
  }

  TAP.compareBar = { mount: mount, pageButtons: pageButtons };
})(window.TAP);
