# Architecture and interface contracts

How TAP Atlas is put together, and the contracts every part codes against. Each build stream keeps to these contracts. If one doesn't fit, the stream **stops and reports** instead of working around it; contract changes go through the lead and are written here first.

## 1. Platform rules

- Plain HTML, CSS and JavaScript, opened from `file://` by double-click. No server, no build step, no install.
- Chrome is the main browser and Edge must also work. Both are tested.
- Classic `<script src>` tags only. No ES modules, `import`/`export`, `fetch`, `XMLHttpRequest`, `eval` or `new Function`.
- Every library is in `vendor/`, so nothing loads from the web: Apache ECharts 5.6.0, and Archivo fonts under the OFL.
- Light theme only and animation off (D24). Every colour, font and size comes from `js/theme.js` (D43).
- Files stay small: aim for 300 lines or fewer; lint fails at 350.
- Every file starts with a header:

```js
/*
 * File: js/core/store.js
 * Purpose: Holds the shared app state and tells other parts when it changes.
 * Provides: TAP.store, TAP.bus
 * Depends on: js/core/namespace.js
 * Used by: every view, panel and the comparison bar
 */
```

## 2. Two editions (D37)

| File | Data | Organization layer | Committed |
|---|---|---|---|
| `index-sample.html` | `data/sample-plan-data.js` (fictional, generated) | none | yes |
| `index.html` | `data/plan-data.js` (real, from the Copilot import) | `content/organization.js` | the page yes; both data and organization files are gitignored |
| `tests.html` | `tests/fixtures/mini-data.js`, plus the sample data | none | yes |

The three pages load the same app scripts in the same order (lint checks this). Only the data and organization lines differ.

## 3. Globals and modules

**Data, configuration and content** are plain globals set by their files. Configuration files *add to* a global (`window.TAP_REPORTS = window.TAP_REPORTS || {}`) rather than replacing it, so the files can be split.

| Global | Set by | Contents |
|---|---|---|
| `PLAN_DATA` | data file | The plan data (Data Contract v0.2, `docs/DATA-CONTRACT.md`) |
| `TAP_THEME` | `js/theme.js` | Colours, fonts, sizes, logo, ECharts theme |
| `TAP_SETTINGS` | `config/settings.js` | Tunable numbers: weights, thresholds, limits |
| `TAP_VIEWS` | `config/views.js` | View order, titles and report lists |
| `TAP_REPORTS` | `config/reports-*.js` | Report definitions by id (schema in `config/reports.js`) |
| `TAP_RULES` | `config/insight-rules.js` | Insight rule definitions and the wording guide |
| `TAP_CONTENT` | `content/*.js` | Glossary, guide and all on-screen wording |
| `TAP_ORG` | `content/organization.js` (internal edition only) | Organization terms, wording and settings, layered over the general ones |

**Code** lives only under `window.TAP.<module>`, each module in an IIFE. A module reads other modules **at call time**, never at load time, so script order matters only for globals and registration.

```js
(function (TAP) {
  'use strict';
  function thing() { return TAP.store.get().view; }   // read at call time
  TAP.example = { thing: thing };
})(window.TAP);
```

**Registration** (views, builders, insight rules) happens at load time, so `js/engine/registry.js` loads before anything that registers.

**Stubs.** Every module exists from Wave 0. A module that isn't built yet is a stub of the right shape, made with `TAP.stub('module', ['fnA', 'fnB'], 13)`; builders, views and rule files use `TAP.stub.builder(name, issue)`, `TAP.stub.view(id, title, issue)` and `TAP.stub.rules(family, issue)`. A stub function throws "Not built yet (#13): TAP.module.fnA"; a stub view shows the same text on screen. `TAP.stub.list()` names every stub left. `tests/test-contracts.js` checks every module's shape. `tests/test-meta.js` and `lint --release` fail if any stub remains at release.

## 4. Start-up

1. Scripts load in the fixed order (section 13).
2. `js/ui/app.js` runs on `DOMContentLoaded` unless `<body data-autostart="false">` (the test page sets that and mounts the app itself).
3. `TAP.data.load()` checks `PLAN_DATA`:
   - a missing data file shows the "no plan data" screen;
   - a schema version mismatch shows the "version" screen;
   - errors that would break views show the error list with a copy button (US-1.8.2);
   - warnings go to the data sources panel.
