/*
 * File: js/core/format.js
 * Purpose: Formats every number, rating and date the same way, in English style, whatever the browser language
 *          (US-1.2.6). Charts and takeaways round with a suffix (€1.2M); tables and tooltips show the exact figure.
 * Provides: TAP.format (money, moneyExact, pct, num, rating, tier, cell, kind, date, list)
 * Depends on: js/core/namespace.js, js/core/content.js (wording), js/core/data.js (currency, rating scales),
 *             js/core/sources.js (isoDate),
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

  // Moves the decimal point d places through the number's text, so 23.45 stays exact. A number already written
  // with an exponent (under 1e-6, or from 1e21) gets d added to that exponent.
  function shift(v, d) { var p = String(v).split('e'); return Number(p[0] + 'e' + (Number(p[1] || 0) + d)); }

  // Rounds the size half up in decimal terms, avoiding binary float slips (23.45 -> 23.5, not 23.4).
  function round(v, d) { return shift(Math.round(shift(Math.abs(v), d)), -d); }

  // From 1e21 a number's text has an exponent ("1.5e+21"); this writes it out in digits ("1500...0").
  function expand(r) {
    var p = String(r).split('e+'), m = p[0].split('.');
    return m[0] + (m[1] || '') + new Array(Number(p[1]) - (m[1] || '').length + 1).join('0');
  }

  // Fixed decimals, dropping a trailing ".0" ("2.0" -> "2"). Numbers from 1e21 are always whole.
  function fixed(v, decimals) {
    var r = round(v, decimals), s = r >= 1e21 ? expand(r) : r.toFixed(decimals);
    if (decimals > 0 && s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');   // only decimals: a written-out 1e21 keeps its zeros
    var parts = s.split('.');
    return group(parts[0]) + (parts[1] ? '.' + parts[1] : '');
  }
  // The minus sign, decided after rounding, so -0.0004 reads "€0", not "-€0".
  function minus(v, digits) { return v < 0 && /[1-9]/.test(digits) ? '-' : ''; }

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
    var x = units(v, opts), a = Math.abs(x);
    var steps = [[1, ''], [1e3, 'k'], [1e6, 'M'], [1e9, 'B']];
    var i = a >= 1e9 ? 3 : a >= 1e6 ? 2 : a >= 1e3 ? 1 : 0;
    var r = round(a / steps[i][0], i ? 1 : 0);
    if (r >= 1000 && i < 3) { i++; r = round(a / steps[i][0], 1); }   // 999,950 -> €1M, not €1000k
    var n = fixed(r, 1);
    return minus(x, n) + symbol(opts) + n + steps[i][1];
  }

  // Exact format for tables and tooltips: every digit, in whole currency units (€1,234,567).
  function moneyExact(v, opts) {
    if (!isNum(v)) return missing();
    var x = units(v, opts), n = fixed(Math.round(x), 0);
    return minus(x, n) + symbol(opts) + n;
  }

  // Percentages from decimals: whole numbers on charts (one decimal under 1%), one decimal when exact.
  function pct(v, opts) {
    if (!isNum(v)) return missing();
    var p = shift(v, 2), exact = opts && opts.exact;   // shift by text, not by multiplying, to keep 23.45 exact
    var d = exact || (Math.abs(p) > 0 && Math.abs(p) < 1) ? 1 : 0, n = fixed(p, d);
    return minus(p, n) + n + '%';
  }

  // Ratios such as pipeline coverage: two decimals and a times sign, "1.09×", on charts and exact alike.
  function ratio(v) {
    if (!isNum(v)) return missing();
    var n = round(v, 2).toFixed(2);
    return minus(v, n) + n + '×';
  }

  // Counts and other plain numbers: whole numbers stay whole; others show one decimal (or as asked).
  function num(v, opts) {
    if (!isNum(v)) return missing();
    var d = opts && opts.decimals != null ? opts.decimals : (Math.abs(v) >= 1000 || Number.isInteger(v) ? 0 : 1);
    var n = fixed(v, d);
    return minus(v, n) + n;
  }

  // A rating with its template wording: "Generalized (3)". Averages of ratings: "2.3 average"; a combined
  // rating (opts.combined) always reads as an average, even when the mean is a whole number.
  function rating(v, field, opts) {
    if (!isNum(v)) return missing();
    if (!Number.isInteger(v) || (opts && opts.combined)) return fixed(v, 1) + ' average';
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
      case 'ratio': return ratio(v);
      case 'rating': return rating(v, opts.field, { combined: !!(c.src && c.src.combined) });
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
    var d = TAP.sources && TAP.sources.isoDate(iso) ? new Date(iso) : null;   // other text is never guessed at
    if (!d || isNaN(d.getTime())) return missing();
    var s = d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    if (opts && opts.time) s += ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
    return s;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "A, B and C"
  // "A, B and C". When a name itself holds "and" or a comma ("Pharma and Biotech"), semicolons keep the names apart:
  // "A; Pharma and Biotech; and C".
  function list(items) {
    items = (items || []).filter(function (x) { return x != null && x !== ''; }).map(String);
    if (items.length < 2) return items.join('');
    var last = items[items.length - 1], rest = items.slice(0, -1);
    if (items.some(function (x) { return / and |,/.test(x); })) return rest.join('; ') + '; and ' + last;
    return rest.join(', ') + ' and ' + last;
  }

  TAP.format = {
    money: money, moneyExact: moneyExact, pct: pct, num: num, rating: rating, tier: tier,
    cell: cell, kind: kind, date: date, list: list
  };
})(window.TAP);
