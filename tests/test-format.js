/*
 * File: tests/test-format.js
 * Purpose: Tests for number, rating and date formatting (US-1.2.6).
 * Provides: test cases TPV-TC-077, X-format-*, X-review-DE-1, X-review-DE-7, X-review-DE-11
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

    // Review DE-1: numbers JavaScript writes in exponent form (under 1e-6, from 1e21) used to print as NaN.
    T.test('X-review-DE-1', 'Very small and very large numbers format as numbers, never NaN', function (a) {
      a.equal(F.pct(1e-7), '0%', '1e-7 is 0.00001%, which rounds to 0 at one decimal');
      a.equal(F.pct(0.3 - 0.2 - 0.1), '0%', 'a float residue of about -2.8e-17 reads 0%');
      a.equal(F.pct(-2.7e-17, { exact: true }), '0%');
      a.equal(F.money(1e-10, U), '€0');
      a.equal(F.money(100 * 1.1 - 110), '€0', 'residue 1.42e-14 thousand is 1.42e-11 euro');
      a.equal(F.moneyExact(1.4e-14), '€0');
      a.equal(F.num(1e-7), '0', 'not whole, so one decimal: 0.0, shown as 0');
      a.equal(F.cell({ v: 1e-7, state: 'value', kind: 'APP' }, { unit: 'score' }), '0');
      // 1e21 / 1e9 = 1e12 billions: "1" and four groups of three zeros
      a.equal(F.money(1e21, U), '€1,000,000,000,000B');
      // 1e19 thousand = 1e22 euro: 23 digits, "10" and seven groups of three zeros
      a.equal(F.moneyExact(1e19), '€10,000,000,000,000,000,000,000');
      // 1e21: 22 digits, "1" and seven groups of three zeros
      a.equal(F.num(1e21), '1,000,000,000,000,000,000,000');
      // 1e21 as a share is 1e23 percent: 24 digits, "100" and seven groups
      a.equal(F.pct(1e21), '100,000,000,000,000,000,000,000%');
      // 5e20 shifted by two decimals passes 1e21 while rounding: 21 digits, "500" and six groups
      a.equal(F.num(5e20, { decimals: 2 }), '500,000,000,000,000,000,000');
      // A whole number written out from 1e21 keeps its zeros when decimals are asked for:
      // 2e21 is 22 digits, "2" and seven groups; 1e19 as an exact share is 1e21 percent, "1" and seven groups
      a.equal(F.num(2e21, { decimals: 1 }), '2,000,000,000,000,000,000,000');
      a.equal(F.pct(1e19, { exact: true }), '1,000,000,000,000,000,000,000%');
      a.equal(F.pct(0.2345, { exact: true }), '23.5%', 'decimal rounding still half up');
      a.equal(F.money(1234.5 * 1000, U), '€1.2M');
    });

    // Review DE-11: a negative value that rounds to zero lost its sign only after rounding.
    T.test('X-review-DE-11', 'Small negative values that round to zero show no minus sign', function (a) {
      a.equal(F.money(-0.0004), '€0', '-0.4 euro rounds to 0');
      a.equal(F.moneyExact(-0.0004), '€0');
      a.equal(F.pct(-0.0004), '0%', '-0.04% rounds to 0.0 at one decimal');
      a.equal(F.pct(-0.00004, { exact: true }), '0%');
      a.equal(F.num(-0.04), '0', 'one decimal: -0.0, shown as 0');
      a.equal(F.money(-1234567, U), '-€1.2M', 'real negatives keep the sign');
      a.equal(F.moneyExact(-0.6), '-€600', '-0.6 thousand is -600 euro');
      a.equal(F.pct(-0.25), '-25%');
      a.equal(F.pct(-0.004), '-0.4%');
      a.equal(F.num(-1.25), '-1.3', 'half up away from zero, as for positives');
    });

    // Review DE-7: a combined rating whose mean is a whole number read like one region's rating.
    T.test('X-review-DE-7', 'A combined rating always reads as an average, even when the mean is whole', function (a) {
      var items = [2, 3, 2, 1].map(function (v, i) {
        return { regionId: ['alpha', 'bravo', 'charlie', 'delta'][i], cell: { v: v, state: 'value', kind: 'IN' } };
      });
      var c = TAP.agg.combine(items, 'rating', 'total');
      a.equal(c.v, 2, '(2 + 3 + 2 + 1) / 4 = 2');
      a.equal(F.cell(c, { unit: 'rating', field: 'expertise' }), '2 average');
      a.equal(F.cell({ v: 2, state: 'value', kind: 'IN', src: { regionId: 'alpha' } }, { unit: 'rating', field: 'expertise' }),
        'Few key experts (2)', 'one region’s own rating keeps its wording');
      var c2 = TAP.agg.combine(items.slice(0, 3), 'rating', 'total');
      a.equal(F.cell(c2, { unit: 'rating', field: 'expertise' }), '2.3 average', '(2 + 3 + 2) / 3 = 2.33');
    });

    T.test('X-format-locale','Formatting never depends on the browser’s language (part of TPV-TC-078)', function (a) {
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