4. Theme variables are applied, the shell is drawn, and the first view mounts: **Overview, All regions, no focus** (US-1.1.3).

**Screenshot mode.** With `?screenshot=1`, the query values `view`, `mode`, `focus`, `second`, `set` (comma list) and `rest` (`average|total`) set the opening state. This is used only by `scripts/screenshot.sh`. Without `screenshot=1` the query is ignored.

## 5. State and events: `TAP.store`, `TAP.bus` (`js/core/store.js`)

```js
state = {
  view: 'overview',
  cmp: { mode: 'all',            // 'all' | 'one' | 'pair' | 'set' | 'org'
         focus: null,            // region id ('one', 'pair')
         second: null,           // region id ('pair')
         set: [],                // region ids ('set')
         restAs: 'combined',     // 'combined' | 'individual'  ('one' only)
         restAgg: 'average' },   // 'average' | 'total'        (combined rest only)
  industry: null,                // industry selected on the Industry view (US-1.5.7)
  expanded: null,                // report id of the expanded panel, or null
  layer: null,                   // open side panel: {name, payload} or null
  highlight: null,               // active "Show me" target, see section 10
  hiddenInsights: [],            // insight ids hidden this session (never stored)
  scopeEpoch: 0                  // goes up on any shared comparison change or view change
}
```

| Function | Behaviour |
|---|---|
| `TAP.store.get()` | Current state (treat as read-only) |
| `TAP.store.set(patch)` | Shallow merge. `cmp` is merged key by key. Raises `scopeEpoch` if `cmp` or `view` changed. Notifies subscribers once with `(state, changedKeys)` |
| `TAP.store.on(fn)` | Subscribe; returns an unsubscribe function |
| `TAP.store.reset()` | Back to the defaults above (used by tests and on load) |
| `TAP.store.defaults()` | A fresh copy of the defaults |
| `TAP.bus.on(name, fn)` / `off` / `emit(name, payload)` | Simple event bus |

