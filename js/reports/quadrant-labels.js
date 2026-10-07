/*
 * File: js/reports/quadrant-labels.js
 * Purpose: Places the quadrant chart's names and numbers so nothing overlaps, biggest bubbles first (the industry in
 *          focus before them), in the pixels the chart is drawn in. Every bubble ends up named or numbered (QA-3).
 *          Display only: values never move. Also draws the lines joining paired bubbles and the selection ring.
 * Provides: TAP.quadrantLabels (place, at, numbers, links, selection)
 * Depends on: js/theme.js (TAP_THEME, read at call time)
 * Used by: js/reports/quadrant.js
 *
 * place(pts, ctx, {scale, near}) sets on each point p: p.label (the name, long names on two lines) and p.lab
 * ({side, dy, gap}, or null when the name has no clean spot), and p.at, where its number sits ({ox, oy, inside}).
 * It returns the plot frame {f, fs, lh, m, x0, y0, w, h}. Points carry x, y (cells), dx, dy (display nudge),
 * d (bubble size), named, text, num and ind. at(p, d) gives the name's position inside the symbol's box for ECharts;
 * numbers(pts) gives the series that draws the numbers over the bubbles; links(pts) the lines joining an industry's two
 * bubbles; selection(list) the ink ring round the industry in focus (D105), list items {value, entityId, industryId, size}.
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
    return { scale: scale, f: f, fs: fs, nfs: th.type.chartMin * f, lh: lh, m: m, x0: m.left, y0: m.top,
      w: Math.max(120, size.w - m.left - m.right), h: Math.max(120, size.h - m.top - m.bottom) };
  }
  function value(F, q) { var S = F.scale, span = S.max - S.min; return [S.min + (q.x - F.x0) / F.w * span, S.max - (q.y - F.y0) / F.h * span]; }
  function px(F, x, y) { var S = F.scale, span = S.max - S.min; return { x: F.x0 + (x - S.min) / span * F.w, y: F.y0 + (S.max - y) / span * F.h }; }

  function boxesMeet(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function onCircle(b, c) {
    var nx = Math.max(b.x, Math.min(c.x, b.x + b.w)), ny = Math.max(b.y, Math.min(c.y, b.y + b.h));
    return (c.x - nx) * (c.x - nx) + (c.y - ny) * (c.y - ny) < c.r * c.r;
  }
  // True when the segment from a to b passes through circle c.
  function crosses(a, b, c) {
    var vx = b.x - a.x, vy = b.y - a.y, len = vx * vx + vy * vy, s = len ? ((c.x - a.x) * vx + (c.y - a.y) * vy) / len : 0;
    s = Math.max(0, Math.min(1, s));
    var ex = a.x + s * vx - c.x, ey = a.y + s * vy - c.y;
    return ex * ex + ey * ey < c.r * c.r;
  }

  /*
   * One placement: the bubbles as circles and the boxes taken so far. A box is free when it stays in the plot, meets
   * no other box and no bubble but its own, and its leader line (if any) crosses no other bubble. A number inside its
   * bubble may sit over bubbles drawn underneath that one (p.rank is the drawing order), as they are hidden there.
   */
  function board(pts, F) {
    var dots = pts.map(function (p) { var c = px(F, p.x.v + p.dx, p.y.v + p.dy); c.r = p.d / 2; c.p = p; p.c = c; return c; }), taken = [];
    function touch(c, own) { return Math.pow(c.x - own.x, 2) + Math.pow(c.y - own.y, 2) < Math.pow(c.r + own.r, 2); }
    function under(c, own) { return c.p.rank != null && own.p.rank != null && c.p.rank < own.p.rank; }
    function inPlot(b) { return b.x >= F.x0 - 2 && b.y >= F.y0 - 14 && b.x + b.w <= F.x0 + F.w + F.m.right - 4 && b.y + b.h <= F.y0 + F.h + 4; }
    return {
      free: function (b, own, line, inside) {
        if (!inside && !inPlot(b)) return false;
        if (taken.some(function (q) { return boxesMeet(b, q); })) return false;
        return !dots.some(function (c) {
          return c !== own && !(inside && under(c, own)) && (onCircle(b, c) || (line && !(line.glued && touch(c, own)) && crosses(line[0], line[1], c)));
        });
      },
      take: function (b) { taken.push(b); }
    };
  }
  // A leader line runs from the bubble's edge, toward the label, to the label's near side.
  function lead(c, to) {
    var vx = to.x - c.x, vy = to.y - c.y, n = Math.sqrt(vx * vx + vy * vy) || 1;
    return [{ x: c.x + vx / n * c.r, y: c.y + vy / n * c.r }, to];
  }
  function biggestFirst(a, b) {
    return Math.round(b.d) - Math.round(a.d) || (b.ind.groupPriority ? 1 : 0) - (a.ind.groupPriority ? 1 : 0) || b.y.v - a.y.v;
  }
  function numSize(F, p) { var w = String(p.num).length * F.nfs * 0.62 + 2; return { w: w, h: F.nfs }; }

  // A number goes inside its bubble when it fits there and no bubble drawn over it, or other number, covers that spot.
  function numbersInside(order, F, B) {
    order.forEach(function (p) {
      if (p.num == null) return;
      var s = numSize(F, p), b = { x: p.c.x - s.w / 2, y: p.c.y - s.h / 2, w: s.w, h: s.h };
      if (s.w > p.d - 2 || s.h * 0.75 > p.d - 4 || !B.free(b, p.c, null, true)) return;
      B.take(b); p.at = { ox: 0, oy: 0, inside: true };
    });
  }

  /*
   * Names, largest bubbles first so they win. A name never covers a bubble or another label, and a leader line never
   * crosses another bubble. near (many bubbles, or two per industry): only spots right beside the bubble (level, or half
   * a line up or down), so there are no leader lines at all and the number does the rest.
   */
  function names(order, F, B, near) {
    var lh = F.lh, cw = F.fs * 0.56, tries = [];
    [6, 28, 56, 90].forEach(function (g) { [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5].forEach(function (st) { tries.push([g, st, g / lh + Math.abs(st)]); }); });
    tries.sort(function (a, b) { return a[2] - b[2]; });
    // Two rounds: every name first tries the spots close to its bubble, and only then the far ones
    var close = tries.filter(function (tr) { return tr[2] <= 2; });
    (near ? [[[6, 0, 0], [6, -0.5, 0], [6, 0.5, 0]]] : [close, tries]).forEach(function (list, round) {
      order.forEach(function (p) {
        if (!p.named || (round && p.lab)) return;
        var c = p.c, wr = wrap(p.text, Math.max(110, F.w * 0.34) / cw), w = wr.width * cw + 6, h = lh * wr.lines;
        var sides = c.x > F.x0 + F.w * 0.6 ? ['left', 'right'] : ['right', 'left'];
        p.label = wr.text; p.lab = null;
        list.some(function (tr) {
          return sides.some(function (side) {
            var r = side === 'right', bx = { x: r ? c.x + c.r + tr[0] : c.x - c.r - tr[0] - w, y: c.y - h / 2 + tr[1] * lh, w: w, h: h };
            var moved = tr[0] > 6 || Math.abs(tr[1]) >= 1, line = moved ? lead(c, { x: r ? bx.x : bx.x + w, y: bx.y + h / 2 }) : null;
            if (!B.free(bx, c, line)) return false;
            B.take(bx); p.lab = { side: side, dy: tr[1] * lh, gap: tr[0] };
            return true;
          });
        });
      });
    });
  }

  /*
   * A bubble with neither its name nor a number inside gets its number right beside it: the nearest free spot of
   * sixteen directions, a few pixels out. In a tight cluster it goes further out on a short leader line: one that
   * crosses no other bubble, then one that crosses only bubbles touching this one, then any. Should even that fail, it
   * is drawn inside the bubble anyway, so nothing is left unnamed.
   */
  var SPOTS = [[1, 0], [4, 0], [8, 0], [12, 0], [18, 1], [28, 2], [40, 2], [56, 2], [28, 3], [40, 3], [56, 3], [80, 3]];
  var DIRS = [0, 180, 270, 90, 315, 225, 45, 135, 337.5, 202.5, 22.5, 157.5, 292.5, 247.5, 67.5, 112.5].map(function (a) {
    return [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
  });
  function numbersBeside(order, F, B) {
    order.forEach(function (p) {
      if (p.num == null || p.at || p.lab) return;
      var s = numSize(F, p), c = p.c, w = s.w + 4, h = s.h;
      SPOTS.some(function (spot) {
        var gap = spot[0];
        return DIRS.some(function (d) {
          var ox = d[0] * (c.r + gap + w / 2), oy = d[1] * (c.r + gap + h / 2), b = { x: c.x + ox - w / 2, y: c.y + oy - h / 2, w: w, h: h };
          var line = spot[1] ? [{ x: c.x + d[0] * c.r, y: c.y + d[1] * c.r }, { x: c.x + d[0] * (c.r + gap), y: c.y + d[1] * (c.r + gap) }] : null;
          if (line) line.glued = spot[1] === 2;
          if (!B.free(b, c, spot[1] === 3 ? null : line)) return false;
          B.take(b); p.at = { ox: Math.round(ox), oy: Math.round(oy), inside: false, line: line && line.map(function (q) { return value(F, q); }) };
          return true;
        });
      });
      if (!p.at) p.at = { ox: 0, oy: 0, inside: p.d > s.w, forced: true };
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
  // The name's spot beside its bubble (d px wide), as a position inside the symbol's box, stepped by dy.
  function labelAt(p, d) {
    var lab = p.lab || { side: 'right', dy: 0, gap: 6 }, r = lab.side === 'right';
    return { position: [r ? d + lab.gap : -lab.gap, d / 2 + lab.dy], align: r ? 'left' : 'right', verticalAlign: 'middle', side: lab.side, dy: lab.dy };
  }
  function place(pts, ctx, opts) {
    var F = frame(ctx || {}, (opts && opts.scale) || { min: 1, max: 3 }), B = board(pts, F);
    var order = pts.slice().sort(function (a, b) { return (b.sel ? 1 : 0) - (a.sel ? 1 : 0) || biggestFirst(a, b); });   // the industry in focus is named first
    pts.forEach(function (p) { p.at = null; p.lab = null; p.label = null; });
    numbersInside(order, F, B);
    names(order, F, B, !!(opts && opts.near));
    numbersBeside(order, F, B);
    return F;
  }

  /*
   * The numbers as their own series over the bubbles (silent, so hover and clicks still reach the bubble below).
   * Inside a bubble: on-colour text (ink on a light grey bubble); beside it: ink on the page ground.
   */
  function numbers(pts) {
    var th = window.TAP_THEME, lines = pts.filter(function (p) { return p.at && p.at.line; }).map(function (p) {
      return [{ coord: p.at.line[0] }, { coord: p.at.line[1] }];
    });
    return { type: 'scatter', tapRole: 'mark', silent: true, z: 9, tooltip: { show: false }, emphasis: { disabled: true }, clip: false,
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: th.muted, width: th.border.control, type: 'solid' }, data: lines },
      data: pts.filter(function (p) { return p.at && p.num != null; }).map(function (p) {
        var inside = p.at.inside;
        return { value: [p.x.v + p.dx, p.y.v + p.dy], symbolSize: 1, entityId: p.g.id, industryId: p.ind.id, itemStyle: { color: 'transparent', borderWidth: 0 },
          label: { show: true, position: 'inside', offset: [p.at.ox, p.at.oy], formatter: String(p.num), fontSize: th.type.chartMin, fontWeight: 700,
            color: inside && !p.light ? th.onColour : th.ink, backgroundColor: inside ? null : th.ground, padding: inside ? 0 : [0, 2] } };
      }) };
  }

  // With two groups (one against the rest, or a pair), a thin line joins each industry's two bubbles.
  function links(pts) {
    var th = window.TAP_THEME, first = {}, out = [], at = function (p) { return { coord: [p.x.v + p.dx, p.y.v + p.dy] }; };
    pts.forEach(function (p) { if (first[p.ind.id]) out.push([at(first[p.ind.id]), at(p)]); else first[p.ind.id] = p; });
    return { type: 'scatter', tapRole: 'link', silent: true, data: [], z: 1,
      markLine: { silent: true, symbol: 'none', z: 1, label: { show: false }, lineStyle: { color: th.grid, width: th.border.control, type: 'solid' }, data: out } };
  }
  // The industry in focus (D105): an ink ring outside where a "Show me" ring sits, so both can show at once.
  function selection(list) {
    var th = window.TAP_THEME, h = th.echarts.tap.highlight;
    return { type: 'scatter', tapRole: 'selection', silent: true, z: 9, tooltip: { show: false }, clip: false, data: list,
      symbolSize: function (v, p) { return p.data.size + (h.ringGap + h.width) * 2 + th.border.highlight * 2; },
      itemStyle: { color: 'transparent', borderColor: th.ink, borderWidth: th.border.highlight } };
  }
  TAP.quadrantLabels = { place: place, at: labelAt, numbers: numbers, links: links, selection: selection };
})(window.TAP);
