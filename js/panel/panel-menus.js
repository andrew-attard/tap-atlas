/*
 * File: js/panel/panel-menus.js
 * Purpose: Draws a panel's controls: the tool buttons and their popovers, and the controls row (industry picker,
 *          builder-offered options; later chart type, measure, breakdown and compare differently).
 * Provides: TAP.panelMenus (render, button, pop, seg, select)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/data.js, js/engine/shapes.js
 * Used by: js/panel/panel.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }

  // A toolbar button: icon plus visible words (D24), with an optional count badge.
  function button(action, icon, label, opts) {
    opts = opts || {};
    return el('button', { type: 'button', class: 'tap-btn tap-panel__tool', 'data-action': action,
      'aria-expanded': opts.expanded == null ? null : String(!!opts.expanded),
      'aria-pressed': opts.pressed == null ? null : String(!!opts.pressed),
      'aria-label': opts.aria || null, disabled: opts.disabled || null, onclick: opts.onclick }, [
      icon ? TAP.icons.svg(icon, { size: 18 }) : null,
      el('span', null, label),
      opts.count != null ? el('span', { class: 'tap-panel__count' }, String(opts.count)) : null
    ]);
  }

  // A popover under the toolbar, one per panel at a time. Closed by its close button, an outside click or Esc.
  function pop(label, role) {
    return el('div', { class: 'tap-panel__pop', role: role || 'dialog', 'aria-label': label });
  }

  function same(a, b) { return String(a) === String(b); }

  // A row of mutually exclusive buttons. options: [{value, label}]. Values may be strings, numbers or booleans.
  function seg(key, label, value, options, onPick) {
    var group = el('div', { class: 'tap-panel__seg', role: 'group', 'aria-label': label, 'data-control': key });
    options.forEach(function (o) {
      group.appendChild(el('button', { type: 'button', class: 'tap-panel__seg-opt', 'data-value': String(o.value),
        'aria-pressed': String(same(o.value, value)), onclick: function () { onPick(o.value); } }, o.label));
    });
    return group;
  }

  function select(key, label, value, options, onPick) {
    var s = el('select', { class: 'tap-field tap-panel__select', 'data-control': key, 'aria-label': label });
    options.forEach(function (o) { s.appendChild(el('option', { value: String(o.value) }, o.label)); });
    s.value = String(value);
    s.addEventListener('change', function () {
      var hit = options.filter(function (o) { return same(o.value, s.value); })[0];
      onPick(hit ? hit.value : s.value);
    });
    return s;
  }

  // One labelled control: {key, label, kind: 'segmented'|'select', value, options}.
  function control(c, onPick) {
    var make = c.kind === 'select' ? select : seg;
    return el('div', { class: 'tap-panel__control' }, [
      el('span', { class: 'tap-panel__control-label' }, c.label),
      make(c.key, c.label, c.value, c.options || [], function (v) { onPick(c.key, v); })
    ]);
  }

  /*
   * The controls row. spec: {industry: {value, onPick} | null, own: [control], builder: [control], onBuilder(key, v)}
   * Returns null when there is nothing to show.
   */
  function render(spec) {
    var items = [];
    if (spec.industry) {
      var opts = TAP.data.industries({ rated: true }).map(function (d) { return { value: d.id, label: d.name }; });
      items.push(control({ key: 'industry', label: t('industry'), kind: 'select', value: spec.industry.value, options: opts },
        function (k, v) { spec.industry.onPick(v); }));
    }
    (spec.own || []).forEach(function (c) { items.push(control(c, c.onPick)); });
    (spec.builder || []).forEach(function (c) { items.push(control(c, spec.onBuilder)); });
    return items.length ? el('div', { class: 'tap-panel__controls' }, items) : null;
  }

  TAP.panelMenus = { render: render, button: button, pop: pop, seg: seg, select: select };
})(window.TAP);
