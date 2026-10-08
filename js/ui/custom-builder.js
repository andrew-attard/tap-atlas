/*
 * File: js/ui/custom-builder.js
 * Purpose: The builder of the Build a chart view (US-3.5.1, US-3.5.3, D140): the kept charts as a row of chips at
 *          the top, the controls on the left (custom-controls.js) and the chart beside them, drawn again at every
 *          change. Every choice comes from TAP.custom (measure metadata, D68); the chart is an ordinary panel drawn
 *          from the custom definition, so comparison, sources and "not provided" work as on the prepared reports.
 * Provides: TAP.customBuilder (render)
 * Depends on: js/engine/custom.js, js/ui/custom-controls.js, js/panel/panel.js, panel-chart.js (error), js/core/dom.js,
 *             content.js, storage.js (all at call time)
 * Used by: js/views/build.js (its own menu item since D96; it was a Guide section)
 * Owner: CUSTOM stream (#80)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('custom.' + key, vars); }

  var cur = null;   // the current choice, in memory only: nothing is kept after the tab closes (US-3.5.3)

  // A definition that fails shows its errors in its own box, in the panel's place (US-3.5.2).
  function failed(slot, errors) {
    var box = el('section', { class: 'tap-panel tap-custom__failed' }, [el('h2', { class: 'tap-panel__title' }, t('failed'))]);
    slot.appendChild(box);
    TAP.panelChart.error(box, errors);
  }

  // Which control has focus, so a redraw can give it back (a measure's radio, the search box, the Region dropdown,
  // or a button of a button group).
  function focusOf(box) {
    var a = document.activeElement;
    if (!a || !box.contains(a)) return null;
    var g = a.closest ? a.closest('[data-control]') : null;
    return { custom: a.getAttribute('data-custom'), control: g && g.getAttribute('data-control'), value: a.getAttribute('data-value') };
  }
  function refocus(box, f) {
    if (!f) return;
    var to = f.custom ? (f.value && TAP.dom.qs('[data-custom="' + f.custom + '"][data-value="' + f.value + '"]', box)) || TAP.dom.qs('[data-custom="' + f.custom + '"]', box)
      : f.control ? (TAP.dom.qs('[data-control="' + f.control + '"] [data-value="' + f.value + '"]', box) ||
        TAP.dom.qs('[data-control="' + f.control + '"] [aria-pressed="true"]', box)) : null;
    if (to && to.focus) to.focus({ preventScroll: true });
  }

  // The kept charts (US-3.5.3) as chips: each a button that reopens the chart, and a × that removes it.
  function keptChips(box, onOpen, onRemove) {
    var items = TAP.custom.saved();
    TAP.dom.clear(box);
    box.appendChild(el('h3', { class: 'tap-custom__h3', tabindex: '-1' }, t('list.heading')));
    if (!items.length) { box.appendChild(el('p', { class: 'tap-custom__note' }, t('list.empty'))); return; }
    box.appendChild(el('ul', { class: 'tap-custom__chips' }, items.map(function (s, i) {
      var d = TAP.custom.definition(s), title = d.title || s.measure;
      return el('li', { class: 'tap-custom__chip' }, [
        el('button', { type: 'button', class: 'tap-custom__open', 'data-custom-open': String(i), onclick: function () { onOpen(i); } }, title),
        el('button', { type: 'button', class: 'tap-custom__remove', 'data-custom-remove': String(i),
          'aria-label': t('list.removeLabel', { title: title }), onclick: function () { onRemove(i); } },
        el('span', { 'aria-hidden': 'true' }, t('list.remove')))
      ]);
    })));
  }

  /*
   * Draws the builder into host. opts.spec starts from a given choice ({ask, measure, by, type, region}, or an older
   * {measure, by, type}); without it the session's last choice, or the story's example. opts.lead false leaves out
   * the lead line (the view's header has it). Returns {el, spec(), destroy()}; the view calls destroy on unmount.
   */
  function render(host, opts) {
    var all = TAP.customControls.choices();
    if (opts && Object.prototype.hasOwnProperty.call(opts, 'spec')) cur = opts.spec;
    var pick = { topic: null, expanded: false, query: '', synced: null };   // the measure picker's topic, "Show all" and search
    cur = TAP.customControls.fit(cur, all, null);
    var panel = null, gone = false;
    var controls = el('div', { class: 'tap-custom__controls' }), slot = el('div', { class: 'tap-custom__panel' });
    var status = el('p', { class: 'tap-custom__status', role: 'status' }), listBox = el('div', { class: 'tap-custom__kept' });
    var actions = el('div', { class: 'tap-custom__actions' }, [
      el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-custom__keep', 'data-action': 'custom-keep', onclick: keep }, t('list.keep')), status]);
    var lead = opts && opts.lead === false ? null : el('p', { class: 'tap-custom__lead' }, t('lead'));
    var root = el('div', { class: 'tap-custom' }, [lead, listBox, controls, el('div', { class: 'tap-custom__chart' }, [slot, actions])]);
    host.appendChild(root);
    if (!cur) { TAP.dom.text(controls, t('none')); return { el: root, spec: function () { return null; }, destroy: function () {} }; }

    function choose(patch) { cur = TAP.customControls.fit(Object.assign({}, cur, patch), all, pick.topic); drawControls(); drawPanel(); }
    // The choice as the chart is drawn from it: a region only for one region, the type the question draws
    function spec() { var d = TAP.custom.definition(cur); return Object.assign({}, d.errors ? cur : d.spec); }

    // Keep, reopen and remove (US-3.5.3). A seventh chart is refused with the message from TAP.custom.save.
    function keep() {
      var r = TAP.custom.save(cur), d = TAP.custom.definition(cur);
      TAP.dom.text(status, r.ok ? t('list.kept', { title: d.title || cur.measure }) : r.message);
      drawList();
    }
    function reopen(i) { TAP.dom.text(status, ''); choose(TAP.custom.saved()[i]); }
    // After a removal, focus moves to the chip now in its place (or the one before), else to the row's heading
    function drop(i) {
      TAP.custom.remove(i);
      TAP.dom.text(status, '');
      drawList();
      var n = TAP.custom.saved().length, to = n ? TAP.dom.qs('[data-custom-open="' + Math.min(i, n - 1) + '"]', listBox) : TAP.dom.qs('.tap-custom__h3', listBox);
      if (to && to.focus) to.focus({ preventScroll: true });
    }
    function drawList() { keptChips(listBox, reopen, drop); }

    function drawControls() {
      var f = focusOf(controls);
      TAP.dom.clear(controls);
      TAP.customControls.render(controls, cur, all, pick, choose);
      refocus(controls, f);
    }

    // The panel: for one region, fixed to it (opts.cmp, so the comparison bar is ignored) with no "Compare differently"
    function drawPanel() {
      if (panel) { panel.destroy(); panel = null; }
      TAP.dom.clear(slot);
      var def = TAP.custom.definition(cur);
      if (def.errors) { failed(slot, def.errors); return; }
      TAP.storage.remove('chart:' + def.id);
      var o = { initial: { type: def.spec.type, breakdown: def.defaultBreakdown } };
      if (def.cmp) { o.cmp = def.cmp; o.noCompare = true; }
      panel = TAP.panel.create(slot, def, o);
    }

    // A type picked in the panel's own menu, or its Table button, is a new choice: the panel is drawn again from a
    // matching definition, so Reset all charts and a recorded step agree with Show as. The panel would remember
    // the type in the browser; a custom chart keeps nothing there (US-3.5.3), so it is taken back out at once.
    slot.addEventListener('click', function (e) {
      var at = e.target && e.target.closest ? e.target : null;
      var item = at && at.closest('[data-type]'), table = at && at.closest('[data-action="table"]');
      if (!(item || table) || !panel) return;
      TAP.storage.remove('chart:' + panel.id);
      choose({ type: item ? 'bar' : cur.type === 'table' ? 'bar' : 'table' });
      var btn = TAP.dom.qs('.tap-panel [data-action="' + (item ? 'type' : 'table') + '"]', slot);
      if (btn && btn.focus) btn.focus({ preventScroll: true });
    });

    drawControls();
    drawList();
    // A host not yet on the page gets its panel once it is, so a builder drawn and dropped without ever being shown
    // leaves no panel listening to the store behind it.
    if (slot.isConnected) drawPanel();
    else if (window.requestAnimationFrame) window.requestAnimationFrame(function () { if (!gone && slot.isConnected && !panel) drawPanel(); });
    return {
      el: root,
      spec: spec,
      destroy: function () {
        gone = true;
        if (panel) panel.destroy();
        panel = null;
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  TAP.customBuilder = { render: render };
})(window.TAP);
