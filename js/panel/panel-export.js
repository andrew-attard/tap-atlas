/*
 * File: js/panel/panel-export.js
 * Purpose: Saves or copies a panel's chart as an image for slides and emails (US-1.2.10): the chart picture with
 *          the title above it, the legend and source line below, and the sample or internal label on top.
 * Provides: TAP.panelExport (saveImage, copyImage, specOf, compose, download, clipboardImage)
 * Depends on: vendor/echarts.min.js (getInstanceByDom, getDataURL), js/theme.js, js/core/dom.js, js/core/content.js,
 *             js/ui/shell.js (label)
 * Used by: js/panel/panel.js
 */
(function (TAP) {
  'use strict';

  var R = 2;   // pixel ratio: sharp on slides and high-density screens
  function th() { return window.TAP_THEME; }
  function t(key, vars) { return TAP.content.text('panel.' + key, vars); }
  function txt(node) { return node ? node.textContent.replace(/\s+/g, ' ').trim() : ''; }

  // What the image shows, read from the panel as drawn, so it matches the screen. Null when there is no chart.
  function specOf(root) {
    var chartEl = TAP.dom.qs('.tap-panel__body .tap-panel__chart', root);
    var chart = chartEl && window.echarts.getInstanceByDom(chartEl);
    if (!chart) return null;
    return {
      id: root.getAttribute('data-report') || 'chart',
      chart: chart,
      title: txt(TAP.dom.qs('.tap-panel__title', root)),
      legend: TAP.dom.qsa('.tap-panel__legend-item', root).map(function (n) {
        var key = TAP.dom.qs('.tap-panel__key', n);
        return { label: txt(n), color: key ? key.style.backgroundColor : th().ink };
      }),
      lines: TAP.dom.qsa('.tap-panel__parts, .tap-panel__size-label, .tap-panel__notes li', root).map(txt),
      source: TAP.dom.qsa('.tap-panel__source > span', root).map(txt).join('   '),
      label: TAP.shell.label()
    };
  }

  function load(url) {
    return new Promise(function (done, fail) {
      var img = new Image();
      img.onload = function () { done(img); };
      img.onerror = function () { fail(new Error('The chart picture could not be read.')); };
      img.src = url;
    });
  }

  function font(weight, size) { return weight + ' ' + Math.round(size * R) + 'px ' + th().font; }

  // Splits text into lines no wider than max.
  function wrap(ctx, text, max) {
    var out = [], line = '';
    String(text || '').split(' ').forEach(function (w) {
      var next = line ? line + ' ' + w : w;
      if (line && ctx.measureText(next).width > max) { out.push(line); line = w; } else line = next;
    });
    if (line) out.push(line);
    return out;
  }

  // Lays the legend keys out in rows that fit the width.
  function legendRows(ctx, items, max) {
    var rows = [[]], x = 0, key = 16 * R, gap = 8 * R, space = 24 * R;
    items.forEach(function (l) {
      var w = key + gap + ctx.measureText(l.label).width;
      if (x && x + w > max) { rows.push([]); x = 0; }
      rows[rows.length - 1].push({ item: l, x: x });
      x += w + space;
    });
    return rows[0].length ? rows : [];
  }

  /*
   * Draws the composed image. Resolves to {canvas, texts}: texts lists every string drawn, in order.
   */
  function compose(spec) {
    if (!spec) return Promise.reject(new Error(t('imageNone')));
    var T = th(), bg = T.ground;
    if (!spec.chart.getWidth()) spec.chart.resize();   // a chart drawn before its panel was laid out
    return load(spec.chart.getDataURL({ pixelRatio: R, backgroundColor: bg })).then(function (img) {
      var pad = 24 * R, W = img.width + pad * 2, inner = img.width, texts = [];
      var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
      var bannerH = spec.label ? 36 * R : 0, titleSize = T.type.h2, bodySize = T.type.body, smallSize = T.type.label;
      ctx.font = font(800, titleSize);
      var titleLines = wrap(ctx, spec.title, inner);
      ctx.font = font(600, bodySize);
      var rows = legendRows(ctx, spec.legend, inner);
      ctx.font = font(400, bodySize);
      var extra = spec.lines.reduce(function (all, l) { return all.concat(wrap(ctx, l, inner)); }, []);
      var tLine = titleSize * 1.25 * R, bLine = bodySize * 1.6 * R, sLine = smallSize * 1.6 * R;
      canvas.width = W;
      canvas.height = Math.ceil(bannerH + pad + titleLines.length * tLine + pad / 2 + img.height + pad / 2 +
        rows.length * bLine + extra.length * bLine + (spec.source ? sLine + pad / 2 : 0) + pad);

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textBaseline = 'middle';
      var y = 0;
      function write(text, x, yy) { ctx.fillText(text, x, yy); texts.push(text); }
      if (spec.label) {
        ctx.fillStyle = spec.label.kind === 'internal' ? T.bannerInternal : T.bannerSample;
        ctx.fillRect(0, 0, W, bannerH);
        ctx.fillStyle = T.onColour;
        ctx.font = font(800, bodySize);
        write(spec.label.text, pad, bannerH / 2);
        y = bannerH;
      }
      y += pad;
      ctx.fillStyle = T.ink;
      ctx.font = font(800, titleSize);
      titleLines.forEach(function (l) { write(l, pad, y + tLine / 2); y += tLine; });
      y += pad / 2;
      ctx.drawImage(img, pad, y);
      y += img.height + pad / 2;
      ctx.font = font(600, bodySize);
      rows.forEach(function (row) {
        row.forEach(function (c) {
          var k = 16 * R;
          ctx.fillStyle = c.item.color || T.ink;
          ctx.fillRect(pad + c.x, y + (bLine - k) / 2, k, k);
          ctx.strokeStyle = T.ink;
          ctx.lineWidth = R;
          ctx.strokeRect(pad + c.x, y + (bLine - k) / 2, k, k);
          ctx.fillStyle = T.ink;
          write(c.item.label, pad + c.x + k + 8 * R, y + bLine / 2);
        });
        y += bLine;
      });
      ctx.font = font(400, bodySize);
      ctx.fillStyle = T.muted;
      extra.forEach(function (l) { write(l, pad, y + bLine / 2); y += bLine; });
      if (spec.source) {
        y += pad / 2;
        ctx.font = font(400, smallSize);
        write(spec.source, pad, y + sLine / 2);
      }
      return { canvas: canvas, texts: texts };
    });
  }

  // The two outlets, kept apart so they can be swapped in tests.
  function download(url, name) {
    var a = TAP.dom.el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function clipboardImage(blob) {
    if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) return Promise.resolve(false);
    return navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]).then(function () { return true; }, function () { return false; });
  }

  // Each resolves to the message to show in the panel.
  function saveImage(root) {
    var spec = specOf(root);
    return compose(spec).then(function (out) {
      TAP.panelExport.download(out.canvas.toDataURL('image/png'), spec.id + '.png');
      return t('imageSaved');
    }, function () { return t('imageNone'); });
  }

  function copyImage(root) {
    return compose(specOf(root)).then(function (out) {
      return new Promise(function (done) { out.canvas.toBlob(done, 'image/png'); });
    }).then(function (blob) {
      return blob ? TAP.panelExport.clipboardImage(blob) : false;
    }).then(function (ok) { return t(ok ? 'imageCopied' : 'imageBlocked'); }, function () { return t('imageBlocked'); });
  }

  TAP.panelExport = { saveImage: saveImage, copyImage: copyImage, specOf: specOf, compose: compose,
    download: download, clipboardImage: clipboardImage };
})(window.TAP);
