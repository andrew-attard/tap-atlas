/*
 * File: js/panel/panel-menus.js
 * Purpose: Draws a panel's controls: the toolbar (insights, explanation, chart type, table, more) with its popovers,
 *          the "compare differently" editor and badge, and the controls row (industry picker, measure, break down by,
 *          bubble size and the options a builder offers).
 * Provides: TAP.panelMenus (render, tools, types, spec, compareEditor, customBadge, button, pop, seg, select, breakdowns,
 *           fitBreakdown)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/data.js, js/core/store.js,
 *             js/engine/shapes.js, js/engine/scope.js, js/engine/prepare.js, js/engine/measures.js, js/ui/layers.js,
 *             js/ui/explain.js, js/panel/panel-insights.js (all read at call time)
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

  // The breakdowns on offer: the report's, narrowed to the dimensions the selected measure lists (17.3).
  // fitBreakdown drops a chosen one that is no longer offered, for example after a measure switch.
  function breakdowns(def, st) { return TAP.prepare.breakdowns(def, { measureId: st.measureId }) || []; }
  function fitBreakdown(def, st) { if (st.breakdown && breakdowns(def, st).indexOf(st.breakdown) < 0) st.breakdown = null; }

  // The types the menu offers (the table has its own button), and the one to draw: the chosen type while the
  // comparison allows it, else the default. A stored radar comes back once three or fewer regions are compared.
  function types(def, entityCount, st) {
    if (def.shape === 'list') return { list: [], current: 'list', def: 'list' };   // a list is its own table (US-2.7.2)
    // With a breakdown, point charts drop out: a bubble can't show the second dimension (US-1.2.7)
    var list = TAP.shapes.types(def, entityCount, { breakdown: st.breakdown || null }).filter(function (x) {
      return x !== 'table' && !(st.breakdown && /^(bubble|bubbleGrid|scatter)$/.test(x));
    });
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
    box.appendChild(el('p', { class: 'tap-panel__pop-note' }, t('tableNote')));
    return box;
  }

  /* ---------- compare this chart differently (US-1.1.4) ---------- */

  var MODES = ['all', 'one', 'pair', 'set', 'org'];
  function regionIds() { return TAP.data.regions().map(function (r) { return r.id; }); }

  // Fills in what a mode needs, from the regions in file order (never a fixed name), as the comparison bar does.
  function fill(c, patch) {
    var ids = regionIds(), n = Object.assign({}, c, patch);
    if (ids.indexOf(n.focus) < 0) n.focus = ids[0] || null;
    if (n.mode === 'pair' && (ids.indexOf(n.second) < 0 || n.second === n.focus)) n.second = ids.filter(function (x) { return x !== n.focus; })[0] || null;
    if (n.mode === 'set') {
      var set = ids.filter(function (id) { return (n.set || []).indexOf(id) >= 0; });
      n.set = set.length >= 2 ? set : ids.filter(function (id) { return id === n.focus; }).concat(ids.filter(function (id) { return id !== n.focus; })).slice(0, 2);
    }
    return n;
  }

  function regionOpts() { return TAP.data.regions().map(function (r) { return { value: r.id, label: TAP.content.regionName(r) }; }); }

  // The editor row under the header: mode, then only the pickers that mode needs.
  function compareEditor(p) {
    var c = p.st.custom || fill(p.cmp(), {});
    var setCustom = function (patch) { p.set({ custom: fill(c, patch) }); };
    var row = el('div', { class: 'tap-panel__custom-editor' }, [
      el('span', { class: 'tap-panel__control-label' }, t('compareTitle')),
      select('cmp-mode', t('compareMode'), c.mode, MODES.map(function (m) { return { value: m, label: TAP.content.text('compare.modes.' + m) }; }),
        function (m) { setCustom({ mode: m }); })
    ]);
    if (c.mode === 'one' || c.mode === 'pair') row.appendChild(select('cmp-focus', t('compareFocus'), c.focus, regionOpts(), function (v) { setCustom({ focus: v }); }));
    if (c.mode === 'pair') {
      row.appendChild(el('span', null, TAP.content.text('compare.second')));
      row.appendChild(select('cmp-second', t('compareSecond'), c.second, regionOpts().filter(function (o) { return o.value !== c.focus; }),
        function (v) { setCustom({ second: v }); }));
    }
    if (c.mode === 'set') {
      var chips = el('div', { class: 'tap-panel__chips', role: 'group', 'aria-label': TAP.content.text('compare.setLabel'), 'data-control': 'cmp-set' });
      TAP.data.regions().forEach(function (r) {
        var on = c.set.indexOf(r.id) >= 0;
        chips.appendChild(el('button', { type: 'button', class: 'tap-panel__chip', 'data-value': r.id, 'aria-pressed': String(on), onclick: function () {
          var set = c.set.filter(function (x) { return x !== r.id; });
          if (!on) set.push(r.id);
          if (set.length >= 2) setCustom({ set: set });   // a set needs at least two regions
        } }, [el('span', { class: 'tap-swatch', style: 'background:' + TAP.scope.colorOf(r.id), 'aria-hidden': 'true' }),
          TAP.content.regionName(r), el('span', { class: 'tap-panel__tick', 'aria-hidden': 'true' }, on ? '✓' : '')]));
      });
      row.appendChild(chips);
    }
    row.appendChild(el('button', { type: 'button', class: 'tap-btn tap-panel__tool', 'data-action': 'custom-done',
      onclick: function () { p.set({ editing: false }); } }, t('done')));
    return row;
  }

  // The badge says this chart differs from the page, in words, with a one-click way back.
  function customBadge(p, c) {
    return el('div', { class: 'tap-panel__custom' }, [
      el('span', { class: 'tap-badge tap-badge--accent' }, t('custom')),
      el('span', { class: 'tap-panel__custom-text' }, TAP.scope.sentence(c)),
      el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-panel__reset', 'data-action': 'custom-reset',
        onclick: function () { p.set({ custom: null, editing: false }); } }, [TAP.icons.svg('reset', { size: 16 }), t('customReset')])
    ]);
  }

  /* ---------- the toolbar ---------- */

  // The "More" menu: actions used less often.
  function moreMenu(p, chartOn) {
    var box = pop(t('more'), 'menu');
    function item(action, icon, label, fn, off) {
      box.appendChild(el('button', { type: 'button', class: 'tap-panel__item', role: 'menuitem', 'data-action': action,
        disabled: off || null, onclick: fn }, [TAP.icons.svg(icon, { size: 18 }), el('span', { class: 'tap-panel__item-label' }, label)]));
    }
    item('compare', 'compare', t('compareDifferently'), function () {
      p.set({ pop: null, editing: true });
    });
    var big = TAP.store.get().expanded === p.id;
    item(big ? 'collapse-menu' : 'expand', big ? 'shrink' : 'expand', t(big ? 'closeExpanded' : 'expand'), function () { p.st.pop = null; p.expand(!big); });
    item('fullscreen', 'fullscreen', t('fullscreen'), function () { p.st.pop = null; p.fullscreen(); p.render(); });
    box.appendChild(el('div', { class: 'tap-panel__sep', role: 'separator' }));
    // Images are of the chart itself, so they are offered on chart views only (US-1.2.10)
    item('save-image', 'download', t('saveImage'), function () { p.image('save'); }, !chartOn);
    item('copy-image', 'copy', t('copyImage'), function () { p.image('copy'); }, !chartOn);
    if (!chartOn) box.appendChild(el('p', { class: 'tap-panel__pop-note' }, t('imageNone')));
    return box;
  }

  // cmp: the panel's own comparison, when it has one, so the explanation describes what this chart compares.
  function explain(def, cmp) {
    if (TAP.explain && !TAP.explain.__stub) { TAP.explain.open(def.id, cmp ? { cmp: cmp } : undefined); return; }
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
    box.appendChild(button('about', 'info', t('about'), { aria: t('aboutLabel'), onclick: function () { if (b.def) explain(b.def, p.st.custom || p.opts.cmp); } }));
    if (b.types && b.types.list.length) {
      box.appendChild(button('type', 'chart', TAP.shapes.label(b.types.current), { expanded: open === 'type', menu: true,
        aria: t('typeAria', { type: TAP.shapes.label(b.types.current) }), onclick: function () { p.toggle('type'); } }));
    }
    if (b.types && b.types.current !== 'list') {
      box.appendChild(button('table', 'table', t('table'), { pressed: !!p.st.table,
        onclick: function () { p.set({ table: !p.st.table, pop: null }); } }));
    }
    if (b.types) {
      box.appendChild(button('more', null, t('more'), { expanded: open === 'more', menu: true, onclick: function () { p.toggle('more'); } }));
    }
    if (open === 'more' && b.types) box.appendChild(moreMenu(p, !p.st.table && !!(b.res && b.res.option && !b.res.empty && !b.errors.length)));
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
    // No switch where the axes come from x and y, or where the measures are the categories
    var xy = def.shape === 'xy' || def.shape === 'xyz' || (type === 'bubble' && (def.shape === 'parts' || !!(def.x && def.y)));
    if (ms.length > 1 && o.measuresAs !== 'categories' && !xy) {
      own.push({ key: 'measure', label: t('measure'), kind: 'segmented', value: TAP.prepare.selected(def, { measureId: p.st.measureId }),
        options: ms.map(function (m) { return { value: m.id, label: m.label }; }), onPick: function (k, v) { p.set({ measureId: v }); } });
    }
    var bds = breakdowns(def, p.st);
    if (bds.length) {
      own.push({ key: 'breakdown', label: t('breakdown'), kind: 'segmented', value: p.st.breakdown || 'none',
        options: [{ value: 'none', label: t('breakdownNone') }].concat(bds.map(function (x) { return { value: x, label: t('breakdowns.' + x) }; })),
        onPick: function (k, v) { p.set({ breakdown: v === 'none' ? null : v }); } });
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

  TAP.panelMenus = { render: render, tools: tools, types: types, spec: spec, compareEditor: compareEditor, customBadge: customBadge,
    button: button, pop: pop, seg: seg, select: select, breakdowns: breakdowns, fitBreakdown: fitBreakdown };
})(window.TAP);
