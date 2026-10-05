/*
 * File: js/engine/aggregate.js
 * Purpose: Combines several regions' values into one figure (totals and averages), following the combining rules
 *          of US-1.2.5. This is the only place those rules are written down in code; insights reuse it.
 * Provides: TAP.agg (combine, ratio, weightBy, describe, declineNote)
 * Depends on: js/core/namespace.js, js/core/store.js (TAP.notes), config/settings.js, js/core/content.js,
 *             js/core/format.js, js/core/data.js,
 *             js/engine/measures.js (only to look up rate weights and their labels, at call time)
 * Used by: measures, insights, explanations, region cards, and the combined-figure labels in the drawing kit, the
 *          parts builder and the quadrant
 */
(function (TAP) {
  'use strict';

  // valueKind -> how 'total' and 'average' combine (ARCHITECTURE section 7)
  var METHOD = {
    amount: { total: 'sum', average: 'mean' },
    count: { total: 'sum', average: 'mean' },
    rate: { total: 'wmean', average: 'wmean' },
    rating: { total: 'rating', average: 'rating' },
    category: { total: 'count', average: 'count' },
    text: { total: 'list', average: 'list' }
  };
  var NUMERIC = { sum: true, mean: true, wmean: true, rating: true };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function measuresReady() { return TAP.measures && !TAP.measures.__stub; }

  // The measure a rate is weighted by: the report's choice, then the settings, then the measure's own default.
  function weightBy(measureId, weights) {
    if (!measureId) return null;
    if (weights && weights[measureId]) return weights[measureId];
    var s = window.TAP_SETTINGS && window.TAP_SETTINGS.combine && window.TAP_SETTINGS.combine.weights;
    if (s && s[measureId]) return s[measureId];
    var m = measuresReady() ? TAP.measures.meta(measureId) : null;
    return (m && m.weightBy) || null;
  }

  // The weight measure, if it can be read: it must exist in a built measure registry.
  function weightFn(wb) {
    var fn = wb && measuresReady() ? TAP.measures.get(wb) : null;
    return typeof fn === 'function' ? fn : null;
  }

  // A region's weight: given on the item, else the weight measure's value for that region. null means blank.
  function weightOf(item, fn, ctx) {
    if (item.weight != null) return isNum(item.weight) && item.weight >= 0 ? item.weight : null;
    if (!fn) return null;
    var c = fn(item.regionId, ctx || {});
    return c && c.state === 'value' && isNum(c.v) && c.v >= 0 ? c.v : null;
  }

  function names(ids) {
    return ids.map(function (id) { return TAP.content.regionName(TAP.data.region(id)) || id; });
  }

  /*
   * items: [{regionId, cell, weight?}]. valueKind: amount|rate|rating|category|count|text. how: total|average.
   * opts: {measureId, weights (report override), ctx (passed to the weight measure)}.
   * Not provided cells are left out and named in src.excluded. Not applicable cells are left out quietly
   * (src.notApplicable): they are never a gap (US-1.2.11). A rate whose weight is blank is left out and named in
   * src.weightMissing. When no weight can be used at all, each region counts equally (src.weightFallback).
   */
  function combine(items, valueKind, how, opts) {
    if (!Object.prototype.hasOwnProperty.call(METHOD, valueKind)) {
      throw new Error('TAP.agg.combine: unknown valueKind "' + valueKind + '"; expected one of ' + Object.keys(METHOD).join(', '));
    }
    opts = opts || {};
    items = items || [];
    how = how === 'average' ? 'average' : 'total';
    var method = METHOD[valueKind][how];
    var rate = method === 'wmean';
    var wb = rate ? weightBy(opts.measureId, opts.weights) : null;
    var explicit = rate && items.some(function (it) { return it.weight != null; });
    var fn = rate && !explicit ? weightFn(wb) : null;
    var useWeights = explicit || !!fn, fallback = false;
    var used = [], excluded = [], na = [], noWeight = [];

    // A weight measure that is named but can't be read (a typo, or measures not built yet) must never drop every
    // region: each counts equally, and the data sources panel says so.
    if (rate && !explicit && wb && !fn) {
      fallback = true;
      TAP.notes.add({ source: 'data', message: TAP.content.text('combined.weightUnresolved', { measure: opts.measureId || '', weight: wb }) });
    }

    items.forEach(function (it) {
      var c = it.cell || {};
      if (c.state === 'notApplicable') { na.push(it.regionId); return; }
      if (c.state !== 'value' || c.v == null || (NUMERIC[method] && !isNum(c.v))) { excluded.push(it.regionId); return; }
      var w = useWeights ? weightOf(it, fn, opts.ctx) : 1;
      if (w == null) noWeight.push({ regionId: it.regionId, cell: c });
      else used.push({ regionId: it.regionId, cell: c, w: w });
    });
    // Every provided rate lacks its weight: average them equally rather than show nothing.
    if (!used.length && noWeight.length) {
      used = noWeight.map(function (u) { return { regionId: u.regionId, cell: u.cell, w: 1 }; });
      noWeight = [];
      fallback = true;
    }

    var src = { combined: true, how: method, regionIds: items.map(function (it) { return it.regionId; }),
      excluded: excluded, notApplicable: na, weightBy: wb };
    if (rate) {
      src.weighted = useWeights;
      src.weightMissing = noWeight.map(function (u) { return u.regionId; });
      if (fallback) src.weightFallback = true;
    }
    if (!used.length) {
      var allNa = items.length > 0 && na.length === items.length;
      return { v: null, state: allNa ? 'notApplicable' : 'notProvided', kind: 'APP', src: src };
    }

    var out = { v: null, state: 'value', kind: 'APP', src: src };
    var vals = used.map(function (u) { return u.cell.v; });
    if (method === 'sum') out.v = total(vals);
    else if (method === 'mean') out.v = total(vals) / vals.length;
    else if (method === 'wmean') weighted(out, used);
    else if (method === 'rating') {
      out.v = total(vals) / vals.length;
      out.range = { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
    } else if (method === 'count') counted(out, vals);
    else {
      out.items = used.map(function (u) { return { regionId: u.regionId, v: u.cell.v }; });
      out.v = vals.slice();
    }

    var partial = used.filter(function (u) { return u.cell.partial; }).map(function (u) { return u.regionId; });
    if (partial.length) {
      out.partial = true;
      src.partial = partial;
      out.note = TAP.content.text('combined.partialNote', { names: TAP.format.list(names(partial)) });
    }
    return out;
  }

  function total(vals) { return vals.reduce(function (s, v) { return s + v; }, 0); }

  // Weighted mean. If every weight is zero there is nothing to weight by, so each region counts equally.
  function weighted(out, used) {
    var sw = total(used.map(function (u) { return u.w; }));
    if (sw > 0) {
      out.v = total(used.map(function (u) { return u.cell.v * u.w; })) / sw;
    } else {
      out.v = total(used.map(function (u) { return u.cell.v; })) / used.length;
      out.src.weightFallback = true;
    }
  }

  // Categories are counted, never averaged. v lists [{value, n}], most frequent first, each value as it was given
  // (tier 1 stays the number 1, so it formats as "Tier 1").
  function counted(out, vals) {
    var list = [], counts = {};
    vals.forEach(function (v) {
      var hit = list.filter(function (x) { return x.value === v; })[0];
      if (hit) hit.n++; else list.push({ value: v, n: 1 });
      counts[v] = (counts[v] || 0) + 1;
    });
    out.counts = counts;
    out.v = list.sort(function (a, b) { return b.n - a.n || (a.value < b.value ? -1 : 1); });
  }

  /*
   * Shares and ratios combined from their parts (meta combine: 'ratioOfSums', ARCHITECTURE 17.5): each region's cell
   * carries ratio {num, den}; the result is the summed numerators over the summed denominators. A cell whose ratio
   * also lists items and top (e.g. the top 3 accounts) pools the items and takes the top ones across the regions.
   * Total and average give the same figure, so one rule serves both. Blanks are left out and named, as in combine.
   */
  function ratio(items) {
    var used = [], excluded = [], na = [];
    items = items || [];
    items.forEach(function (it) {
      var c = it.cell || {};
      if (c.state === 'value' && c.ratio) used.push({ regionId: it.regionId, cell: c });
      else if (c.state === 'notApplicable') na.push(it.regionId);
      else excluded.push(it.regionId);
    });
    var src = { combined: true, how: 'ratio', regionIds: items.map(function (it) { return it.regionId; }),
      excluded: excluded, notApplicable: na, weightBy: null };
    var den = total(used.map(function (u) { return u.cell.ratio.den; }));
    if (!used.length || !(den > 0)) {
      var allNa = items.length > 0 && na.length === items.length;
      return { v: null, state: used.length || allNa ? 'notApplicable' : 'notProvided', kind: 'APP', src: src };
    }
    var top = used[0].cell.ratio.top, num;
    if (top) {
      var pool = [];
      used.forEach(function (u) { pool = pool.concat(u.cell.ratio.items || []); });
      num = total(pool.sort(function (x, y) { return y - x; }).slice(0, top));
    } else num = total(used.map(function (u) { return u.cell.ratio.num; }));
    var out = { v: num / den, state: 'value', kind: 'APP', src: src, ratio: { num: num, den: den } };
    var partial = used.filter(function (u) { return u.cell.partial; }).map(function (u) { return u.regionId; });
    if (partial.length) {
      out.partial = true;
      src.partial = partial;
      out.note = TAP.content.text('combined.partialNote', { names: TAP.format.list(names(partial)) });
    }
    var down = [];
    used.forEach(function (u) { down = down.concat(u.cell.declined || []); });
    if (down.length) {
      out.declined = down;
      out.note = (out.note ? out.note + '; ' : '') + declineNote(down);
    }
    return out;
  }

  // The note for accounts left out of an exposure share for a planned decline (D77): their names, or how many.
  function declineNote(list) {
    return list.length <= 3 ? TAP.content.text('measures.declines', { names: TAP.format.list(list) })
      : TAP.content.text('measures.declinesMany', { n: list.length });
  }

  function regionsWord(n) { return TAP.content.text(n === 1 ? 'combined.region' : 'combined.regions'); }

  // A measure's label as it reads mid-sentence ("target accounts"), keeping acronyms such as ARR.
  function weightLabel(id) {
    var m = id && measuresReady() ? TAP.measures.meta(id) : null;
    var label = m && m.label ? m.label : id;
    if (!label) return '';
    return /^[A-Z][A-Z0-9]/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
  }

  // How a combined figure was made, e.g. "Weighted average of 3 regions, by target accounts; Region C not
  // included: not provided". A derived sum names, per part, the regions it left out. Empty for a region's own figure.
  function describe(c) {
    var s = c && (c.src || c);
    if (!s || !s.combined) return '';
    var wm = s.weightMissing || [];
    var lost = s.parts ? s.regionIds.filter(function (r) {
      return s.parts.every(function (p) { return p.src && (p.src.excluded || []).indexOf(r) >= 0; });
    }) : s.excluded;
    var n = s.regionIds.length - lost.length - wm.length - (s.notApplicable || []).length;
    var key = s.how;
    if (key === 'wmean') key = !s.weighted || s.weightFallback ? 'mean' : s.weightBy ? 'wmean' : 'wmeanPlain';
    var vars = { n: n, regions: regionsWord(n), weight: weightLabel(s.weightBy) };
    if (c.range) { vars.min = TAP.format.num(c.range.min); vars.max = TAP.format.num(c.range.max); }
    var out = [TAP.content.text('combined.how.' + key, vars)];
    if (s.parts) {
      s.parts.forEach(function (p) {
        var ps = p.src || {}, ex = ps.excluded || [];
        if (!ps.combined || !ex.length) return;
        var pn = ps.regionIds.length - ex.length - (ps.notApplicable || []).length;
        out.push(TAP.content.text('combined.partExcluded', { part: weightLabel(p.measureId), n: pn, regions: regionsWord(pn),
          names: TAP.format.list(names(ex)) }));
      });
    } else if (s.excluded.length) {
      out.push(TAP.content.text('combined.excluded', { names: TAP.format.list(names(s.excluded)) }));
    }
    if (wm.length) out.push(TAP.content.text('combined.weightMissing', { names: TAP.format.list(names(wm)) }));
    return out.join('; ');
  }

  TAP.agg = { combine: combine, ratio: ratio, weightBy: weightBy, describe: describe, declineNote: declineNote };
})(window.TAP);
