/*
 * File: tests/test-format.js
 * Purpose: Tests for number, rating and date formatting (US-1.2.6).
 * Provides: test cases TPV-TC-077, X-format-*
 * Depends on: tests/harness.js, tests/test-setup.js (mini fixture loaded), js/core/format.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';
  var F = TAP.format;
  var U = { scale: 1 };   // values given in whole currency units (the data file holds thousands)

  T.suite('format', function () {
    T.test('TPV-TC-077', 'Chart format rounds with a suffix; exact format shows every digit', function (a) {
      a.equal(F.money(1234567, U), '€1.2M');
      a.equal(F.money(850000, U), '€850k');
      a.equal(F.pct(0.25), '25%');
      a.equal(F.money(0, U), '€0');
      a.equal(F.money(null, U), 'not provided');
      a.equal(F.moneyExact(1234567, U), '€1,234,567');
    });

    T.test('X-format-money', 'Money edges: rounding across k and M, small and negative values, thousands by default', function (a) {
      a.equal(F.money(999950, U), '€1M', 'rounds up into millions');
      a.equal(F.money(1500000, U), '€1.5M');
      a.equal(F.money(2000000, U), '€2M', 'no trailing .0');
      a.equal(F.money(1234.5 * 1000, U), '€1.2M');
      a.equal(F.money(1234500, U), '€1.2M');
      a.equal(F.money(12500, U), '€12.5k');
      a.equal(F.money(950, U), '€950');
      a.equal(F.money(-1234567, U), '-€1.2M');
      a.equal(F.money(2500000000, U), '€2.5B');
      a.equal(F.money(1234.5), '€1.2M', 'data values are in thousands by default');
      a.equal(F.money(850), '€850k');
      a.equal(F.moneyExact(1234.5), '€1,234,500');
      a.equal(F.moneyExact(337.5), '€337,500');
      a.equal(F.moneyExact(undefined), 'not provided');
    });

    T.test('X-format-currency', 'The currency symbol follows meta.currency', function (a) {
      a.equal(F.money(850000, { scale: 1, currency: 'USD' }), '$850k');
      a.equal(F.money(850000, { scale: 1, currency: 'GBP' }), '£850k');
      a.equal(F.money(850000, { scale: 1, currency: 'CHF' }), 'CHF 850k');
      var p = T_FIXTURE('mini'); p.meta.currency = 'USD'; TAP.data.load(p);
      a.equal(F.money(850), '$850k', 'read from the loaded data');
    });

    T.test('X-format-pct', 'Percentages: whole numbers on charts, one decimal when exact', function (a) {
      a.equal(F.pct(0.234), '23%');
      a.equal(F.pct(0.005), '0.5%');
      a.equal(F.pct(0), '0%');
      a.equal(F.pct(1.5), '150%');
      a.equal(F.pct(0.2345, { exact: true }), '23.5%');
      a.equal(F.pct(0.25, { exact: true }), '25%');
      a.equal(F.pct(null), 'not provided');
    });

    T.test('X-format-num', 'Counts use English separators; averages show one decimal', function (a) {
      a.equal(F.num(1234), '1,234');
      a.equal(F.num(1234567.4), '1,234,567');
      a.equal(F.num(12.34), '12.3');
      a.equal(F.num(12.34, { decimals: 2 }), '12.34');
      a.equal(F.num(7), '7');
      a.equal(F.num(null), 'not provided');
    });

    T.test('X-format-rating', 'Ratings show their wording, not only the score', function (a) {
      a.equal(F.rating(3, 'expertise'), 'Generalized (3)');
      a.equal(F.rating(1, 'productFit'), 'Major gaps (1)');
      a.equal(F.rating(2.3333, 'expertise'), '2.3 average');
      a.equal(F.rating(null, 'expertise'), 'not provided');
      a.equal(F.tier(2), 'Tier 2');
      a.equal(F.tier(null), 'not provided');
    });

    T.test('X-format-cell', 'Cells format by unit and keep the three missing states apart', function (a) {
      a.equal(F.cell({ v: 850, state: 'value', kind: 'PRE' }, { unit: 'money' }), '€850k');
      a.equal(F.cell({ v: 850, state: 'value', kind: 'PRE' }, { unit: 'money', exact: true }), '€850,000');
      a.equal(F.cell({ v: 0, state: 'value', kind: 'IN' }, { unit: 'count' }), '0');
      a.equal(F.cell({ v: null, state: 'notProvided', kind: 'IN' }, { unit: 'pct' }), 'not provided');
      a.equal(F.cell({ v: null, state: 'notApplicable', kind: 'IN' }, { unit: 'pct' }), '');
      a.equal(F.cell({ v: 3, state: 'value', kind: 'IN' }, { unit: 'rating', field: 'references' }), 'Selling to top 5 local players (3)');
      a.equal(F.cell({ v: 2, state: 'value', kind: 'IN' }, { unit: 'tier' }), 'Tier 2');
      a.equal(F.cell({ v: 'growth', state: 'value', kind: 'DER' }, { unit: 'segment' }), 'Growth');
      a.equal(F.cell({ v: 2.25, state: 'value', kind: 'APP' }, { unit: 'score' }), '2.3');
      a.equal(F.cell({ v: 'Some text', state: 'value', kind: 'IN' }, { unit: 'text' }), 'Some text');
    });

    T.test('X-format-kind', 'Kinds of value read as glyph plus word', function (a) {
      a.equal(F.kind('IN').text, '● Leader input');
      a.equal(F.kind('PRE').text, '○ System figure');
      a.equal(F.kind('DER').text, '◇ Calculated in the workbook');
      a.equal(F.kind('APP').label, 'Calculated by this app');
      var saved = window.TAP_ORG;
      try {
        window.TAP_ORG = { text: { kinds: { PRE: 'CRM figure' } } };
        a.equal(F.kind('PRE').text, '○ CRM figure', 'the organization layer can reword a kind');
      } finally { window.TAP_ORG = saved; }
    });

    T.test('X-format-date', 'Dates read the same for everyone ("2 Oct 2026")', function (a) {
      a.equal(F.date('2026-10-02T09:00:00Z'), '2 Oct 2026');
      a.equal(F.date('2026-01-31T23:30:00Z'), '31 Jan 2026');
      a.equal(F.date('2026-10-02T09:05:00Z', { time: true }), '2 Oct 2026, 09:05');
      a.equal(F.date(null), 'not provided');
    });

    T.test('X-format-list', 'Lists of names join with commas and "and"', function (a) {
      a.equal(F.list([]), '');
      a.equal(F.list(['A']), 'A');
      a.equal(F.list(['A', 'B']), 'A and B');
      a.equal(F.list(['A', 'B', 'C']), 'A, B and C');
      // Polish (e): names that hold "and" or a comma are kept apart with semicolons
      a.equal(F.list(['Retail', 'Pharma and Biotech', 'Property Management']), 'Retail; Pharma and Biotech; and Property Management');
      a.equal(F.list(['Pharma and Biotech', 'Property Management']), 'Pharma and Biotech; and Property Management');
      a.equal(F.list(['Retail', 'Utilities', 'Culture and Tourism']), 'Retail; Utilities; and Culture and Tourism');
      a.equal(F.list(['Region A', 'Region B, North']), 'Region A; and Region B, North');
      a.equal(F.list(['Grand', 'Andorra', 'Sandy']), 'Grand, Andorra and Sandy', 'only a whole word "and" counts');
    });

    T.test('X-format-locale', 'Formatting never depends on the browser’s language (part of TPV-TC-078)', function (a) {
      var saved = Number.prototype.toLocaleString;
      Number.prototype.toLocaleString = function () { return 'LOCALE'; };
      try {
        a.equal(F.moneyExact(1234.5), '€1,234,500');
        a.equal(F.num(1234), '1,234');
      } finally {
        Number.prototype.toLocaleString = saved;
      }
    });
  });
})(window.TAP);
