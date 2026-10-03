/*
 * File: js/panel/panel-chart.js
 * Purpose: Draws a builder's result inside a panel: the ECharts chart or HTML grid, the error and no-data
 *          states, the legend, the size legend and the notes under the chart.
 * Provides: TAP.panelChart (render, resize, dispose, html, error, empty, legend, notes)
 * Depends on: vendor/echarts.min.js, js/theme.js (the 'tap' chart theme), js/core/dom.js, js/core/icons.js,
 *             js/core/content.js, js/core/format.js
 * Used by: js/panel/panel.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }

  // Larger text for the expanded view (US-1.2.8): every fontSize in the option grows by the factor.
  function scaleFonts(o, f, depth) {
    if (!o || typeof o !== 'object' || depth > 12) return;
    if (Array.isArray(o)) { o.forEach(function (x) { scaleFonts(x, f, depth + 1); }); return; }
    Object.keys(o).forEach(function (k) {
      if (k === 'fontSize' && typeof o[k] === 'number') o[k] = Math.round(o[k] * f);
      else scaleFonts(o[k], f, depth + 1);
    });
  }

  /*
   * Draws an ECharts option into slot. cs is the panel's chart state ({el, chart}); the chart element and its
   * ECharts instance are kept between redraws, so switching a setting only replaces the option.
   * opts: {label, tall, scale, onClick(params)}
   */
  function render(cs, slot, option, opts) {
    opts = opts || {};
    if (!cs.el) cs.el = el('div', { role: 'img' });
    cs.el.className = 'tap-panel__chart' + (opts.tall ? ' tap-panel__chart--tall' : '');
    cs.el.setAttribute('aria-label', opts.label || '');
    slot.appendChild(cs.el);
    if (!cs.chart || cs.chart.isDisposed()) {
      cs.chart = window.echarts.init(cs.el, 'tap');
      cs.chart.on('click', function (p) { if (cs.onClick) cs.onClick(p); });
      cs.resize = function () { if (cs.chart && !cs.chart.isDisposed()) cs.chart.resize(); };
      window.addEventListener('resize', cs.resize);
    }
    cs.onClick = opts.onClick || null;
    if (opts.scale && opts.scale !== 1) scaleFonts(option, opts.scale, 0);
    cs.chart.setOption(option, { notMerge: true });
    cs.chart.resize();
    // A panel drawn before it is on the page has no size yet: size it once the browser has laid it out
    if (!cs.el.clientWidth && window.requestAnimationFrame) window.requestAnimationFrame(cs.resize);
    return cs.chart;
  }

  function resize(cs) { if (cs && cs.resize) cs.resize(); }

  function dispose(cs) {
    if (!cs || !cs.chart) return;
    window.removeEventListener('resize', cs.resize);
    if (!cs.chart.isDisposed()) cs.chart.dispose();
    cs.chart = null;
    if (cs.el && cs.el.parentNode) cs.el.parentNode.removeChild(cs.el);
  }

  // A builder's HTML (already escaped by the builder). Clicks on data-tap-* elements are passed on as
  // {regionId, industryId}, so the panel can ask the builder for the target.
  function html(slot, str, onPick) {
    var box = el('div', { class: 'tap-panel__html' });
    TAP.dom.html(box, str);
    box.addEventListener('click', function (e) {
      var hit = e.target.closest ? e.target.closest('[data-tap-region], [data-tap-industry]') : null;
      if (!hit || !box.contains(hit)) return;
      onPick({ regionId: hit.getAttribute('data-tap-region') || null, industryId: hit.getAttribute('data-tap-industry') || null });
    });
    slot.appendChild(box);
    return box;
  }

  // An invalid definition or a failing builder: the problem stays inside this panel.
  function error(slot, messages) {
    slot.appendChild(el('div', { class: 'tap-panel__error', role: 'alert' }, [
      el('p', { class: 'tap-panel__state-title' }, [TAP.icons.svg('warning', { size: 22 }), el('span', null, t('errorTitle'))]),
      el('ul', { class: 'tap-panel__error-list' }, messages.map(function (m) { return el('li', null, m); })),
      el('p', { class: 'tap-muted' }, t('errorNote'))
    ]));
  }

  // No region in scope has data: a message instead of an empty chart, naming the regions without data.
  function empty(slot, missing) {
    slot.appendChild(el('div', { class: 'tap-panel__empty', role: 'status' }, [
      el('p', { class: 'tap-panel__state-title' }, t('emptyTitle')),
      el('p', null, t('emptyBody')),
      missing && missing.length ? el('p', null, t('emptyMissing', { names: TAP.format.list(missing) })) : null
    ]));
  }

  // Legend keys: squares for regions and parts (parts carry their shade), each with its name. Never colour alone.
  function legend(res) {
    var items = res.legend || [], size = res.sizeLegend;
    if (!items.length && !size) return null;
    var box = el('div', { class: 'tap-panel__legend' });
    items.forEach(function (l) {
      box.appendChild(el('span', { class: 'tap-panel__legend-item' + (l.role ? ' tap-panel__legend-item--' + l.role : '') }, [
        el('span', { class: 'tap-panel__key', style: 'background:' + l.color, 'aria-hidden': 'true' }), l.label
      ]));
    });
    if (size) {
      box.appendChild(el('span', { class: 'tap-panel__size' }, [
        el('span', { class: 'tap-panel__size-label' }, [size.label, size.kind ? ' (' + size.kind + ')' : '']),
        el('span', { class: 'tap-panel__size-items' }, (size.items || []).map(function (z) {
          return el('span', { class: 'tap-panel__size-item' }, [
            el('span', { class: 'tap-panel__circle', style: 'width:' + z.d + 'px;height:' + z.d + 'px', 'aria-hidden': 'true' }),
            el('span', null, z.text)
          ]);
        }))
      ]));
    }
    return box;
  }

  // Notes under the chart: how combined figures left regions out, and the regions with no data at all.
  function notes(res) {
    var list = (res.notes || []).slice();
    if (res.missing && res.missing.length) list.push(t('missing', { names: TAP.format.list(res.missing) }));
    if (!list.length) return null;
    return el('ul', { class: 'tap-panel__notes' }, list.map(function (n) { return el('li', null, n); }));
  }

  TAP.panelChart = { render: render, resize: resize, dispose: dispose, html: html, error: error, empty: empty,
    legend: legend, notes: notes };
})(window.TAP);
