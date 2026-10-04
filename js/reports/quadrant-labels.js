/*
 * File: js/reports/quadrant-labels.js
 * Purpose: Places the quadrant chart's labels so they never overlap, biggest bubbles first, in the pixels the chart is
 *          drawn in. Display only: values, tooltips and the table never move.
 * Provides: TAP.quadrantLabels (place, at)
 * Depends on: js/theme.js (TAP_THEME, read at call time)
 * Used by: js/reports/quadrant.js
 *
 * place(pts, ctx, {scale, near}) sets on each named point p: p.label (the text, long names on two lines) and p.lab
 * ({side, dy, gap}, or null when there is no free spot), and returns the plot frame {f, fs, lh, m, x0, y0, w, h}.
 * Points carry x, y (cells), dx, dy (display nudge), d (bubble size), named, text and ind. at(p, d) gives the label's
 * position inside the symbol's box for ECharts.
 */
(function (TAP) {
  'use strict';

  /*
   * The plot in screen pixels: the panel passes the chart's size (ctx.size), so labels are placed where they will be
   * drawn. The margins are fixed (no containLabel) and hold the axis labels and the four area names, which sit
   * outside the plot so no bubble can cover them. f grows everything with the expanded view's larger text.
   */
  function frame(ctx, scale) {
    var th = window.TAP_THEME, f = ctx.expanded ? 1.3 : 1, fs = th.type.chart * f, lh = Math.round(fs + 6);
    var size = ctx.size && ctx.size.w > 200 ? ctx.size : { w: 520, h: th.chartHeight.tall };
    var m = { top: Math.round(28 * f) + lh + 22, right: 16, bottom: Math.round(36 * f) + lh * 2 + 8, left: Math.round(40 * f) + lh };
    return { scale: scale, f: f, fs: fs, lh: lh, m: m, x0: m.left, y0: m.top, w: Math.max(120, size.w - m.left - m.right), h: Math.max(120, size.h - m.top - m.bottom) };
  }
  function px(F, x, y) { var S = F.scale, span = S.max - S.min; return { x: F.x0 + (x - S.min) / span * F.w, y: F.y0 + (S.max - y) / span * F.h }; }

  /*
   * Places labels in screen pixels, the largest bubbles first so they win. A label never covers a labelled bubble and
   * stays in the plot; with no free spot it is left off (the point stays in the table and opens its details on click).
   */
  function placeLabels(pts, F, near) {
    var lh = F.lh, placed = [], cw = F.fs * 0.56, tries = [];
    var dots = pts.filter(function (p) { return p.named; }).map(function (p) { var c = at(p); c.r *= 0.8; return c; });
    function at(p) { var c = px(F, p.x.v + p.dx, p.y.v + p.dy); c.r = p.d / 2; return c; }
    function gp(p) { return p.ind.groupPriority ? 1 : 0; }   // equal sizes: group priorities first
    function free(b) {
      if (b.x < F.x0 || b.y < F.y0 - 4 || b.x + b.w > F.x0 + F.w + F.m.right - 4 || b.y + b.h > F.y0 + F.h) return false;
      return !placed.some(function (q) { return b.x < q.x + q.w && q.x < b.x + b.w && b.y < q.y + q.h && q.y < b.y + b.h; }) &&
        !dots.some(function (d) { return d.x + d.r > b.x && d.x - d.r < b.x + b.w && d.y + d.r > b.y && d.y - d.r < b.y + b.h; });
    }
    // Spots by distance: beside the bubble first, then a line up or down, then further out on a longer leader line
    [6, 28, 56, 90].forEach(function (g) { [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5].forEach(function (st) { tries.push([g, st, g / lh + Math.abs(st)]); }); });
    tries.sort(function (a, b) { return a[2] - b[2]; });
    var order = pts.filter(function (p) { return p.named; }).sort(function (a, b) { return Math.round(b.d) - Math.round(a.d) || gp(b) - gp(a) || b.y.v - a.y.v; });
    // Two rounds: every label first tries the spots close to its bubble, and only then the far ones
    var close = tries.filter(function (tr) { return tr[2] <= 2; });
    (near ? [close] : [close, tries]).forEach(function (list, round) {
      order.forEach(function (p) {
        if (round && p.lab) return;
        var c = at(p), wr = wrap(p.text, Math.max(110, F.w * 0.34) / cw), w = wr.width * cw + 6, h = lh * wr.lines;
        var sides = c.x > F.x0 + F.w * 0.6 ? ['left', 'right'] : ['right', 'left'];
        p.label = wr.text; p.lab = null;
        list.some(function (tr) {
          return sides.some(function (side) {
            var bx = { x: side === 'right' ? c.x + c.r + tr[0] : c.x - c.r - tr[0] - w, y: c.y - h / 2 + tr[1] * lh, w: w, h: h };
            if (!free(bx)) return false;
            placed.push(bx); p.lab = { side: side, dy: tr[1] * lh, gap: tr[0] };
            return true;
          });
        });
      });
    });
  }
  // Long names break onto a second line, so they fit where one long line would not.
  function wrap(text, max) {
    var lines = [''];
    String(text).split(' ').forEach(function (wd) {
      var l = lines[lines.length - 1];
      if (l && (l + ' ' + wd).length > max) lines.push(wd); else lines[lines.length - 1] = l ? l + ' ' + wd : wd;
    });
    return { lines: lines.length, width: Math.max.apply(null, lines.map(function (l) { return l.length; })), text: lines.join('\n') };
  }
  // The label's spot beside its bubble (d px wide), as a position inside the symbol's box, stepped by dy.
  function labelAt(p, d) {
    var lab = p.lab || { side: 'right', dy: 0, gap: 6 }, r = lab.side === 'right';
    return { position: [r ? d + lab.gap : -lab.gap, d / 2 + lab.dy], align: r ? 'left' : 'right', verticalAlign: 'middle', side: lab.side, dy: lab.dy };
  }
  function place(pts, ctx, opts) {
    var F = frame(ctx || {}, (opts && opts.scale) || { min: 1, max: 3 });
    placeLabels(pts, F, !!(opts && opts.near));
    return F;
  }

  TAP.quadrantLabels = { place: place, at: labelAt };
})(window.TAP);