Bus events: `showme` `{insightId, target}`, `industry:select` `{industryId}`, `details:open` `{target}`, `charts:reset` (from the Guide's reset button).

The view follows the address bar (`#overview`) so the back button works (US-1.1.2). There is no bookmarking: every load opens on Overview.

Panels store their own comparison override (US-1.1.4) and drop it when `scopeEpoch` changes.

## 6. Data: `TAP.data` (`js/core/data.js`)

| Function | Returns |
|---|---|
| `load(plan?)` | Checks and installs `plan` (default `window.PLAN_DATA`). Returns `{ok, errors, warnings, reason}`, where `reason` is `'missing'`, `'version'` or `'invalid'` |
| `plan()` | The installed plan object |
| `meta()`, `lookups()` | Shortcuts |
| `regions()` / `region(id)` | The regions in file order. **Order sets colour** |
| `regionIndex(id)` | Position in file order |
| `industries({rated})` / `industry(id)` | Lookup industries. `rated: true` leaves out the not-applicable rows |
| `scale(field)` | The rating scale for a field: `{levels: [{score, label}]}` |
| `row(regionId, section, predicate)` | First matching row in a section |

Tests call `TAP.data.load(fixture)` to swap in `tests/fixtures/mini-data.js`.

## 7. Cells, sources and combining

**A cell** is the unit every measure returns and every chart and table shows:

```js
{ v: 1234,                       // number, string, array, or null
  state: 'value',                // 'value' | 'notProvided' | 'notApplicable'
  kind: 'PRE',                   // 'IN' leader input | 'PRE' system figure | 'DER' calculated in the workbook | 'APP' calculated by this app
  src: { regionId, section, field, row, year } }   // or a combined source, below
```

A cell may also carry `partial: true` with a `note` when part of it is missing, for example a region's ambition with new business but no customer growth. A figure summed over rows skips blank rows; if every row is blank, the cell is `notProvided`.

Zero is a value (`v: 0`). A blank is `notProvided` with `v: null`. Not applicable (`notApplicable`) is left out of charts quietly and never counted as a gap (US-1.2.11).

**Sources: `TAP.sources`** (`js/core/sources.js`, owned by DATA)
- `address(src)` returns `{file, sheet, cell, text, calculated, combined, regions}`.
  - `text` reads like `"Region C plan.xlsx › 1. Market Coverage › E17"`.
  - `calculated` is true for DER ("calculated in the workbook").
  - For combined sources, `text` says how the value was combined and `regions` lists the region names.
- `imports()` returns, per region, `{regionId, name, fileName, fileModified, importedAt, notes}`.
- `datesDiffer()` and `dataDate()` give the latest import date, for "Data: 2 Oct 2026".

A **combined source** is `{combined: true, how: 'sum'|'mean'|'wmean'|'rating'|'count'|'list', regionIds, excluded: [regionIds with no value], weightBy}`.

**Combining: `TAP.agg`** (`js/engine/aggregate.js`, owned by ENGINE). This is the **only** place the US-1.2.5 table is implemented, and insights reuse it.
- `combine(items, valueKind, how, opts)`:
  - `items` is `[{regionId, cell, weight}]`;
  - `valueKind` is `'amount'|'rate'|'rating'|'category'|'count'|'text'`;
  - `how` is `'total'` (organization total, or the rest as a total) or `'average'` (the rest as an average).
- It returns a cell with `kind: 'APP'` and a combined `src`, plus:
  - `range: {min, max}` for ratings;
  - `counts: {value: n}` for categories;
  - `items` for text.
- Not-provided and not-applicable cells are excluded and named in `src.excluded`. If nothing is left, the result is `notProvided`.

| valueKind | total | average |
|---|---|---|
| amount | sum | simple mean |
| rate | weighted mean (weight from `opts.weights` or the measure's `weightBy`) | weighted mean |
| rating | mean plus range | mean plus range |
| category | counts | counts |
| count | sum | simple mean |
| text | list by region | list by region |

## 8. Comparison scope: `TAP.scope` (`js/engine/scope.js`)

`entities(cmp)` returns the things a chart draws, in display order:

```js
{ id: 'north' | 'rest' | 'org',
  kind: 'region' | 'combined',
  regionIds: ['north'],          // regions the entity stands for
  how: null | 'total' | 'average',
  role: 'region' | 'focus' | 'second' | 'muted' | 'combined',
  color: '#...',                 // from TAP_THEME by role
  label: 'North America' | 'Average of the other 6 regions' }
```

| Mode | Entities |
|---|---|
| `all` | every region, `role: 'region'`, own colour |
| `one` | focus (`role: 'focus'`); then the rest, either individually (`role: 'muted'`, focus grey) or as one `rest` entity (`role: 'combined'`, dark grey, `how` from `restAgg`) |
| `pair` | focus and second, both in their own colours |
| `set` | the chosen regions in file order, own colours |
| `org` | one `org` entity over all regions, `how: 'total'` |

- `sentence(cmp)` gives the plain sentence, from content templates, for example "Showing Region C against the average of the other 6 regions".
- `regionIds(cmp)` gives every region in scope.
- `colorOf(regionId)` gives the region's fixed colour by file order. Past 8 regions the colours cycle and a warning goes to the data sources panel.
- No default ever names a sample-specific region.

## 9. Measures and scores (`js/engine/measures.js`, `js/engine/scores.js`, owned by ENGINE)

One registry feeds reports, cards, headline and insights, so figures can't drift apart.

- `TAP.measures.get(id)` returns `fn(regionId, ctx)`, which returns a cell. `ctx` holds `{year: 1|2|3|null, industryId, channel}`; `year: null` means the three-year total.
- `TAP.measures.meta(id)` returns:
  ```
  {id, label, short, unit: 'money'|'pct'|'rating'|'score'|'count'|'tier'|'segment'|'text',
   valueKind, kind, weightBy?, scale?, dims: ['industry', 'year', ...]}
  ```
- `TAP.measures.define(id, meta, fn)` and `list()`.
- `TAP.measures.combined(id, entity, ctx)` gives the cell for any scope entity: a region's own cell, or `TAP.agg.combine` over the entity's regions.

**Catalogue** (ids other streams may rely on; ENGINE may add more):

| Id | Meaning | valueKind / kind |
|---|---|---|
| `nb.arr` | New business ARR potential (by year, or 3-year sum) | amount / DER |
| `nb.services` | New business services potential | amount / DER |
| `cg.arr` | Customer growth incremental ARR | amount / DER |
| `cg.services` | Customer growth services order intake | amount / DER |
| `amb.arr` | 3-year ARR ambition = `nb.arr` + `cg.arr` | amount / APP |
| `amb.services` | Services ambition | amount / APP |
| `amb.oi` | Total order intake = ARR + services | amount / APP |
| `base.arr`, `base.pipeline`, `base.pipeline12m` | Region totals from Market Coverage | amount / PRE |
| `focus.tier1`, `focus.tier2`, `focus.tier3` | Number of industries per tier | count / IN |
| `nb.targetAccounts` | Target accounts | count / IN |
| `nb.wins` | Implied wins = target accounts × hit rate | count / APP |
| `nb.hitRate` | Hit rate, weighted by target accounts | rate / IN |
| `nb.avgDealSize` | Average deal size, weighted by implied wins | rate / IN |
| `nb.growthY2`, `nb.growthY3` | Growth assumptions, weighted by year-1 ARR | rate / IN |
| `nb.servicesRatio` | Services ratio, weighted by ARR | rate / PRE |
| `cg.growthY1..3` | Customer growth % per year, weighted by current ARR | rate / IN |
| `cg.segment.strategic`, `.growth`, `.core`, `.scaled` | Accounts per segment | count / DER |
| `ind.tier` | Tier for an industry (`ctx.industryId`) | category / IN |
| `ind.growthPotential`, `ind.criticality`, `ind.competitiveIntensity`, `ind.references`, `ind.expertise`, `ind.productFit` | Ratings 1 to 3 | rating / IN |
| `ind.attractiveness`, `ind.ability` | Scores 1 to 3 (`TAP.scores`) | rating / APP |
| `ind.currentArr`, `ind.pipeline`, `ind.pipeline12m` | System figures per industry | amount / PRE |
| `ind.nb.arr` | New business ambition in that industry | amount / DER |
| `ind.commentary` | Leader commentary | text / IN |

`TAP.scores.attractiveness(regionId, industryId)` and `ability(...)` use weights from `TAP_SETTINGS.scores` (equal by default). They return `notProvided` if any rating used is blank, and `notApplicable` for unrated industries. `TAP.scores.quadrant(a, b)` returns `'attractiveAble'|'attractiveNotYet'|'lessAttractiveAble'|'lessBoth'`, splitting at `TAP_SETTINGS.scores.midpoint` (2.0).

## 10. Reports and builders

**The report schema** is documented field by field in `config/reports.js`. Definitions live in `config/reports-overview.js` and `config/reports-industry.js` (D42):

```js
TAP_REPORTS['ov-ambition'] = {
  id: 'ov-ambition', view: 'overview',
  title: 'How big is each region’s plan, and where does it come from?',
  explain: { shows: '...', read: '...', lookFor: '...' },
  shape: 'parts',              // 'compare' | 'parts' | 'xy' | 'xyz' | 'grid' | 'years' | 'spread'
  builder: null,               // a named dedicated builder ('tierGrid', 'quadrant'); null means the generic one for the shape
  dimension: 'entity',         // what the category axis is: 'entity' | 'industry' | 'rating' | 'year'
  measures: [{ id: 'amb.arr', label: 'ARR' }, { id: 'amb.services', label: 'Services' }, { id: 'amb.oi', label: 'Total order intake' }],
  parts: { 'amb.arr': ['nb.arr', 'cg.arr'] },   // for 'parts': the stacked parts of each measure
  x: null, y: null,            // for 'xy' / 'xyz': measure ids
  size: { options: ['base.arr'], default: 'base.arr' },   // makes a bubble type available
  defaultType: 'stackedBar',
  types: ['stackedBar', 'stacked100', 'treemap', 'bubble', 'table'],
  breakdowns: ['year'],        // allowed "break down by" dimensions (US-1.2.7), at most one active
  sources: ['DER', 'PRE'],     // kinds named on the source line
  options: { weights: {} }     // report-level settings, e.g. rate weights (US-1.2.5)
};
```

| Function | Behaviour |
|---|---|
| `TAP.reports.get(id)` / `list(viewId)` | Lookup from `TAP_REPORTS` (`js/engine/registry.js`) |
| `TAP.reports.validate(def)` | Returns error strings. An invalid definition shows its errors **in its own panel only** |
| `TAP.shapes.types(def, entityCount)` | The allowed chart types: table always; radar only with 3 or fewer entities; bubble only with a size measure |
| `TAP.shapes.label(type)` | The menu name, for example "Stacked bar" |
| `TAP.prepare.run(def, ctx)` | Runs the measures over the scope entities into a dataset `{entities, rows, columns, missing, empty}`. Each row cell is a full cell, with source |
| `TAP.builders.register(name, fn)` / `get(name)` | The builder registry |

**ctx** (passed to `prepare.run` and builders): `{def, type, measureId, sizeId, breakdown, cmp, entities, year, industryId, highlight, expanded, theme}`.

**Builder result** (pure functions; no DOM access except to build the returned `html`):

```js
{ option,            // ECharts option, or
  html,              // an HTML string for non-ECharts views (tier grid heatmap)
  table: { columns: [{key, label, unit, align}], rows: [{entityId, cells: {key: cell}, src}] },
  legend: [{label, color, role}],
  sizeLegend: { label, kind, items: [{d, text}] } | null,
  notes: ['Average of 6 regions; Region F not included: not provided'],
  missing: ['Region F'],       // regions with no data for this report (US-1.2.11)
  empty: false,                // true means no region has data: the panel says so instead of drawing
  error: null,
  target(params) }             // maps an ECharts click to a details target, or null
```

Display nudging (jitter, label placement) never changes the values shown in tooltips or tables.

Generic builders: `compare`, `parts` and `xy` (which also serves `xyz`), in `js/engine/build-*.js`. Dedicated builders: `tierGrid` (`js/reports/tier-grid.js`, the only `grid` report in Phase 1) and `quadrant` (`js/reports/quadrant.js`).

## 11. Panel, views and side panels

- `TAP.panel.create(el, reportId, opts)` returns `{id, el, refresh(), highlight(target), expand(on), destroy()}`. The panel owns the title, takeaway, chart or table, legend, source line and controls (US-1.2.2). It re-renders on store changes.
- `TAP.views.register(id, { title, mount(el) })`. `mount` returns `{destroy()}`. `TAP.views.get(id)` and `TAP.views.order()` read `TAP_VIEWS` (`js/engine/registry.js`).
- `TAP.layers.open(name, payload)`, `close()` and `openDetails(target)` handle the side panels: details, data sources, glossary, explanation. They don't block the page; Esc closes the top one.
- `TAP.details.build(target)` returns `{title, groups: [{title, rows: [{label, cell}]}]}` (owned by INDUSTRY; the shell draws it).

**Target** (details and highlights): `{reportId, regionIds: [], industryIds: [], accountIds: [], quadrant}`. Every field except `reportId` is optional.

## 12. Insights (`js/insights/*`, `config/insight-rules.js`)

**Rule definition** (configuration):

```js
TAP_RULES.rules.push({ id: 'consensus', family: 'priorities', enabled: true,
  description: 'Industries placed in Tier 1 or 2 by most regions.',
  reads: ['marketCoverage.tier'], params: { share: 5 / 7 },
  template: '{industry} is Tier 1 or 2 in {n} of {total} regions.',
  attach: ['ind-tiers'], highlight: 'industryRow', fallback: 'details' });
```

**Rule code:** `TAP.insights.defineRule(id, fn)`, where `fn(ctx)` returns findings. `ctx` is `{params, data, measures, agg, scores, settings}`. A finding is:

```js
{ key: 'healthcare', regionIds: [...], industryIds: [...], accountIds: [],
  vars: { industry: 'Healthcare', n: 6, total: 7 },          // fills the template
  figures: [{ label, cell }],                                // shown on demand
  strength: 0.8,                                             // 0..1, how far from normal
  money: 0.12,                                               // 0..1, share of org ARR or pipeline involved
  sources: [src, ...] }
```

**Engine:** `TAP.insights.all()` is computed once against all regions. The functions built on it are:
- `ranked(cmp, {reportId, family, regionId})`: insights in scope, with the focus region's insights first, then by significance;
- `top(cmp, reportId, n)`;
- `hide(id)` / `unhide(id)` / `hidden()`, held in session state only;
- `failures()`: rules that threw, which are shown in the data sources panel.

Significance = family weight × (0.5 strength + 0.3 money + 0.2 breadth). Breadth = regions involved ÷ regions in the data. All weights come from `TAP_SETTINGS.insights`.

The engine drops any finding built from a not-provided value. It skips comparison rules when fewer than 3 regions provide the value. It refuses sentences containing a banned word (from `TAP_RULES.wording.banned`).

**Insight object:** `{id: ruleId + ':' + key, ruleId, family, sentence, figures, description, regionIds, industryIds, accountIds, significance, sources, reportId, highlight, label: 'Observation to discuss'}`.

## 13. Content (`content/*`, `js/core/content.js`, `js/ui/glossary.js`)

- `TAP_CONTENT.glossary[id] = {term, aliases: [], short, long, layer: 'general'}`.
- `TAP_CONTENT.guide` holds the Guide page sections.
- `TAP_CONTENT.text` holds every on-screen phrase: tour steps, headline templates, family lines, combined-figure explanations, system messages, banners, empty and missing states.
- `TAP_ORG` uses the same shape and overrides or adds keys. It also carries `settings` such as `internalLabel {show, text}`.
- `TAP.content.text(key, vars)` fills `{name}` placeholders. A missing key returns the key in brackets, so gaps are visible in testing.
- `TAP.content.term(idOrWord)` returns the merged glossary entry.
- `TAP.content.mark(text, seen)` returns safe HTML with the **first** occurrence of each glossary term marked. `seen` is a per-panel object, so a term is marked once per panel.

## 14. Script order (all three pages; lint compares them)

```
vendor/echarts.min.js
js/theme.js
js/core/namespace.js  dom.js  icons.js  storage.js  store.js  format.js
config/settings.js
content/ui-text.js  glossary.js  guide.js
   [index.html only: content/organization.js]
js/core/content.js
   [data file: data/plan-data.js | data/sample-plan-data.js | tests/fixtures/mini-data.js]
js/core/sources.js  check.js  data.js
js/engine/registry.js  aggregate.js  scope.js  measures.js  scores.js  shapes.js  prepare.js
js/engine/build-compare.js  build-parts.js  build-xy.js
config/reports.js  reports-overview.js  reports-industry.js  views.js  insight-rules.js
js/reports/tier-grid.js  quadrant.js  details.js
js/insights/engine.js  rules-priorities.js  rules-judgement.js  rules-assumptions.js
            rules-realism.js  rules-exposure.js  rules-capability.js
js/panel/panel-chart.js  panel-table.js  panel-menus.js  panel-export.js  panel-insights.js  panel.js
js/ui/shell.js  compare-bar.js  layers.js  sources-panel.js  system-screens.js  glossary.js  explain.js  tour.js
js/views/overview-cards.js  overview.js  industry.js  insights.js  guide.js
js/ui/app.js
```

`tests.html` then adds the harness, `tests/auto-cases.js`, the fixtures and the `tests/test-*.js` files.

## 15. CSS

- `css/base.css` (lead): reset, typography and the Modernist base styles. It reads only the CSS variables that `js/theme.js` writes onto `:root` (`--tap-*`).
- `css/shell.css`, `layers.css`, `panel.css`, `views.css`: one file per area, each with marked sections per stream.
- No colour literals and no `px` font sizes outside `js/theme.js` and `css/base.css`.

## 16. Ownership

| Area | Owner |
|---|---|
| `docs/ARCHITECTURE.md`, `docs/AGENT-BRIEF.md`, the three HTML pages, `css/base.css`, `js/core/namespace|dom|icons|storage|store|data.js`, `js/engine/registry.js`, `config/settings.js`, `config/reports.js`, `config/views.js`, `js/ui/app.js`, `tests/test-contracts.js`, `tests/test-meta.js`, `tests/fixtures/mini-data.js` | lead |
| `js/theme.js`, `js/core/format.js` | lead (Wave 0, #10 and #18) |
| everything else | the stream named in the build plan |

A stream that needs a change in a lead-owned file asks for it in its PR description under "Contract changes". It does not make the change itself.
