/*
 * File: scripts/qa/text-size.js
 * Purpose: The D24 text-size check: every visible text node at 16 px or more for body text and 13 px or more
 *          anywhere, and every font size set in the ECharts options at 13 or more.
 * Provides: TAP_QA.textSize(root) returning {checked, sizes, body, small, charts}
 * Depends on: scripts/qa/hooks.js (TAP_QA); window.echarts when charts are on the page
 * Used by: scripts/qa/qa-run.js (on tests/qa.html); can also be pasted into the DevTools console on any page
 *
 * Body text is text whose nearest text block is a paragraph, list item, quote or
 * definition (p, li, dd, blockquote). Everything else (labels, buttons, badges,
 * table cells) only has to meet the 13 px floor. Canvases are skipped; their sizes
 * come from the chart options instead.
 */
(function () {
  'use strict';

  var BODY_MIN = 16;
  var ANY_MIN = 13;
  var BODY_TAGS = { P: 1, LI: 1, DD: 1, BLOCKQUOTE: 1 };
  var BLOCK_TAGS = { P: 1, LI: 1, DD: 1, DT: 1, BLOCKQUOTE: 1, TD: 1, TH: 1, BUTTON: 1, LABEL: 1, H1: 1, H2: 1, H3: 1,
    H4: 1, H5: 1, H6: 1, FIGCAPTION: 1, CAPTION: 1, LEGEND: 1, SUMMARY: 1, OPTION: 1, SELECT: 1 };

  function visible(el) {
    if (!el.getClientRects().length) return false;
    var r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;   // visually hidden text for screen readers
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function blockOf(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) if (BLOCK_TAGS[n.tagName]) return n;
    return null;
  }

  function where(el) {
    var parts = [];
    for (var n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentNode) {
      var c = typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : '';
      parts.unshift(n.tagName.toLowerCase() + (c ? '.' + c : ''));
      if (n.hasAttribute('data-report') || n.hasAttribute('data-view')) break;
    }
    return parts.join(' > ');
  }

  function walkText(root, out) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var seen = typeof Map === 'function' ? new Map() : null;
    for (var t = tw.nextNode(); t; t = tw.nextNode()) {
      var s = t.nodeValue.replace(/\s+/g, ' ').trim();
      var el = t.parentNode;
      if (!s || !el || el.nodeType !== 1) continue;
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || el.closest('#qa-result')) continue;
      if (seen && seen.has(el)) { if (!seen.get(el)) continue; } else {
        var ok = visible(el);
        if (seen) seen.set(el, ok);
        if (!ok) continue;
      }
      var px = parseFloat(getComputedStyle(el).fontSize);
      var block = blockOf(el);
      var body = !!(block && BODY_TAGS[block.tagName]);
      out.checked++;
      var key = String(Math.round(px * 10) / 10);
      out.sizes[key] = (out.sizes[key] || 0) + 1;
      var min = body ? BODY_MIN : ANY_MIN;
      if (px < min - 0.01) {
        (body ? out.body : out.small).push({ px: px, min: min, text: s.slice(0, 60), where: where(el) });
      }
    }
  }

  // Walks an ECharts option and lists every fontSize below the floor, with the path to it.
  function walkOption(o, path, out, depth) {
    if (!o || typeof o !== 'object' || depth > 8) return;
    if (Array.isArray(o)) { o.forEach(function (v, i) { walkOption(v, path + '[' + i + ']', out, depth + 1); }); return; }
    if (o.show === false) return;   // a hidden component draws no text
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      // A title's style only matters when it has that text (ECharts fills in a 12 px subtext style regardless)
      if (k === 'subtextStyle' && !o.subtext) return;
      if (k === 'textStyle' && 'text' in o && !o.text) return;
      if (k === 'data' && Array.isArray(v) && v.length > 50) return;   // long data arrays carry no styles worth the time
      if (k === 'fontSize' && typeof v === 'number') {
        out.sizes.push(v);
        if (v < ANY_MIN) out.small.push({ path: path + '.fontSize', px: v });
      } else if (v && typeof v === 'object') walkOption(v, path + '.' + k, out, depth + 1);
    });
  }

  function charts(root) {
    var res = [];
    if (!window.echarts) return res;
    var nodes = root.querySelectorAll('[_echarts_instance_]');
    Array.prototype.forEach.call(nodes, function (node) {
      var inst = window.echarts.getInstanceByDom(node);
      if (!inst) return;
      var panel = node.closest('[data-report]');
      var out = { report: panel ? panel.getAttribute('data-report') : where(node), sizes: [], small: [] };
      walkOption(inst.getOption(), 'option', out, 0);
      // The size ECharts falls back to when an option sets none
      var ts = (inst.getOption().textStyle || {});
      out.globalFontSize = Array.isArray(ts) ? (ts[0] || {}).fontSize : ts.fontSize;
      out.min = out.sizes.length ? Math.min.apply(null, out.sizes) : null;
      delete out.sizes;
      res.push(out);
    });
    return res;
  }

  function textSize(root) {
    root = root || document.body;
    var out = { checked: 0, sizes: {}, body: [], small: [] };
    walkText(root, out);
    // The text inside a closed select or an input has no text node on the page, so read the control itself
    Array.prototype.forEach.call(root.querySelectorAll('select, input:not([type="hidden"]), textarea'), function (c) {
      if (!visible(c)) return;
      var px = parseFloat(getComputedStyle(c).fontSize);
      out.checked++;
      out.sizes[String(px)] = (out.sizes[String(px)] || 0) + 1;
      var label = c.tagName === 'SELECT' && c.options[c.selectedIndex] ? c.options[c.selectedIndex].text : (c.value || c.placeholder || '');
      if (px < ANY_MIN - 0.01) out.small.push({ px: px, min: ANY_MIN, text: label.slice(0, 60), where: where(c) });
    });
    out.charts = charts(root);
    return out;
  }

  window.TAP_QA = window.TAP_QA || {};
  window.TAP_QA.textSize = textSize;
})();
