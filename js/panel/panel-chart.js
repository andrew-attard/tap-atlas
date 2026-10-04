/*
 * File: js/panel/panel-chart.js
 * Purpose: Draws a builder's result inside a panel: the ECharts chart or HTML grid, the error and no-data
 *          states, the legend, the size legend, the notes under the chart and the source line. Also keeps focus
 *          on the same control across a redraw (focusKey).
 * Provides: TAP.panelChart (render, resize, dispose, html, error, empty, legend, notes, source, focusKey)
 * Depends on: vendor/echarts.min.js, js/theme.js (the 'tap' chart theme), js/core/dom.js, js/core/icons.js,
 *             js/core/content.js, js/core/format.js, js/core/sources.js
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
   * opts: {label, tall, scale, height, onClick(params)}. height is the builder's hint (px): the chart is at least that tall.
   */
  function render(cs, slot, option, opts) {
    opts = opts || {};
    if (!cs.el) cs.el = el('div', { role: 'img' });
    cs.el.className = 'tap-panel__chart' + (opts.tall ? ' tap-panel__chart--tall' : '');
    cs.el.setAttribute('aria-label', opts.label || '');
    cs.el.style.minHeight = opts.height ? Math.round(opts.height * (opts.scale || 1)) + 'px' : '';
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
  // {regionId, industryId} (plus row for a list row), so the panel can ask the builder for the target.
  // A click on a [data-tap-opt] element is a builder option instead (17.4): onOpt(key, value).
  function html(slot, str, onPick, onOpt) {
    var box = el('div', { class: 'tap-panel__html' });
    TAP.dom.html(box, str);
    box.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      var opt = e.target.closest('[data-tap-opt]');
      if (opt && box.contains(opt)) { if (onOpt) onOpt(opt.getAttribute('data-tap-opt'), opt.getAttribute('data-tap-value')); return; }
      var hit = e.target.closest('[data-tap-row], [data-tap-region], [data-tap-industry]');
      if (!hit || !box.contains(hit)) return;
      var d = { regionId: hit.getAttribute('data-tap-region') || null, industryId: hit.getAttribute('data-tap-industry') || null };
      if (hit.hasAttribute('data-tap-row')) d.row = hit.getAttribute('data-tap-row');
      onPick(d);
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

  // Stacked parts are shades of each region's colour, so they are named in words by shade rather than shown as
  // grey or black swatches, which would read as "the rest" or "combined".
  function parts(list) {
    if (!list.length) return null;
    var names = list.map(function (l) { return l.label; });
    var text = names.length === 2 ? t('partsTwo', { dark: names[0], light: names[1] }) :
      names.length === 1 ? names[0] : t('partsMany', { list: TAP.format.list(names) });
    return el('span', { class: 'tap-panel__parts' }, text);
  }

  // Legend keys: a square and the name for each region or combined figure, the parts in words. Never colour alone.
  function legend(res) {
    var all = res.legend || [], size = res.sizeLegend;
    var items = all.filter(function (l) { return l.role !== 'part'; });
    var shades = parts(all.filter(function (l) { return l.role === 'part'; }));
    if (!items.length && !size && !shades) return null;
    var box = el('div', { class: 'tap-panel__legend' });
    items.forEach(function (l) {
      // A numbered key matches the numbered dots (QA-4); a key with no colour is drawn as an outline (or left out for a note)
      var key = el('span', { class: 'tap-panel__key' + (l.mark != null ? ' tap-panel__key--num' : '') + (l.color ? '' : ' tap-panel__key--none'),
        'aria-hidden': 'true' }, l.mark != null ? String(l.mark) : null);
      if (l.color) key.style.background = l.color;
      if (l.mark != null && l.role === 'muted') key.classList.add('tap-panel__key--light');
      box.appendChild(el('span', { class: 'tap-panel__legend-item' + (l.role ? ' tap-panel__legend-item--' + l.role : '') }, [key, l.label]));
    });
    if (shades) box.appendChild(shades);
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

  // The source line: the kind glyph and word for each kind of data the report names, then the data date.
  function source(def) {
    var kinds = ((def && def.sources) || []).map(function (k) { return TAP.format.kind(k); });
    return el('footer', { class: 'tap-panel__source' }, kinds.map(function (k) {
      return el('span', { class: 'tap-kind' }, [el('span', { class: 'tap-kind__glyph', 'aria-hidden': 'true' }, k.glyph), ' ', k.label]);
    }).concat([el('span', { class: 'tap-panel__date' }, t('dataDate', { date: TAP.format.date(TAP.sources.dataDate()) }))]));
  }

  // A selector for the focused control inside root, so a redraw can put keyboard focus back on it. Null if none.
  function focusKey(root) {
    var a = document.activeElement;
    if (!a || !root.contains(a)) return null;
    var k = ['data-action', 'data-control', 'data-value', 'data-type', 'data-sort'].filter(function (n) { return a.hasAttribute(n); })
      .map(function (n) { return '[' + n + '="' + a.getAttribute(n) + '"]'; }).join('');
    // A builder option (a list's sort heading): the same option and column, whatever direction it now offers
    var v = a.getAttribute('data-tap-value') || '', cut = v.lastIndexOf(':');
    if (a.hasAttribute('data-tap-opt')) {
      k += '[data-tap-opt="' + CSS.escape(a.getAttribute('data-tap-opt')) + '"][data-tap-value^="' + CSS.escape(cut > 0 ? v.slice(0, cut + 1) : v) + '"]';
    }
    return k || null;
  }

  TAP.panelChart = { render: render, resize: resize, dispose: dispose, html: html, error: error, empty: empty,
    legend: legend, notes: notes, source: source, focusKey: focusKey };
})(window.TAP);
