/*
 * File: js/panel/panel-menus.js
 * Purpose: Draws a panel's controls: the toolbar (insights, explanation, chart type) with its popovers, and the
 *          controls row (industry picker, measure, bubble size and the options a builder offers).
 * Provides: TAP.panelMenus (render, tools, types, spec, button, pop, seg, select)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/data.js, js/engine/shapes.js,
 *             js/engine/prepare.js, js/engine/measures.js, js/ui/layers.js, js/ui/explain.js,
 *             js/panel/panel-insights.js (all read at call time)
 * Used by: js/panel/panel.js, which passes its panel object p (state p.st; p.set, p.toggle, p.setType)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }

  /* ---------- building blocks ---------- */

  // A toolbar button: icon plus visible words (D24), with an optional count badge.
  function button(action, icon, label, opts) {
    opts = opts || {};
    return el('button', { type: 'button', class: 'tap-btn tap-panel__tool', 'data-action': action,
      'aria-expanded': opts.expanded == null ? null : String(!!opts.expanded),
      'aria-pressed': opts.pressed == null ? null : String(!!opts.pressed),
      'aria-label': opts.aria || null, disabled: opts.disabled || null, onclick: opts.onclick }, [
      icon ? TAP.icons.svg(icon, { size: 18 }) : null,
      el('span', null, label),
      opts.count != null ? el('span', { class: 'tap-panel__count' }, String(opts.count)) : null,
      opts.menu ? TAP.icons.svg('down', { size: 16 }) : null
    ]);
  }

  // A popover under the toolbar, one per panel at a time. Closed by its close button, an outside click or Esc.
  function pop(label, role) {
    return el('div', { class: 'tap-panel__pop' + (role === 'menu' ? ' tap-panel__pop--menu' : ''), role: role || 'dialog', 'aria-label': label });
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

  /* ---------- chart types (US-1.2.3) ---------- */

  // The types the menu offers (the table has its own button), and the one to draw: the chosen type while the
  // comparison allows it, else the default. A stored radar comes back once three or fewer regions are compared.
  function types(def, entityCount, st) {
    var list = TAP.shapes.types(def, entityCount, { breakdown: st.breakdown || null }).filter(function (x) { return x !== 'table'; });
    var fallback = list.indexOf(def.defaultType) >= 0 ? def.defaultType : (list[0] || 'table');
    return { list: list, current: list.indexOf(st.type) >= 0 ? st.type : fallback, def: def.defaultType };
  }

  function typeMenu(p, types) {
    var box = pop(t('typesLabel'), 'menu');
    box.appendChild(el('p', { class: 'tap-panel__pop-kicker' }, t('typesLabel')));
    types.list.forEach(function (type) {
      var on = type === types.current;
      box.appendChild(el('button', { type: 'button', class: 'tap-panel__item', role: 'menuitemradio', 'data-type': type,
        'aria-checked': String(on), onclick: function () { p.setType(type); } }, [
        el('span', { class: 'tap-panel__tick', 'aria-hidden': 'true' }, on ? '✓' : ''),
        el('span', { class: 'tap-panel__item-label' }, TAP.shapes.label(type)),
        type === types.def ? el('span', { class: 'tap-badge tap-panel__default' }, t('default')) : null
      ]));
    });
    return box;
  }

  /* ---------- the toolbar ---------- */

  function explain(def) {
    if (TAP.explain && !TAP.explain.__stub) { TAP.explain.open(def.id); return; }
    TAP.layers.open('explain', { title: t('aboutLabel'), render: function (body) {
      var seen = {};
      ['shows', 'read', 'lookFor'].forEach(function (k) {
        body.appendChild(el('section', { class: 'tap-panel__explain' }, [
          el('h3', null, t(k)), el('p', { html: TAP.content.mark((def.explain || {})[k] || '', seen) })
        ]));
      });
    } });
  }

  // b: the panel's build ({def, types, ...}); info: its insights ({list, count}).
  function tools(p, b, info) {
    var box = el('div', { class: 'tap-panel__tools', role: 'toolbar', 'aria-label': t('tools') }), open = p.st.pop;
    box.appendChild(button('insights', 'insight', t('insights'), { count: info.count, expanded: open === 'ins',
      aria: t('insightsCount', { n: info.count }), disabled: !info.count, onclick: function () { p.toggle('ins'); } }));
    box.appendChild(button('about', 'info', t('about'), { aria: t('aboutLabel'), onclick: function () { if (b.def) explain(b.def); } }));
    if (b.types && b.types.list.length) {
      box.appendChild(button('type', 'chart', TAP.shapes.label(b.types.current), { expanded: open === 'type', menu: true,
        aria: t('typeAria', { type: TAP.shapes.label(b.types.current) }), onclick: function () { p.toggle('type'); } }));
    }
    if (open === 'ins' && info.count) {
      var list = pop(t('insightsTitle'));
      TAP.panelInsights.render(list, info, TAP.panelInsights.handlers(p));
      box.appendChild(list);
    }
    if (open === 'type' && b.types) box.appendChild(typeMenu(p, b.types));
    return box;
  }

  /* ---------- the controls row ---------- */

  // What the controls row shows for this build: measure and bubble size when they apply, the industry picker,
  // and whatever the builder offers.
  function spec(p, b) {
    var def = b.def, o = def.options || {}, type = b.ctx.type, own = [];
    var ms = def.measures || [];
    if (ms.length > 1 && o.measuresAs !== 'categories' && !(def.shape === 'parts' && type === 'bubble')) {
      own.push({ key: 'measure', label: t('measure'), kind: 'segmented', value: TAP.prepare.selected(def, { measureId: p.st.measureId }),
        options: ms.map(function (m) { return { value: m.id, label: m.label }; }), onPick: function (k, v) { p.set({ measureId: v }); } });
    }
    var sizes = (def.size && def.size.options) || [];
    if (sizes.length > 1 && (type === 'bubble' || type === 'bubbleGrid')) {
      own.push({ key: 'size', label: t('size'), kind: 'segmented', value: p.st.sizeId || def.size.default || sizes[0],
        options: sizes.map(function (id) { var m = TAP.measures.meta(id) || {}; return { value: id, label: m.short || m.label || id }; }),
        onPick: function (k, v) { p.set({ sizeId: v }); } });
    }
    return {
      industry: o.industryPicker ? { value: b.industryId, onPick: function (id) {
        p.opts.industryId = id;   // shown at once; the view may then move state.industry, which wins
        TAP.bus.emit('industry:select', { industryId: id });
        p.render();
      } } : null,
      own: own,
      builder: (b.res && b.res.controls) || [],
      onBuilder: function (key, v) { p.st.opts[key] = v; p.render(); }
    };
  }

  // The controls row. Returns null when there is nothing to show.
  function render(sp) {
    var items = [];
    if (sp.industry) {
      var opts = TAP.data.industries({ rated: true }).map(function (d) { return { value: d.id, label: d.name }; });
      items.push(control({ key: 'industry', label: t('industry'), kind: 'select', value: sp.industry.value, options: opts },
        function (k, v) { sp.industry.onPick(v); }));
    }
    (sp.own || []).forEach(function (c) { items.push(control(c, c.onPick)); });
    (sp.builder || []).forEach(function (c) { items.push(control(c, sp.onBuilder)); });
    return items.length ? el('div', { class: 'tap-panel__controls' }, items) : null;
  }

  TAP.panelMenus = { render: render, tools: tools, types: types, spec: spec, button: button, pop: pop, seg: seg, select: select };
})(window.TAP);
