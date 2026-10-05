/*
 * File: tools/sample-extra.js
 * Purpose: The sample's one extra template section (US-3.2.1): a fictional "Events" sheet with a few rows per
 *          region, added to the plan as meta.extraSections and per-region extra, plus the figures the tests check.
 * Provides: module.exports ({apply, expect, comment})
 * Depends on: nothing (fixed rows, no random numbers, so the rest of the sample stays byte-identical)
 * Used by: tools/generate-sample-data.js
 *
 * Every event, format and note is invented. Money is in thousands; budget per account is the workbook's own
 * calculation (DER), rounded to two decimals as a template would show it.
 */
'use strict';

const SECTION = {
  id: 'events', title: '5. Events',
  intro: 'Field events each region plans over the three years: the format, the timing, how many accounts are invited and the budget.',
  columns: [
    { key: 'event', label: 'Event', unit: 'text', kind: 'IN', column: 'B' },
    { key: 'format', label: 'Format', unit: 'text', kind: 'IN', column: 'C' },
    { key: 'timing', label: 'Timing', unit: 'text', kind: 'IN', column: 'D' },
    { key: 'invited', label: 'Accounts invited', unit: 'count', kind: 'IN', column: 'E' },
    { key: 'budget', label: 'Budget', unit: 'money', kind: 'IN', column: 'F' },
    { key: 'perAccount', label: 'Budget per account', unit: 'money', kind: 'DER', column: 'G' },
    { key: 'notes', label: 'Notes', unit: 'text', kind: 'IN', column: 'H' }
  ]
};

// A planted long note (TPV-TC-586): the list shows it in full, never cut short.
const LONG = 'Shared stand with two partners. The plan assumes the same floor space as last year, a demo area for ' +
  'the mobile app and three short customer talks on each day; follow-up calls are booked in the two weeks after ' +
  'the fair, and the leads go to the regional sales team in the same week.';

// [event, format, timing, accounts invited, budget, notes] per region, from worksheet row 8. A region left out
// (Central Europe) has no rows, like a workbook with the sheet left empty. A null budget is a blank cell.
const ROWS = {
  na: [['Customer innovation day', 'Conference', 'Year 1 Q2', 60, 45, 'Joint sessions with two partners'],
    ['Healthcare roundtable', 'Roundtable', 'Year 1 Q3', 15, 12, null],
    ['Data center summit', 'Trade fair', 'Year 2 Q1', 120, 80, null]],
  latam: [['Partner kick-off', 'Workshop', 'Year 1 Q1', 25, 18, null],
    ['Retail breakfast briefing', 'Roundtable', 'Year 1 Q4', 20, null, 'Budget to be confirmed']],
  neu: [['Public sector webinar series', 'Webinar', 'Year 1 Q2', 200, 10, null],
    ['Facility leaders forum', 'Conference', 'Year 2 Q2', 80, 55, 'Hosted with the user group'],
    ['Pharma site visit', 'Site visit', 'Year 1 Q3', 8, 6, null]],
  seu: [['Hospitality open house', 'Open house', 'Year 1 Q2', 30, 20, null],
    ['Utilities workshop', 'Workshop', 'Year 2 Q3', 12, 9, null]],
  mea: [['Workplace technology showcase', 'Trade fair', 'Year 1 Q4', 90, 70, LONG],
    ['Executive dinner', 'Dinner', 'Year 2 Q1', 10, 15, null]],
  apac: [['Education leaders breakfast', 'Roundtable', 'Year 1 Q3', 18, 10, null],
    ['Field service tour', 'Roadshow', 'Year 2 Q2', 40, 35, null],
    ['Year-end customer forum', 'Conference', 'Year 3 Q4', 70, 50, null]]
};
const FIRST_ROW = 8;

function round2(x) { return Math.round(x * 100) / 100; }

function rowsFor(regionId) {
  return (ROWS[regionId] || []).map(function (r, i) {
    return { sourceRow: FIRST_ROW + i, event: r[0], format: r[1], timing: r[2], invited: r[3], budget: r[4],
      perAccount: r[4] == null || !r[3] ? null : round2(r[4] / r[3]), notes: r[5] };
  });
}

// Adds the section to the plan. Regions with no rows get no "extra" at all.
function apply(plan) {
  plan.meta.extraSections = [SECTION];
  plan.regions.forEach(function (r) {
    const rows = rowsFor(r.id);
    if (rows.length) r.extra = { events: rows };
  });
}

// The figures the tests check, worked out from the fixed rows above (never by the app's code).
function expect(plan) {
  const rows = {}, sources = [];
  let blank = null, long = null;
  plan.regions.forEach(function (r) {
    const list = rowsFor(r.id);
    rows[r.id] = list.length;
    list.forEach(function (row) {
      if (row.budget == null && !blank) blank = [r.id, row.sourceRow, 'budget'];
      if (row.notes === LONG) long = { region: r.id, row: row.sourceRow, key: 'notes', length: LONG.length };
    });
  });
  // Three addresses: a text cell, a figure and a calculated figure, as file › sheet › cell
  [['na', 9, 'event', 'B', 'IN'], ['neu', 10, 'budget', 'F', 'IN'], ['apac', 8, 'perAccount', 'G', 'DER']].forEach(function (s) {
    const reg = plan.regions.filter(function (r) { return r.id === s[0]; })[0];
    sources.push({ src: { regionId: s[0], section: 'extra:events', field: s[2], row: s[1], kind: s[4] },
      text: reg.source.fileName + ' › ' + SECTION.title + ' › ' + s[3] + s[1], calculated: s[4] === 'DER' });
  });
  return { id: SECTION.id, title: SECTION.title, intro: SECTION.intro,
    columns: SECTION.columns.map(function (c) { return c.key; }), labels: SECTION.columns.map(function (c) { return c.label; }),
    rows: rows, total: Object.keys(rows).reduce(function (t, k) { return t + rows[k]; }, 0),
    values: [['na', 8, 'budget', 45], ['na', 10, 'perAccount', 0.67], ['mea', 9, 'perAccount', 1.5], ['neu', 9, 'event', 'Facility leaders forum']],
    blank: blank, long: long, sources: sources };
}

function comment(x) {
  return ['Extra section "' + x.title + '" (US-3.2.1): ' + x.total + ' rows; ' +
    Object.keys(x.rows).filter(function (k) { return !x.rows[k]; }).join(', ') + ' has none. Long note: ' +
    x.long.region + ' row ' + x.long.row + '. Blank budget: ' + x.blank[0] + ' row ' + x.blank[1] + '.'];
}

module.exports = { apply: apply, expect: expect, comment: comment, SECTION: SECTION };
