/*
 * File: js/ui/compare-bar.js
 * Purpose: The comparison bar: five modes, only the pickers a mode needs, the plain sentence, an explanation of
 *          combined figures and the data date (which opens the data sources panel). It writes only state.cmp.
 *          Two rows (D50): the mode and its pickers on one line, then the sentence, the data date and the page-wide
 *          actions the shell hands over (opts.actions: Take the tour, Present; D72).
 * Provides: TAP.compareBar (mount)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/store.js, js/core/content.js, js/core/data.js,
 *             js/core/format.js, js/core/sources.js (dataDate), js/engine/scope.js (sentence, colorOf),
 *             js/ui/layers.js (opens the data sources panel)
 * Used by: js/ui/shell.js
 */
(function (TAP) {
  'use strict';

  var MODES = ['all', 'one', 'pair', 'set', 'org'];
  var t = function (key, vars) { return TAP.content.text(key, vars); };
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var active = null;   // cleanup for the bar on screen
  // Views where nothing follows the comparison: the bar shrinks to its sentence line there (QA-13)
  var QUIET = ['guide'];

  function cmp() { return TAP.store.get().cmp; }
  function write(patch) { TAP.store.set({ cmp: patch }); }
  function ids() { return TAP.data.regions().map(function (r) { return r.id; }); }
  function known(id) { return ids().indexOf(id) >= 0; }
  function inFileOrder(list) { var all = ids(); return all.filter(function (id) { return list.indexOf(id) >= 0; }); }

  function colour(id) { return TAP.scope.colorOf(id); }

  // Switching mode fills in whatever the new mode needs, from the regions in file order (never a fixed name).
  function modePatch(mode) {
    var c = cmp(), all = ids(), p = { mode: mode };
    var focus = known(c.focus) ? c.focus : all[0];
    if (mode === 'one' || mode === 'pair') p.focus = focus;
    if (mode === 'pair' && (!known(c.second) || c.second === focus)) p.second = all.filter(function (id) { return id !== focus; })[0] || null;
    if (mode === 'set') {
      var set = inFileOrder((c.set || []).filter(known));
      if (set.length < 2) set = inFileOrder([focus].concat(all.filter(function (id) { return id !== focus; }).slice(0, 1)));
      p.set = set;
    }
    return p;
  }

  function focusPatch(id) {
    var c = cmp(), p = { focus: id };
    if (c.mode === 'pair' && c.second === id) p.second = ids().filter(function (x) { return x !== id; })[0] || null;
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

    ui.focusLabel = el('span', { class: 'tap-cmp__label' });
    ui.focus = regionSelect(function (id) { say(); write(focusPatch(id)); });
    ui.second = regionSelect(function (id) { say(); write({ second: id }); });
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
      if (i >= 0 && set.length <= 2) { say(t('compare.setMin')); return; }
      if (i >= 0) set.splice(i, 1); else set.push(id);
      say();
      write({ set: inFileOrder(set) });
    }

    // A chosen set is one button with the count; the regions open below it by click (D50)
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
      if (!on) say();
      if (refocus) ui.setBtn.focus();
    }
    ui.showSet = showSet;

    ui.pickers = {
      focus: field('focus', ui.focusLabel, ui.focus),
      second: field('second', el('span', { class: 'tap-cmp__label' }, t('compare.second')), ui.second),
      rest: field('rest', el('span', { class: 'tap-cmp__label' }, t('compare.rest')), ui.rest),
      set: field('set', null, [ui.setBtn, ui.setPop])
    };

    ui.sentence = el('span', { class: 'tap-cmp__sentence', 'aria-live': 'polite' });
    ui.pop = el('div', { class: 'tap-cmp__pop', role: 'note', hidden: true });
    ui.explain = el('button', { type: 'button', class: 'tap-iconbtn tap-cmp__explain', 'aria-expanded': 'false',
      'aria-label': t('compare.explain'), onclick: function () { showPop(ui.pop.hidden); } }, TAP.icons.svg('info'));
    ui.date = el('button', { type: 'button', class: 'tap-btn tap-cmp__date', 'data-tour': 'datadate',
      onclick: openSources }, [TAP.icons.svg('data'), el('span', null, dataDate())]);

    function showPop(on) {
      ui.pop.hidden = !on;
      ui.explain.setAttribute('aria-expanded', String(!!on));
    }
    ui.showPop = showPop;

    TAP.dom.append(root, [
      el('div', { class: 'tap-cmp__row tap-cmp__row--controls' }, [
        el('span', { class: 'tap-cmp__title' }, t('compare.label')), ui.modes,
        ui.pickers.focus, ui.pickers.second, ui.pickers.rest, ui.pickers.set
      ]),
      el('div', { class: 'tap-cmp__row tap-cmp__row--sentence' }, [
        el('p', { class: 'tap-cmp__say' }, [ui.sentence, ui.explain]), ui.date, actions || null, ui.pop
      ])
    ]);
    return ui;
  }

  // The side panels may not be built yet (#6); a click must never end in a console error.
  function openSources() {
    if (!TAP.layers.__stub) TAP.layers.open('sources');
  }

  function dataDate() {
    return t('compare.dataDate', { date: TAP.format.date(TAP.sources.dataDate()) });
  }

  // What a combined figure on screen means, in plain words, or null when none is shown (with one region, the
  // scope draws no rest).
  function combinedNote(c) {
    var isOrg = c.mode === 'org';
    if (!isOrg && (c.mode !== 'one' || c.restAs !== 'combined')) return null;
    var label = combinedLabel(c);
    if (!label) return null;
    var total = isOrg || c.restAgg === 'total';
    return { label: label, text: t(total ? 'combined.explainTotal' : 'combined.explainAverage') };
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
    // With one region there is no second region and no rest to pick
    var others = ids().length > 1;
    var need = { focus: c.mode === 'one' || c.mode === 'pair', second: c.mode === 'pair' && others, rest: c.mode === 'one' && others,
      set: c.mode === 'set' };
    Object.keys(need).forEach(function (k) { ui.pickers[k].hidden = !need[k]; });
    if (!need.set) ui.showSet(false);
    TAP.dom.text(ui.focusLabel, t(c.mode === 'one' ? 'compare.focus' : 'compare.region'));
    if (c.focus) ui.focus.value = c.focus;
    TAP.dom.qsa('option', ui.second).forEach(function (o) { o.disabled = o.value === c.focus; });
    if (c.second) ui.second.value = c.second;
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

  // A comparison can name regions the data doesn't have (an opening state from the address bar, or other data).
  // Fill in what the mode needs from the data instead, so the pickers and the sentence agree.
  function repair() {
    var c = cmp(), p = modePatch(c.mode), fix = {};
    ['focus', 'second', 'set'].forEach(function (k) {
      if (k in p && JSON.stringify(p[k]) !== JSON.stringify(c[k])) fix[k] = p[k];
    });
    if (Object.keys(fix).length) write(fix);
  }

  // opts.actions: the shell's page-wide actions slot, placed after the data date.
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
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    function stop() {
      offStore();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      if (active === stop) active = null;
    }
    active = stop;
  }

  TAP.compareBar = { mount: mount };
})(window.TAP);
