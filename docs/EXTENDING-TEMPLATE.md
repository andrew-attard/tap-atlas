# Extending the app to more of the template

How to bring another section of the planning template into TAP Atlas, step by step, so it can be done with Copilot in the real-data phase. Three levels, from data only to a new screen. Pick the lowest level that answers the question; each level builds on the one before.

| Level | What you get | What changes | Copilot prompt |
|---|---|---|---|
| 1. An extra section | The section as a sortable list on the **Other sections** view, every value traced to its cell | The import and the data file only. No code | Prompt 11 in `docs/COPILOT-PROMPTS.md` |
| 2. A measure and a report | A chart of a figure from that section, compared across regions, on an existing view | One small measures file, a report definition, wording | Prompt 12 |
| 3. A new view | A menu entry of its own, with several reports under a header | A view file, the menu list, wording, tests | Prompt 13 |

**Already in the contract.** The full template's recap blocks (revenue outlook, books value, strategic plan, routes to market), its order intake sheet and the new New Business and Partner columns have fields of their own since Phase 4; they are not extra sections. Prompt 16 in `docs/COPILOT-PROMPTS.md` brings them in.

**Generic on purpose.** Every example here is fictional: the section names, columns, figures and region ids are made up. The real template's sheet names, layout and anything organization-specific stay in the internal project folder and in Copilot, never in this repository (D2).

## The rules for every level

1. **Additions only to the Data Contract (D57).** Add fields and sections; never rename, remove or change the meaning of one that exists. `meta.schemaVersion` stays `"0.2"`. If an existing field really must change, that is a contract change for the lead, not an extension.
2. **Fictional examples only.** Anything committed to the public repository uses invented names and figures. Real data lives only in `data/plan-data.js`, which is gitignored, and in Copilot.
3. **Run the checks before use.** Open `tests.html` (everything must pass), then `index-sample.html`, then `index.html` with the real data. From a terminal, `scripts/verify.sh` runs the lint, the denylist scan, the docs paths check and the tests in both browsers. Never present a change the checks have not passed.
4. **Small files, plain scripts.** No modules, `import`, `fetch` or `eval`; every file starts with its header comment and stays under about 300 lines. On-screen wording goes in `content/`, never in code.
5. **The contract is the only interface.** Views read the data file only through what `docs/DATA-CONTRACT.md` names. Document a field there before any code reads it.

## Level 1: an extra section (data only)

Use when leaders fill in a section the app doesn't show yet and seeing it side by side is enough: a list per region, sorted by any column, following the comparison bar.

**How it works.** The data file describes the section once in `meta.extraSections` and puts its rows under each region's `extra` (the "Extra sections" part of `docs/DATA-CONTRACT.md`). The app finds it on load: the **Other sections** view appears in the menu with one list per section, each value's source reads file › sheet › cell, and the contract check warns about anything malformed without stopping the app (`js/core/extra.js`, wording in `content/text-extra.js`).

**Worked example (fictional).** Suppose the template has a sheet "6. Enablement" where each leader lists the training planned for the team: the course, who it is for, how many people, its cost, and the cost per person the sheet works out.

1. **Agree the columns.** One key per column, plus its heading, unit (`money`, `pct`, `count` or `text`), kind (`IN` leader input, `PRE` system figure, `DER` calculated in the workbook) and its worksheet column letter.
2. **Describe the section** in `meta.extraSections`:

```js
extraSections: [
  { id: 'enablement', title: '6. Enablement',
    intro: 'Training each region plans for its team over the three years, with the number of people and the cost.',
    columns: [
      { key: 'course', label: 'Course', unit: 'text', kind: 'IN', column: 'B' },
      { key: 'audience', label: 'For', unit: 'text', kind: 'IN', column: 'C' },
      { key: 'people', label: 'People', unit: 'count', kind: 'IN', column: 'D' },
      { key: 'cost', label: 'Cost', unit: 'money', kind: 'IN', column: 'E' },
      { key: 'costPerPerson', label: 'Cost per person', unit: 'money', kind: 'DER', column: 'F' } ] } ]
```

3. **Have the import write the rows** under each region, one object per worksheet row, with its `sourceRow` and `null` for a blank cell:

```js
{ id: 'north', name: 'Region North', ..., extra: { enablement: [
  { sourceRow: 7, course: 'Product foundations', audience: 'New sales hires', people: 6, cost: 12, costPerPerson: 2 },
  { sourceRow: 8, course: 'Value selling', audience: 'Account managers', people: 10, cost: null, costPerPerson: null } ] } }
```

4. **Check it.** Open `index.html`. The app opens even if the section is malformed; read the data sources panel (the "Data:" date on the comparison bar) for warnings such as `meta.extraSections[0].columns[3].unit (section "6. Enablement"): expected a unit: money, pct, count or text, found "euros"`. Fix the import, not the data file, and run it again.
5. **Spot-check** one value per region on the Other sections view: click its row and compare the cell the details name (`Region North plan.xlsx › 6. Enablement › E7`) with the workbook.

The sample data carries no extra section (D93), so `index-sample.html` shows no Other sections. To see the view, open a data file with an extra section: the tests use a fictional "5. Events" section (made by `tools/sample-extra.js` and added to a copy of the sample by `T_WITH_EXTRA` in `tests/test-setup.js`).

## Level 2: a measure and a report (configuration)

