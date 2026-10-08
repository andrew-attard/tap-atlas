/*
 * File: js/ui/multi-select.js
 * Purpose: A dropdown multi-select: a button naming the choice ("Regions: All", "Regions: 2 selected") that opens a
 *          checklist with "All" and "Clear" at the top (D126). The caller keeps the state and redraws on each change,
 *          so the open dropdown survives a redraw; watch() closes it on an outside click or Esc.
 * Provides: TAP.multiSelect (render, watch)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js (wording under multiSelect.*)
 * Used by: js/views/insights-filters.js
 *
 * Keyboard: Tab reaches the button, Enter or Space opens it, the arrow keys move through "All", "Clear" and the
 * options, Space ticks an option (a native checkbox) and Esc closes. "All" ticks every option and "Clear" unticks
 * them; both list everything, as a start for leaving one out or for picking a few.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('multiSelect.' + key, vars); }

  // The button's words: nothing or everything ticked is "All", one names it, more are counted.
  function valueText(options, selected) {
    var on = options.filter(function (o) { return selected.indexOf(o.value) >= 0; });
    if (!on.length || on.length === options.length) return t('all');
    return on.length === 1 ? on[0].label : t('selected', { n: on.length });
  }

  // Arrow keys move through the open checklist; ArrowDown from the button enters it.
  function onArrow(box, e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var panel = box.querySelector('.tap-ms__panel');
    if (!panel || panel.hidden) return;
    var stops = Array.prototype.slice.call(panel.querySelectorAll('button, input'));
    var i = stops.indexOf(document.activeElement), next;
    if (i < 0) next = e.key === 'ArrowDown' ? 0 : stops.length - 1;
    else next = Math.max(0, Math.min(stops.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
    if (!stops[next]) return;
    e.preventDefault();
    stops[next].focus();
  }

  /*
   * opts: {id, label, options: [{value, label, color?, count?: Node}], selected: [values], open: bool,
   *        onOpen(open), onChange(selected)}. Every control carries a data-key ('ms:<id>', 'ms:<id>:<value>'),
   *        so a caller that redraws can put focus back where it was.
   */
  function render(opts) {
    var id = opts.id, sel = opts.selected || [], panelId = 'tap-ms-' + id;
    var values = opts.options.map(function (o) { return o.value; });
    var btn = el('button', { type: 'button', class: 'tap-ms__btn', 'data-key': 'ms:' + id, 'aria-expanded': String(!!opts.open),
      'aria-controls': panelId, onclick: function () { opts.onOpen(btn.getAttribute('aria-expanded') !== 'true'); } }, [
      el('span', { class: 'tap-ms__label' }, t('button', { label: opts.label })), ' ',
      el('span', { class: 'tap-ms__value' }, valueText(opts.options, sel)),
      TAP.icons.svg('down', { size: 16 })
    ]);
    var list = el('ul', { class: 'tap-ms__list' }, opts.options.map(function (o) {
      var box = el('input', { type: 'checkbox', 'data-value': o.value, 'data-key': 'ms:' + id + ':' + o.value,
        checked: sel.indexOf(o.value) >= 0 });
      box.addEventListener('change', function () {
        opts.onChange(box.checked ? sel.concat(o.value) : sel.filter(function (v) { return v !== o.value; }));
      });
      var sw = o.color ? el('span', { class: 'tap-swatch tap-ms__sw', 'aria-hidden': 'true' }) : null;
      if (sw) sw.style.background = o.color;
      return el('li', null, el('label', { class: 'tap-ms__opt' }, [box, sw, el('span', { class: 'tap-ms__name' }, o.label), o.count || null]));
    }));
    var panel = el('div', { class: 'tap-ms__panel', id: panelId, role: 'group', 'aria-label': opts.label, hidden: !opts.open }, [
      el('div', { class: 'tap-ms__head' }, [
        el('button', { type: 'button', class: 'tap-btn tap-ms__all', 'data-key': 'ms:' + id + ':all',
          onclick: function () { opts.onChange(values.slice()); } }, t('all')),
        el('button', { type: 'button', class: 'tap-btn tap-ms__clear', 'data-key': 'ms:' + id + ':clear',
          onclick: function () { opts.onChange([]); } }, t('clear'))
      ]),
      list
    ]);
    var box = el('div', { class: 'tap-ms', 'data-ms': id }, [btn, panel]);
    box.addEventListener('keydown', function (e) { onArrow(box, e); });
    return box;
  }

  // Closes a dropdown where it stands, with no redraw, so the click that closed it still reaches its target.
  function shut(box, refocus) {
    var btn = box.querySelector('.tap-ms__btn');
    box.querySelector('.tap-ms__panel').hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  }

  // Closes the open dropdown inside scope on an outside click or Esc, then calls closed(). Esc is marked as handled,
  // so side panels (js/ui/layers.js, which listens on window) leave it alone, as for the panels' popovers; focus goes
  // back to the dropdown's button. Returns a stop function.
  function watch(scope, openId, closed) {
    function openBox() { var id = openId(); return id ? scope.querySelector('.tap-ms[data-ms="' + id + '"]') : null; }
    function down(e) {
      var box = openBox();
      if (!box || box.contains(e.target)) return;
      shut(box, false);
      closed();
    }
    function key(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      var box = openBox();
      if (!box) return;
      e.preventDefault();
      shut(box, true);
      closed();
    }
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return function () {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }

  TAP.multiSelect = { render: render, watch: watch };
})(window.TAP);
