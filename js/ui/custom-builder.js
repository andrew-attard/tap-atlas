/*
 * File: js/ui/custom-builder.js
 * Purpose: The "Build a chart" section of the Guide: pickers for measure, dimension and chart type, the custom chart panel and the session list (US-3.5.1, US-3.5.3).
 *          Every choice comes from TAP.custom (measure metadata, D68); the chart is an ordinary panel drawn from
 *          the custom definition, so comparison, sources and "not provided" work as on the prepared reports.
 * Provides: a Guide extra (TAP.guideExtras), TAP.customBuilder (render)
 * Depends on: js/engine/custom.js, js/panel/panel.js, panel-menus.js (seg), panel-chart.js (error), js/core/dom.js,
 *             content.js, format.js, storage.js (all at call time)
 * Used by: js/views/guide.js
 * Owner: CUSTOM stream (#80)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('custom.' + key, vars); }
  function lower(s) { return !s ? '' : /^[A-Z][A-Z0-9]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

  var GROUPS = ['amount', 'count', 'rate', 'rating'];
  var START = { measure: 'nb.hitRate', by: 'entity' };   // a first chart that reads at once: hit rate by region
  var cur = null;   // the current choice, in memory only: nothing is kept after the tab closes (US-3.5.3)

  // What a figure can be shown by, in words: its dimensions, or "region" when it has none.
  function byWords(list) {
    var dims = list.filter(function (b) { return b !== 'entity'; });
    return TAP.format.list((dims.length ? dims : ['entity']).map(function (b) { return lower(TAP.custom.byLabel(b)); }));
  }

  /*
   * The measures to pick from: every option that can be shown by something. A per-industry copy of a figure that
   * adds nothing (same name, fewer choices, e.g. "Current ARR" per industry) is left out; two different figures
   * that share a name are told apart by what they can be shown by. Figures with more choices are looked at first,
   * so the result doesn't depend on the catalogue's order; the list keeps the catalogue's order.
   */
  function choices() {
    var out = [], opts = TAP.custom.options(), pos = {};
    opts.forEach(function (o, i) { pos[o.measureId] = i; });
    opts.slice().sort(function (a, b) { return b.by.length - a.by.length || pos[a.measureId] - pos[b.measureId]; }).forEach(function (o) {
      if (!o.by.length) return;
      var same = out.filter(function (x) { return x.label === o.label; });
      if (same.some(function (x) { return o.by.every(function (b) { return x.by.indexOf(b) >= 0; }); })) return;
      var c = { id: o.measureId, label: o.label, by: o.by, group: o.valueKind, clash: same.length > 0 };
      same.forEach(function (x) { x.clash = true; });
      out.push(c);
    });
    out.forEach(function (c) { c.text = c.clash ? t('measureBy', { measure: c.label, by: byWords(c.by) }) : c.label; });
    return out.sort(function (a, b) { return pos[a.id] - pos[b.id]; });
  }

  // The nearest choice the catalogue allows: the measure if offered, the dimension and type if they still fit.
  function fit(spec, list) {
    spec = spec || START;
    var m = list.filter(function (x) { return x.id === spec.measure; })[0] || list.filter(function (x) { return x.id === START.measure; })[0] || list[0];
    if (!m) return null;
    var by = m.by.indexOf(spec.by) >= 0 ? spec.by : m.by[0], types = TAP.custom.types(by);
    return { measure: m.id, by: by, type: types.indexOf(spec.type) >= 0 ? spec.type : types[0] };
  }

  function measureSelect(list, onPick) {
    var s = el('select', { class: 'tap-field tap-custom__select', id: 'tap-custom-measure', 'data-custom': 'measure' });
    GROUPS.forEach(function (g) {
      var mine = list.filter(function (c) { return c.group === g; });
      if (!mine.length) return;
      var og = el('optgroup', { label: t('groups.' + g) });
      mine.forEach(function (c) { og.appendChild(el('option', { value: c.id }, c.text)); });
      s.appendChild(og);
    });
    s.value = cur.measure;
    s.addEventListener('change', function () { onPick(s.value); });
    return s;
  }

  function field(label, control, forId) {
    return el('div', { class: 'tap-custom__field' }, [
      forId ? el('label', { class: 'tap-custom__label', for: forId }, label) : el('span', { class: 'tap-custom__label' }, label),
      control
    ]);
  }

  // A definition that fails shows its errors in its own box, in the panel's place (US-3.5.2).
  function failed(slot, errors) {
    var box = el('section', { class: 'tap-panel tap-custom__failed' }, [el('h2', { class: 'tap-panel__title' }, t('failed'))]);
    slot.appendChild(box);
    TAP.panelChart.error(box, errors);
  }

  // Which picker control has focus, so a redraw can give it back (the select, or a button of a button group).
  function focusOf(box) {
    var a = document.activeElement;
    if (!a || !box.contains(a)) return null;
    var g = a.closest ? a.closest('[data-control]') : null;
    return { custom: a.getAttribute('data-custom'), control: g && g.getAttribute('data-control'), value: a.getAttribute('data-value') };
  }
  function refocus(box, f) {
    if (!f) return;
    var to = f.custom ? TAP.dom.qs('[data-custom="' + f.custom + '"]', box)
      : f.control ? (TAP.dom.qs('[data-control="' + f.control + '"] [data-value="' + f.value + '"]', box) ||
        TAP.dom.qs('[data-control="' + f.control + '"] [aria-pressed="true"]', box)) : null;
    if (to && to.focus) to.focus({ preventScroll: true });
  }

  // The session list: one button to reopen each kept chart, one to remove it (US-3.5.3).
  function keptList(box, onOpen, onRemove) {
    var items = TAP.custom.saved();
    TAP.dom.clear(box);
    TAP.dom.append(box, [el('h3', { class: 'tap-custom__h3', tabindex: '-1' }, t('list.heading')), el('p', { class: 'tap-custom__note' }, t('list.intro'))]);
    if (!items.length) { box.appendChild(el('p', { class: 'tap-custom__note' }, t('list.empty'))); return; }
    box.appendChild(el('ol', { class: 'tap-custom__list' }, items.map(function (s, i) {
      var d = TAP.custom.definition(s), words = { title: d.title || s.measure, type: lower(TAP.shapes.label(s.type)) };
      return el('li', { class: 'tap-custom__item' }, [
        el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-custom__open', 'data-custom-open': String(i),
          onclick: function () { onOpen(i); } }, t('list.open', words)),
        el('button', { type: 'button', class: 'tap-btn tap-custom__remove', 'data-custom-remove': String(i),
          'aria-label': t('list.removeLabel', words), onclick: function () { onRemove(i); } }, t('list.remove'))
      ]);
    })));
  }

  /*
   * Draws the section into host. opts.spec starts from a given choice ({measure, by, type}); without it the
   * session's last choice, or the story's example. Returns {el, spec(), destroy()}; the Guide calls destroy on unmount.
   */
  function render(host, opts) {
    var list = choices();
    if (opts && Object.prototype.hasOwnProperty.call(opts, 'spec')) cur = opts.spec;
    cur = fit(cur, list);
    var panel = null, gone = false;
    var pickers = el('div', { class: 'tap-custom__pickers' }), slot = el('div', { class: 'tap-custom__panel' });
    var status = el('p', { class: 'tap-custom__status', role: 'status' }), listBox = el('div', { class: 'tap-custom__kept' });
    var actions = el('div', { class: 'tap-custom__actions' }, [
      el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-custom__keep', 'data-action': 'custom-keep', onclick: keep }, t('list.keep')), status]);
    var root = el('div', { class: 'tap-custom' }, [el('p', { class: 'tap-custom__lead' }, t('lead')), pickers, actions, slot, listBox]);
    host.appendChild(root);
    if (!cur) { TAP.dom.text(pickers, t('none')); return { el: root, spec: function () { return null; }, destroy: function () {} }; }

    function choose(patch) { cur = fit(Object.assign({}, cur, patch), list); drawPickers(); drawPanel(); }

    // Keep, reopen and remove (US-3.5.3). A seventh chart is refused with the message from TAP.custom.save.
    function keep() {
      var r = TAP.custom.save(cur), d = TAP.custom.definition(cur);
      TAP.dom.text(status, r.ok ? t('list.kept', { title: d.title || cur.measure }) : r.message);
      drawList();
    }
    function reopen(i) { TAP.dom.text(status, ''); choose(TAP.custom.saved()[i]); }
    // After a removal, focus moves to the entry now in its place (or the one before), else to the list heading
    function drop(i) {
      TAP.custom.remove(i);
      TAP.dom.text(status, '');
      drawList();
      var n = TAP.custom.saved().length, to = n ? TAP.dom.qs('[data-custom-open="' + Math.min(i, n - 1) + '"]', listBox) : TAP.dom.qs('.tap-custom__h3', listBox);
      if (to && to.focus) to.focus({ preventScroll: true });
    }
    function drawList() { keptList(listBox, reopen, drop); }

    function drawPickers() {
      var m = list.filter(function (c) { return c.id === cur.measure; })[0], seg = TAP.panelMenus.seg, f = focusOf(pickers);
      TAP.dom.clear(pickers);
      TAP.dom.append(pickers, [
        field(t('measure'), measureSelect(list, function (id) { choose({ measure: id }); }), 'tap-custom-measure'),
        field(t('byPicker'), seg('custom-by', t('byPicker'), cur.by, m.by.map(function (b) { return { value: b, label: TAP.custom.byLabel(b) }; }),
          function (v) { choose({ by: v }); })),
        field(t('type'), seg('custom-type', t('type'), cur.type, TAP.custom.types(cur.by).map(function (x) {
          return { value: x, label: TAP.shapes.label(x) };
        }), function (v) { choose({ type: v }); }))
      ]);
      refocus(pickers, f);
    }

    function drawPanel() {
      if (panel) { panel.destroy(); panel = null; }
      TAP.dom.clear(slot);
      var def = TAP.custom.definition(cur);
      if (def.errors) { failed(slot, def.errors); return; }
      TAP.storage.remove('chart:' + def.id);
      panel = TAP.panel.create(slot, def, { initial: { type: def.spec.type, breakdown: def.defaultBreakdown } });
    }

    // A type picked in the panel's own menu is a new choice: the panel is drawn again from a matching definition,
    // so Reset all charts and a recorded step agree with the picker. The panel would remember the type in the
    // browser; a custom chart keeps nothing there (US-3.5.3), so it is taken back out at once.
    slot.addEventListener('click', function (e) {
      var item = e.target && e.target.closest ? e.target.closest('[data-type]') : null;
      if (!item || !panel) return;
      TAP.storage.remove('chart:' + panel.id);
      choose({ type: item.getAttribute('data-type') });
      var btn = TAP.dom.qs('.tap-panel [data-action="type"]', slot);
      if (btn && btn.focus) btn.focus({ preventScroll: true });
    });

    drawPickers();
    drawList();
    // The Guide draws its sections before they are on the page. The panel waits until the section is, so a Guide
    // drawn and dropped without ever being shown leaves no panel listening to the store behind it.
    if (slot.isConnected) drawPanel();
    else if (window.requestAnimationFrame) window.requestAnimationFrame(function () { if (!gone && slot.isConnected && !panel) drawPanel(); });
    return {
      el: root,
      spec: function () { return Object.assign({}, cur); },
      destroy: function () {
        gone = true;
        if (panel) panel.destroy();
        panel = null;
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  TAP.customBuilder = { render: render };

  // A section of the Guide, not a view, so the menu and its number keys don't change (D70)
  TAP.guideExtras = TAP.guideExtras || [];
  TAP.guideExtras.push({ id: 'buildChart', title: TAP.content.text('custom.heading'), render: function (body) { return render(body); } });
})(window.TAP);