Use when a figure from the section should be compared as a chart: totals per region, the rest as an average, the organization total, with sources and the chart switcher like every other report.

**How it works.** A *measure* turns a region's rows into one figure (a cell with its source); a *report definition* says which measures to chart and how (the schema is in `config/reports.js`, the measures in `docs/ARCHITECTURE.md` section 9). The engine combines regions, draws, and exports; no chart code is needed for an existing shape.

**Worked example (fictional), on the test "5. Events" section:** "How much does each region put into customer events?"

1. **Write the measure** in a new file for local measures, **js/engine/measures-local.js** (the two built-in measures files are full), with the usual header. It sums the budget over the region's rows through `TAP.rows`, so each figure keeps its source rows:

```js
(function (TAP) {
  'use strict';
  var M = TAP.measures, k = M.kit, SRC = 'extra:events';
  M.define('ev.budget', k.amount('IN', []), function (regionId) {
    var used = [], total = 0;
    TAP.rows.list(SRC, [regionId]).forEach(function (row) {
      var c = TAP.rows.cell(SRC, 'budget', row);
      if (c.state === 'value') { total += c.v; used.push(row.sourceRow); }
    });
    var s = k.src(regionId, SRC, 'budget', used, null, 'IN');
    return used.length ? k.cell(total, 'IN', s) : k.blank('IN', s);
  });
})(window.TAP);
```

2. **Load the file**: add `'js/engine/measures-local.js'` after `'js/engine/rows.js'` in the list at the top of `tools/build-pages.js` and run `node tools/build-pages.js`. Without Node, add the same `<script>` line, in the same place, to `index.html`, `index-sample.html` and `tests.html`.
3. **Name it on screen**: add `measures: { ev: { budget: { label: 'Event budget', short: 'Events' } } }` to a wording file. A file of your own under `content/` keeps it apart (load it like the measures file); merge into the existing `measures` key rather than replacing it.
4. **Define the report** in the view's definitions file, here `config/reports-customers.js`, and add its id to that view's list in `config/views.js`:

```js
window.TAP_REPORTS['cg-events'] = {
  id: 'cg-events', view: 'customers',
  title: 'How much does each region put into customer events?',
  explain: { shows: 'The budget each region plans for field events over the three years.',
    read: 'One bar per region. The rest and the organization total add the budgets up.',
    lookFor: 'Regions planning much more or much less than the others for the accounts they invite.' },
  shape: 'compare', dimension: 'entity', measures: [{ id: 'ev.budget', label: 'Event budget' }],
  defaultType: 'bar', types: ['bar', 'dot', 'table'], breakdowns: [], sources: ['IN'], options: {}
};
```

5. **Check it.** In `tests.html`, the report-definition tests validate the new definition. Then open the view on a data file that carries the section (the sample has none): the chart, the table view and the source line ("North America plan.xlsx › 5. Events › F8:F10") all work. A definition with an error shows it in its own panel only.

A measure must never read a field the contract doesn't list, and never fill a blank with zero: return `k.blank` when nothing was provided, as above.

## Level 3: a new view (code)

Use when a section deserves its own page: several reports, a question as the title, and a place in the menu and on the number keys.

**How it works.** A view registers itself with `TAP.views.register(id, {title, mount})`; `config/views.js` sets the menu order and the view's report list. The number keys and the menu follow that order. A view that only makes sense with some data adds `available()` and is left out of the menu when it returns false, as **Other sections** does.

**Worked example (fictional): an "Events" view** with the level 2 report and the events list.

1. **The view file**, **js/views/events.js** (new), modelled on `js/views/partners.js`: the shared layout draws the header and every report in the view's list, two side by side and lists at full width.

```js
TAP.views.register('events', { title: 'Events',
  mount: function (root) { return TAP.cgpLayout.mount(root, 'events', 'eventsView'); },
  available: function () { return TAP.extra.any(); } });
```

2. **The menu**: in `config/views.js`, add `'events'` to `order` where it should sit, and `events: { title: 'Events', reports: ['cg-events', 'ev-list'] }`. Give the reports `view: 'events'`. The list report is a plain definition with `shape: 'list'` and `rows: 'extra:events'` (columns by key, as `TAP.rows.columns('extra:events')` lists them).
3. **The wording**: `eventsView: { kicker, title, lead, label }` in a `content/` wording file, as `content/text-customers.js` does for its views.
4. **Load it**: add the view file to `tools/build-pages.js` with the other views and run `node tools/build-pages.js` (or add the `<script>` line to the three pages by hand).
5. **Tests**: add a test file modelled on `tests/test-partners.js` (the view mounts, its title is the question, it is in the menu after the view before it) and list it in `tools/build-pages.js` under the tests.
6. **Check it**, as in the rules: `tests.html`, then `index-sample.html`, at 1280 px wide and at 125% and 150% zoom. With nine or more views, check the menu still fits and every number key still opens the view at its position.

A new view is the biggest of the three: prefer level 2 when one more chart on an existing view answers the question.

## Where to look

- The data shape: `docs/DATA-CONTRACT.md` (extra sections, source references, validation).
- The contracts the code keeps to: `docs/ARCHITECTURE.md` (sections 9 to 11, 17.4 for lists and 18.4 for extra sections).
- The extra sections code: `js/core/extra.js`, `js/engine/rows.js`, `js/views/other.js`.
- Ready prompts for each level: prompts 11 to 13 in `docs/COPILOT-PROMPTS.md`.
