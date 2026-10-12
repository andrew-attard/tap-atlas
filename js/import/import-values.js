/*
 * File: js/import/import-values.js
 * Purpose: Turns a stored cell value into a Data Contract value by kind: numbers, shares, ratings, tiers, lookup ids, risk
 *          levels, months and years; blanks stay null, anything unreadable is the BAD sentinel; docs/ARCHITECTURE.md section 20.2.
 * Provides: TAP.importValues (create)
 * Depends on: js/import/xlsx-book.js (serialToDate)
 * Used by: js/import/import-rows.js, js/import/import-grid.js
 * Owner: READ stream (#585)
 */
(function (TAP) {
  'use strict';

  // kind -> the lookup list it reads from
  var LISTS = { industry: 'industries', productLine: 'productLines', channel: 'channels', partnerChannel: 'channels', segment: 'segments',
    solution: 'solutions', partnerType: 'partnerTypes', maturity: 'partnerMaturity', category: 'productCategories', route: 'routes' };
  var PARTNER_CHANNELS = ['partner', 'allianceA', 'allianceB'];
  var RISKS = ['high', 'medium', 'low'];

  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isDate(v) { return v instanceof Date; }
  function blank(raw) { return raw == null || (typeof raw === 'string' && raw.trim() === ''); }
  function isError(raw) { return !!raw && typeof raw === 'object' && raw.error === true; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // lookups: the data file's lookups; aliases: { <list>: { 'other spelling': id }, riskLevel: {...}, scales: { <scale>: {...} } };
  // numberFormat: { decimal, thousands } for numbers written as text
  function create(lookups, aliases, numberFormat) {
    lookups = lookups || {};
    aliases = aliases || {};
    var decimal = (numberFormat && numberFormat.decimal) || '.';
    var thousands = numberFormat && numberFormat.thousands != null ? numberFormat.thousands : (decimal === ',' ? '.' : ',');
    var BAD = { bad: true };

    function isBad(x) { return !!x && typeof x === 'object' && x.bad === true; }
    // A bad value that carries what the cell shows, for the note
    function badWith(raw) { return isError(raw) ? { bad: true, found: raw.found, formula: !!raw.formula } : BAD; }
    // The entry of a map whose key matches a text loosely, else undefined
    function aliasOf(map, text) {
      if (!map || typeof map !== 'object') return undefined;
      var want = norm(text), keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) if (norm(keys[i]) === want) return map[keys[i]];
      return undefined;
    }

    function text(raw) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      return isDate(raw) ? raw.toISOString() : String(raw);
    }

    // A finite number, or text with the thousands separator, spaces and a trailing % (divided by 100); times scale
    function number(raw, scale) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      var n;
      if (isNum(raw)) n = raw;
      else if (typeof raw === 'string') {
        var s = raw.replace(/\s+/g, ''), pct = /%$/.test(s);
        if (pct) s = s.slice(0, -1);
        if (thousands) s = s.replace(new RegExp(escRe(thousands), 'g'), '');
        if (decimal !== '.') s = s.replace(new RegExp(escRe(decimal), 'g'), '.');
        if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return BAD;
        n = Number(s);
        if (!isFinite(n)) return BAD;
        if (pct) n = n / 100;
      } else return BAD;
      return n * (scale || 1);
    }

    // A small whole number 1 to limit, from a number or its text, else undefined
    function smallInt(raw, limit) {
      var n = isNum(raw) ? raw : typeof raw === 'string' && /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN;
      return n >= 1 && n <= limit && n % 1 === 0 ? n : undefined;
    }

    // 1 to 3, a level's label of the scale, or an alias of the scale
    function rating(raw, scaleKey) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      var n = smallInt(raw, 3);
      if (n !== undefined) return n;
      if (typeof raw !== 'string') return BAD;
      var scale = (lookups.scales || {})[scaleKey], want = norm(raw);
      var level = ((scale && scale.levels) || []).filter(function (l) { return norm(l.label) === want; })[0];
      if (level) return level.score;
      var alias = aliasOf((aliases.scales || {})[scaleKey], raw);
      return alias !== undefined ? alias : BAD;
    }

    // 1 to 3, a tier's name, or an alias
    function tier(raw) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      var n = smallInt(raw, 3);
      if (n !== undefined) return n;
      if (typeof raw !== 'string') return BAD;
      var want = norm(raw), hit = (lookups.tiers || []).filter(function (t) { return norm(t.name) === want; })[0];
      if (hit) return hit.id;
      var alias = aliasOf(aliases.tiers, raw);
      return alias !== undefined ? alias : BAD;
    }

    // The id, the name or an alias of an entry of the list; maturity stays text when there is no maturity lookup
    function id(raw, listName) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      if (isDate(raw) || typeof raw === 'boolean') return BAD;
      var list = lookups[listName], want = norm(raw);
      if (!Array.isArray(list)) return listName === 'partnerMaturity' ? String(raw).trim() : BAD;
      var hit = list.filter(function (e) { return e && (norm(e.id) === want || norm(e.name) === want); })[0];
      if (hit) return hit.id;
      var alias = aliasOf(aliases[listName], raw);
      return alias !== undefined ? alias : BAD;
    }

    function risk(raw) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      var want = norm(raw);
      if (RISKS.indexOf(want) >= 0) return want;
      var alias = aliasOf(aliases.riskLevel, raw);
      return alias !== undefined ? alias : BAD;
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    // "YYYY-MM" from a date, an Excel serial, or "YYYY-MM" / "YYYY-MM-DD" text
    function month(raw) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      if (isDate(raw)) return isNaN(raw.getTime()) ? BAD : raw.getFullYear() + '-' + pad2(raw.getMonth() + 1);
      if (isNum(raw)) { var d = TAP.xlsxBook.serialToDate(raw); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1); }
      var m = typeof raw === 'string' && /^\s*(\d{4}-(0[1-9]|1[0-2]))(-\d{2})?\s*$/.exec(raw);
      return m ? m[1] : BAD;
    }

    function year(raw) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      var n = isNum(raw) ? raw : typeof raw === 'string' && /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN;
      return isFinite(n) && n % 1 === 0 ? n : BAD;
    }

    // Dispatch by kind ('rating:<scale>' names its scale)
    function read(kind, raw, scale) {
      if (blank(raw)) return null;
      if (isError(raw)) return badWith(raw);
      var k = String(kind || 'text');
      if (k.indexOf('rating:') === 0) return rating(raw, k.slice(7));
      switch (k) {
        case 'number': case 'money': case 'share': case 'count': return number(raw, scale);
        case 'tier': return tier(raw);
        case 'risk': return risk(raw);
        case 'month': return month(raw);
        case 'year': return year(raw);
        case 'partnerChannel': {
          var ch = id(raw, 'channels');
          return isBad(ch) || PARTNER_CHANNELS.indexOf(ch) >= 0 ? ch : BAD;
        }
        default: return LISTS[k] ? id(raw, LISTS[k]) : text(raw);
      }
    }

    return { BAD: BAD, isBad: isBad, norm: norm, text: text, number: number, share: number, count: number, rating: rating,
      tier: tier, id: id, risk: risk, month: month, year: year, read: read };
  }

  TAP.importValues = { create: create };
})(window.TAP);
