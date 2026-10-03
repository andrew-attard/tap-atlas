/*
 * File: js/views/industry.js
 * Purpose: The Industry priorities view: the tier grid at full width, then attractiveness vs ability and the
 *          ratings side by side, then the leaders' commentary. Panels come from TAP.panel; while the panel is not
 *          built yet, a plain preview draws the builder's result so the view still works.
 * Provides: view 'industry' (registered with TAP.views), TAP.industryView (preview)
 * Depends on: js/engine/registry.js, js/core/dom.js, js/core/store.js, js/core/content.js, js/engine/scope.js,
 *             js/engine/shapes.js, js/panel/panel.js (TAP.panel.create), js/ui/layers.js, vendor/echarts.min.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text(key, vars); }

  /* ---------- clicks: select the industry, open details (ARCHITECTURE section 10) ---------- */

  function follow(target) {
    if (!target) return;
    if ((target.industryIds || []).length === 1) TAP.bus.emit('industry:select', { industryId: target.industryIds[0] });
    if ((target.regionIds || []).length && (target.industryIds || []).length) TAP.layers.openDetails(target);
  }

  /* ---------- preview, used only while TAP.panel is a stub ---------- */

  function builderFor(def) { return TAP.builders.get(def.builder || (def.shape === 'xyz' ? 'xy' : def.shape)); }

  function preview(slot, reportId, opts) {
    var def = TAP.reports.get(reportId), local = { type: def.defaultType, opts: {} }, chart = null, off = [];
    function ctx() {
      var s = TAP.store.get();
      return { def: def, type: local.type, measureId: null, sizeId: null, breakdown: null, cmp: s.cmp, entities: TAP.scope.entities(s.cmp),
        year: null, industryId: (opts && opts.industryId) || null, highlight: s.highlight, expanded: false, theme: window.TAP_THEME, opts: local.opts };
    }
    function buttons(label, list, current, pick) {
      return el('div', { class: 'tap-ind-preview__group', role: 'group', 'aria-label': label }, [el('span', { class: 'tap-ind-preview__label' }, label)]
        .concat(list.map(function (o) {
          return el('button', { type: 'button', class: 'tap-btn', 'aria-pressed': String(o.value === current), onclick: function () { pick(o.value); draw(); } }, o.label);
        })));
    }
    function draw() {
      if (chart) { chart.dispose(); chart = null; }
      TAP.dom.clear(slot);
      var c = ctx(), res = builderFor(def)(c);
      var types = TAP.shapes.types(def, c.entities.length).map(function (x) { return { value: x, label: TAP.shapes.label(x) }; });
      slot.appendChild(el('h2', { class: 'tap-ind-preview__title' }, def.title.replace('{industry}', (TAP.data.industry(c.industryId) || {}).name || '')));
      if (res.takeaway) slot.appendChild(el('p', { class: 'tap-ind-preview__takeaway' }, res.takeaway));
      var bar = el('div', { class: 'tap-ind-preview__controls' }, [buttons(t('industryView.chartType'), types, local.type, function (v) { local.type = v; })]);
      (res.controls || []).forEach(function (k) { bar.appendChild(buttons(k.label, k.options, k.value, function (v) { local.opts[k.key] = v; })); });
      slot.appendChild(bar);
      var body = el('div', { class: 'tap-ind-preview__body' });
      slot.appendChild(body);
      if (res.error) body.appendChild(el('p', { class: 'tap-stub' }, res.error));
      else if (res.empty) body.appendChild(el('p', { class: 'tap-muted' }, t('states.empty')));
      else if (res.html) {
        TAP.dom.html(body, res.html);   // built by the builder from escaped values
        TAP.dom.on(body, 'click', '[data-tap-industry]', function (e, node) {
          follow(res.target({ data: { regionId: node.getAttribute('data-tap-region'), industryId: node.getAttribute('data-tap-industry') } }));
        });
      } else if (res.option && window.echarts) {
        var box = el('div', { class: 'tap-ind-preview__chart', style: 'height:' + (res.height || window.TAP_THEME.chartHeight.normal) + 'px' });
        body.appendChild(box);
        chart = window.echarts.init(box, 'tap');
        chart.setOption(res.option);
        chart.on('click', function (p) { follow(res.target(p)); });
      } else if (res.table) body.appendChild(table(res.table));
      var notes = (res.legend || []).map(function (l) { return l.label; }).concat(res.sizeLegend ? [res.sizeLegend.label] : [], res.notes || []);
      if (res.missing && res.missing.length) notes.push(t('states.missing', { names: TAP.format.list(res.missing) }));
      if (notes.length) slot.appendChild(el('ul', { class: 'tap-ind-preview__notes' }, notes.map(function (n) { return el('li', null, n); })));
    }
    draw();
    off.push(TAP.store.on(function (s, changed) {
      if (['cmp', 'highlight', 'industry'].some(function (x) { return changed.indexOf(x) >= 0; })) draw();
    }));
    return { refresh: draw, destroy: function () { if (chart) chart.dispose(); off.forEach(function (f) { f(); }); } };
  }

  function table(tb) {
    return el('table', { class: 'tap-table' }, [
      el('thead', null, el('tr', null, tb.columns.map(function (c) { return el('th', null, c.label); }))),
      el('tbody', null, tb.rows.map(function (r) {
        return el('tr', null, tb.columns.map(function (c) { return el('td', null, TAP.format.cell(r.cells[c.key], { unit: c.unit, exact: true })); }));
      }))
    ]);
  }

  // A report panel, or the preview while the panel is not built.
  function mountPanel(slot, reportId, opts) {
    if (TAP.panel && !TAP.panel.__stub) {
      try { return TAP.panel.create(slot, reportId, opts || {}); } catch (e) { if (!/Not built yet/.test(e.message)) throw e; }
    }
    return preview(slot, reportId, opts);
  }

  /* ---------- the view ---------- */

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-ind' });
    page.appendChild(el('header', { class: 'tap-ind__head' }, [
      el('span', { class: 'tap-ind__kicker' }, t('industryView.kicker')),
      el('h1', { class: 'tap-ind__title' }, t('industryView.title'))
    ]));
    var tiers = el('section', { class: 'tap-ind__slot tap-ind__slot--wide', 'data-report': 'ind-tiers' });
    page.appendChild(tiers);
    root.appendChild(page);
    var panels = [mountPanel(tiers, 'ind-tiers')];
    var offs = [TAP.bus.on('industry:select', function (p) {
      if (p && p.industryId && p.industryId !== TAP.store.get().industry) TAP.store.set({ industry: p.industryId });
    })];
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      offs.forEach(function (f) { if (typeof f === 'function') f(); });
    } };
  }

  TAP.industryView = { preview: preview, follow: follow };
  TAP.views.register('industry', { title: 'Industry priorities', mount: mount });
})(window.TAP);
