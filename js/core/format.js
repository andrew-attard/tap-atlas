/*
 * File: js/core/format.js
 * Purpose: Formats every number, rating and date the same way, in English style, whatever the browser language
 *          (US-1.2.6). Charts and takeaways round with a suffix (€1.2M); tables and tooltips show the exact figure.
 * Provides: TAP.format (money, moneyExact, pct, num, rating, tier, cell, kind, date, list)
 * Depends on: js/core/namespace.js, js/core/content.js (wording), js/core/data.js (currency, rating scales),
 *             js/theme.js (kind glyphs)
 * Used by: every module that shows figures
 */
(function (TAP) {
  'use strict';

  var SYMBOLS = { EUR: '€', USD: '$', GBP: '£' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SEGMENTS = { strategic: 'Strategic', growth: 'Growth', core: 'Core', scaled: 'Scaled' };

  // Money in the data file is in thousands (Data Contract), so values are multiplied by 1000 unless told otherwise.
  var DATA_UNIT = 1000;

  function missing() { return TAP.content.text('states.notProvided'); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // English thousands separators without toLocaleString, so every viewer on a call sees the same thing.
  function group(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // Rounds half up in decimal terms, avoiding binary float slips (23.45 -> 23.5, not 23.4).
  function round(v, d) { return Number(Math.round(Number(Math.abs(v) + 'e' + d)) + 'e-' + d); }

  // Fixed decimals, dropping a trailing ".0" ("2.0" -> "2").
  function fixed(v, decimals) {
    var s = round(v, decimals).toFixed(decimals);
    if (decimals > 0) s = s.replace(/\.?0+$/, '');
    var parts = s.split('.');
    return group(parts[0]) + (parts[1] ? '.' + parts[1] : '');
  }

  function symbol(opts) {
    var code = (opts && opts.currency) || currency();
    return SYMBOLS[code] || (code + ' ');
  }
  function currency() {
    try { return (TAP.data.meta() || {}).currency || 'EUR'; } catch (e) { return 'EUR'; }
  }
  // opts.scale: multiplier from the value given to whole currency units (default 1000, the data file's unit).
  function units(v, opts) { return v * (opts && opts.scale != null ? opts.scale : DATA_UNIT); }

  // Chart format: €1.2M, €850k, €950, €0. Rounds to one decimal; a value that rounds up to 1000k becomes €1M.
  function money(v, opts) {
    if (!isNum(v)) return missing();
    var x = units(v, opts), a = Math.abs(x), sign = x < 0 ? '-' : '', s = symbol(opts);
    var steps = [[1, ''], [1e3, 'k'], [1e6, 'M'], [1e9, 'B']];
    var i = a >= 1e9 ? 3 : a >= 1e6 ? 2 : a >= 1e3 ? 1 : 0;
    var r = round(a / steps[i][0], i ? 1 : 0);
    if (r >= 1000 && i < 3) { i++; r = round(a / steps[i][0], 1); }   // 999,950 -> €1M, not €1000k
    return sign + s + fixed(r, 1) + steps[i][1];
  }

  // Exact format for tables and tooltips: every digit, in whole currency units (€1,234,567).
  function moneyExact(v, opts) {
    if (!isNum(v)) return missing();
    var x = units(v, opts);
    return (x < 0 ? '-' : '') + symbol(opts) + fixed(Math.round(x), 0);
  }

  // Percentages from decimals: whole numbers on charts (one decimal under 1%), one decimal when exact.
  function pct(v, opts) {
    if (!isNum(v)) return missing();
    var p = Number(v + 'e2'), exact = opts && opts.exact;   // shift by text, not by multiplying, to keep 23.45 exact
    var d = exact || (Math.abs(p) > 0 && Math.abs(p) < 1) ? 1 : 0;
    return (p < 0 ? '-' : '') + fixed(p, d) + '%';
  }

  // Counts and other plain numbers: whole numbers stay whole; others show one decimal (or as asked).
  function num(v, opts) {
    if (!isNum(v)) return missing();
    var d = opts && opts.decimals != null ? opts.decimals : (Math.abs(v) >= 1000 || Number.isInteger(v) ? 0 : 1);
    return (v < 0 ? '-' : '') + fixed(v, d);
  }

  // A rating with its template wording: "Generalized (3)". Averages of ratings: "2.3 average".
  function rating(v, field) {
    if (!isNum(v)) return missing();
    if (!Number.isInteger(v)) return fixed(v, 1) + ' average';
    var scale = null;
    try { scale = TAP.data.scale(field); } catch (e) { scale = null; }
    var level = scale && scale.levels.filter(function (l) { return l.score === v; })[0];
    return level ? level.label + ' (' + v + ')' : String(v);
  }

  function tier(v) {
    return isNum(v) ? 'Tier ' + v : missing();
  }

  // Formats a cell by unit. opts: {unit, exact, field (for ratings)}.
  // Not provided reads "not provided"; not applicable is left blank (it is never a gap).
  function cell(c, opts) {
    opts = opts || {};
    if (!c || c.state === 'notProvided') return missing();
    if (c.state === 'notApplicable') return '';
    var v = c.v;
    switch (opts.unit) {
      case 'money': return opts.exact ? moneyExact(v, { currency: opts.currency }) : money(v, { currency: opts.currency });
      case 'pct': return pct(v, opts);
      case 'rating': return rating(v, opts.field);
      case 'score': return isNum(v) ? fixed(v, opts.exact ? 2 : 1) : missing();
      case 'tier': return tier(v);
      case 'segment': return SEGMENTS[v] || String(v);
      case 'count': return num(v, opts);
      case 'text': return v == null ? missing() : String(v);
      default: return isNum(v) ? num(v, opts) : String(v);
    }
  }

  // Kind of value as glyph plus word, from the theme: {glyph, label, text: '● Leader input'}.
  function kind(k) {
    var t = (window.TAP_THEME && window.TAP_THEME.kinds && window.TAP_THEME.kinds[k]) || { glyph: '', label: String(k) };
    var key = 'kinds.' + k, worded = TAP.content.text(key);   // the organization layer may reword the label
    var label = worded === '[' + key + ']' ? t.label : worded;
    return { glyph: t.glyph, label: label, text: (t.glyph ? t.glyph + ' ' : '') + label };
  }

  // "2 Oct 2026", read in UTC so the date doesn't shift with the viewer's time zone. {time: true} adds "09:05".
  function date(iso, opts) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return missing();
    var s = d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    if (opts && opts.time) s += ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
    return s;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "A, B and C"
  function list(items) {
    items = (items || []).filter(function (x) { return x != null && x !== ''; });
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  TAP.format = {
    money: money, moneyExact: moneyExact, pct: pct, num: num, rating: rating, tier: tier,
    cell: cell, kind: kind, date: date, list: list
  };
})(window.TAP);
