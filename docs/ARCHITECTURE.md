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
| `TAP_VIEWS` | `config/views.js` | Menu groups and the view order made from them, titles and report lists |
| `TAP_REPORTS` | `config/reports-*.js` | Report definitions by id (schema in `config/reports.js`) |
| `TAP_RULES` | `config/insight-rules.js` (`rules`), `config/insight-wording.js` (`wording`) | Insight rule definitions; the wording guide, banned words and phrases |
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

1. Scripts load in the fixed order (section 14).
2. `js/ui/app.js` runs on `DOMContentLoaded` unless `<body data-autostart="false">` (the test page sets that and mounts the app itself).
3. `TAP.data.load()` checks `PLAN_DATA`:
   - a missing data file shows the "no plan data" screen;
   - a schema version mismatch shows the "version" screen;
   - errors that would break views show the error list with a copy button (US-1.8.2);
   - warnings go to the data sources panel.
4. Theme variables are applied, the shell is drawn, and the first view mounts: **Overview, All regions, no focus** (US-1.1.3).

**Screenshot mode.** With `?screenshot=1`, the query values `view`, `region` (Regions view), `mode`, `focus`, `second`, `set` (comma list) and `rest` (`average|total`) set the opening state. An old `mode=pair` (with `focus` and `second`) opens as `set` with those regions (D99). This is used only by `scripts/screenshot.sh`. Without `screenshot=1` the query is ignored.

## 5. State and events: `TAP.store`, `TAP.bus` (`js/core/store.js`)

```js
state = {
  view: 'overview',
  cmp: { mode: 'all',            // 'all' | 'set' | 'one' (D99, D114); 'pair' and 'org' are read for old files only
         focus: null,            // region id ('one')
         second: null,           // region id (old 'pair' only)
         set: [],                // region ids ('set'): one or more (D99)
         restAs: 'combined',     // 'combined' | 'individual'  ('one' only)
         restAgg: 'average' },   // 'average' | 'total'        (combined rest only)
  industry: null,                // industry selected on the Industry view (US-1.5.7)
  expanded: null,                // report id of the expanded panel, or null
  layer: null,                   // open side panel: {name, payload} or null
  highlight: null,               // active "Show me" target: a Target (section 11)
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

**Notes for the data sources panel: `TAP.notes`** (also in `store.js`). `add({source, message, regionId?, sheet?, cell?})`, `list(source?)`, `clear(source?)`. Sources are `'data'` (check warnings), `'colours'` (more regions than colours) and `'organization'` (a broken organization file). Skipped insight rules come from `TAP.insights.failures()` instead. Notes go **only** to the data sources panel, never onto the main screens (US-1.1.5). `app.start` clears them and adds the load warnings.

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
  src: { regionId, section, field, row, year, cell, kind } }   // or a combined source, below
```

**A source reference (`src`):**
- `section`: `marketCoverage`, `newBusiness`, `customerGrowth`, `partners` or `recap`.
- `field`: the contract field. Dotted for nested fields, e.g. `channelSplit.direct` or `thresholds.strategicArr`.
- `row`: the item's `sourceRow`.
- `year`: the **plan year 1, 2 or 3** for fields held by year (never a calendar year).
- `cell`: a fixed cell when there is one, e.g. a recap item's `sourceCell`.
- `kind`: the cell's kind, so the address can say "calculated in the workbook".

Measures fill in `kind`; `TAP.sources.address` never guesses it.

A cell may also carry `partial: true` with a `note` when part of it is missing, for example a region's ambition with new business but no customer growth. A figure summed over rows skips blank rows; if every row is blank, the cell is `notProvided`.

Zero is a value (`v: 0`). A blank is `notProvided` with `v: null`. Not applicable (`notApplicable`) is left out of charts quietly and never counted as a gap (US-1.2.11).

**Sources: `TAP.sources`** (`js/core/sources.js`, owned by DATA)
- `address(src)` returns `{file, sheet, cell, text, calculated, combined, regions}`.
  - `text` reads like `"Region C plan.xlsx › 1. Market Coverage › E17"`.
  - `calculated` is true for DER ("calculated in the workbook").
  - For combined sources, `text` says how the value was combined and `regions` lists the region names.
  - On screen a file address sits behind the data icon beside its figure (`TAP.sourceTip`, section 11, D100); copied tables and insights keep it as text. How a combined figure was combined stays in words.
- `imports()` returns, per region, `{regionId, name, fileName, fileModified, importedAt, notes}`.
- `datesDiffer()` and `dataDate()` give the latest import date, for "Data: 2 Oct 2026".

A **combined source** is `{combined: true, how: 'sum'|'mean'|'wmean'|'rating'|'count'|'list', regionIds, excluded, notApplicable, weightBy, weighted, weightFallback, partial, parts}`:
- `excluded`: regions whose value is not provided. They are named in notes.
- `notApplicable`: regions where the value doesn't apply. They are left out quietly, never as a gap.
- The regions actually used are `regionIds` minus both.
- `weightFallback: true` means the weight couldn't be resolved, so an unweighted mean was used, with a `TAP.notes` entry.
- `weightMissing`: regions whose rate was provided but whose weight was blank. They are not included, and are named as "weight missing", not "not provided".
- `parts`: on derived sums, the combined part cells.

A **multi-row source** (a sum over several rows of one region) has `row: null` and `rows: [...]`. App-calculated cells may carry `parts`; score cells carry `fields` (the ratings used).

**Combining: `TAP.agg`** (`js/engine/aggregate.js`, owned by ENGINE). This is the **only** place the US-1.2.5 table is implemented, and insights reuse it.
- `combine(items, valueKind, how, opts)`:
  - `items` is `[{regionId, cell, weight}]`;
  - `valueKind` is `'amount'|'rate'|'rating'|'category'|'count'|'text'`;
  - `how` is `'total'` (organization total, or the rest as a total) or `'average'` (the rest as an average).
- It returns a cell with `kind: 'APP'` and a combined `src`, plus:
  - `range: {min, max}` for ratings;
  - `counts: {value: n}` for categories;
  - `items` for text.
- Not-provided cells are excluded and named in `src.excluded`; not-applicable ones go in `src.notApplicable`. If nothing is left, the result is `notProvided`, or `notApplicable` when every item was not applicable.
- Category results also carry `v: [{value, n}]`.
- Helpers: `TAP.agg.weightBy(measureId, weights)` returns the weight measure id (`weights` is a report's `options.weights` map); `TAP.agg.describe(cell)` returns the plain label, e.g. "Weighted average of 6 regions, by target accounts".
- An unknown `valueKind` throws.

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
| `set` | Selected regions: one region or more, in file order, own colours (D99) |
| `org` | All regions combined: one `org` entity over all regions, `how: 'total'`, labelled "All 7 regions combined". Off the screen since D114: kept for code that passes it in directly (the row bubble chart, tests); old settings read it as `all` |
| `pair` | read for old files only (D99): focus and second, both in their own colours. Nothing on screen offers it |

- `sentence(cmp)` gives the plain sentence, from content templates, for example "Showing Region C against the average of the other 6 regions".
- `regionIds(cmp)` gives every region in scope.
- `upgrade(cmp)` reads an old one vs one (D99): a `pair` becomes `{mode: 'set', set: [focus, second]}` in file order, or the focus alone without a valid second. An old all regions combined (D114): an `org` becomes `{mode: 'all'}`. Any other comparison comes back as it is. The address bar, presentation steps, recorded steps, the comparison bar and the panel's own comparison read a cmp through it.
- `colorOf(regionId)` gives the region's fixed colour by file order. Past 8 regions the colours cycle and a warning goes to the data sources panel.
- No default ever names a sample-specific region.
- The ids `rest` and `org` belong to the combined entities, so the data check refuses them as region ids (#344).

## 9. Measures and scores (`js/engine/measures.js`, `js/engine/scores.js`, owned by ENGINE)

One registry feeds reports, cards, headline and insights, so figures can't drift apart.

- `TAP.measures.get(id)` returns `fn(regionId, ctx)`, which returns a cell. `ctx` holds `{year: 1|2|3|null, industryId, channel}`; `year: null` means the three-year total.
- `TAP.measures.meta(id)` returns:
  ```
  {id, label, short, unit: 'money'|'pct'|'rating'|'score'|'count'|'tier'|'segment'|'text',
   valueKind, kind, weightBy?, scale?, dims: ['industry', 'year', ...]}
  ```
- `TAP.measures.define(id, meta, fn)` and `list()`.
- `TAP.measures.combined(id, entity, ctx)` gives the cell for any scope entity: a region's own cell, or `TAP.agg.combine` over the entity's regions. **Derived sums** (`amb.arr`, `amb.services`, `amb.oi`) are combined as the sum of their combined parts, so stacked parts always add up to the total and a missing part is never averaged in as zero.

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
| `nb.targetAccountsRated` | Target accounts on rows that have a hit rate (the hit rate's weight, so wins add up) | count / IN |
| `nb.wins` | Implied wins = target accounts × hit rate | count / APP |
| `nb.hitRate` | Hit rate = implied wins ÷ target accounts on rows with a hit rate; combined weighted by `nb.targetAccountsRated` | rate / IN |
| `nb.avgDealSize` | Average deal size, weighted by implied wins | rate / IN |
| `nb.growthY2`, `nb.growthY3` | Growth assumptions, weighted by 3-year new business ARR potential | rate / IN |
| `nb.servicesRatio` | Services ratio, weighted by ARR | rate / PRE |
| `cg.growthY1..3` | Customer growth % per year: `cg.growth.all` for that year, combined from summed parts (D78) | rate / APP |
| `cg.segment.strategic`, `.growth`, `.core`, `.scaled` | Accounts per segment | count / DER |
| `ind.tier` | Tier for an industry (`ctx.industryId`) | category / IN |
| `ind.growthPotential`, `ind.criticality`, `ind.competitiveIntensity`, `ind.references`, `ind.expertise`, `ind.productFit` | Ratings 1 to 3 | rating / IN |
| `ind.attractiveness`, `ind.ability` | Scores 1 to 3 (`TAP.scores`) | rating / APP |
| `ind.currentArr`, `ind.pipeline`, `ind.pipeline12m` | System figures per industry | amount / PRE |
| `ind.nb.arr` | New business ambition in that industry | amount / DER |
| `ind.commentary` | Leader commentary | text / IN |

`TAP.scores.attractiveness(regionId, industryId)` and `ability(...)` use weights from `TAP_SETTINGS.scores` (equal by default). They return `notProvided` if any rating used is blank, and `notApplicable` for unrated industries. `TAP.scores.quadrant(a, b)` returns `'attractiveAble'|'attractiveNotYet'|'lessAttractiveAble'|'lessBoth'`, splitting at `TAP_SETTINGS.scores.midpoint` (2.0). **A score equal to the midpoint counts as attractive (or able)**: attractive means `a >= 2.0`, able means `b >= 2.0`.

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
| `TAP.prepare.run(def, ctx)` | Runs the measures over the scope entities into a dataset `{def, dimension, primary, entities, rows, columns, missing, missingIds, empty, ctx}`. Each row cell is a full cell, with source; year columns are keyed `<id>@y1..3`. Also `TAP.prepare.primaryIds(def, ctx)` and `selected(def, ctx)` |
| `TAP.shapes.kit` | Shared drawing helpers for builders (sizes, shades, rings, tooltips). `TAP.shapes.types(def, n, {breakdown})` offers `groupedBar` only when a breakdown is chosen |
| `TAP.builders.register(name, fn)` / `get(name)` | The builder registry |

**ctx** (passed to `prepare.run` and builders): `{def, type, measureId, sizeId, breakdown, cmp, entities, year, industryId, highlight, expanded, theme, opts, size}`. `ctx.size` is the chart's real `{w, h}` in pixels when known. `ctx.opts` holds the report option values chosen in the panel, e.g. `sort` (tier grid) and `everyRegion` (quadrant; its industry filter went with D105). The panel keeps them per panel and resets them when `scopeEpoch` changes, like the comparison override.

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
  controls: [{key, label, kind: 'segmented'|'select', value, options: [{value, label}]}],   // optional: options the builder offers
  sized: false,                // true: build again once ctx.size is known or changes (label placement)
  height: null,                // optional height hint in px for the chart area
  // legend items may carry `mark` (a number drawn on the marks) and `color: null` (no key swatch)
  target(params) }             // maps an ECharts click (or an HTML click's data) to a target, or null
```

Display nudging (jitter, label placement) never changes the values shown in tooltips or tables.

**Builder controls and HTML clicks.**
- **Controls:** the panel draws `result.controls` next to its own controls, writes the choice into `ctx.opts[key]` and rebuilds. The panel never needs report-specific code. One key is reserved: `type` sets the chart type, as the type menu does (the Amount / Share of total switch, below).
- **Parts coloured by channel (D124):** a parts report whose parts are the four sales channels sets `options.partColors: 'channel'`. Each channel part then takes its colour from the theme's channel palette (`TAP_THEME.channels`, `{direct, partner, allianceA, allianceB}` each `{bg, fg}`, colour-blind safe, also as `--tap-ch-<id>` variables), the same in every bar; the legend keys the channels (role `channel`, a swatch each) and no region; region names stay on the axis. Show me keeps its ring, and the focus region in One vs the rest gets an ink outline and a bold axis name. Tooltips name the channel first: "Partner · Region A: €2.1M, 40%". With the year breakdown the parts are years, so the region shades return. Kit helpers in `js/engine/shapes.js`: `partPaints(def, keys)`, `channelLegend(labels, paints, role)`, `channelTitle`, `partBorder`, `axisEmphasis`, `shareSwitch`; `js/reports/stack-draw.js` takes the paints as `d.paints`. Used by `nb-channels`, `pt-reliance` and `pt-books` (split by channel).
- **Segment and risk colours (D131):** `options.partColors` also takes `'segment'` (`TAP_THEME.segments`, `{strategic, growth, core, scaled}`) and `'risk'` (`TAP_THEME.risk`, `{high, medium, low, none}`, ordered by lightness so high reads strongest; `none` is not flagged). Both are `{bg, fg}` per id, colour-blind safe with labels at 4.5:1, and written as `--tap-seg-<id>` and `--tap-risk-<id>`. `partPaints` finds the id as the last dot-separated piece of a part key that is one (`cg.seg.core.arr` gives `core`), so no report is special-cased; the legend role is the `partColors` value (`segment`, `risk`). `cg-segments` uses `'segment'` with the share switch. Broken down by risk (one region only, D132), `cgSegments` draws one bar per region and segment split into the risk levels in the risk palette, with the segment named first in tooltips ("Strategic · High risk · Region A: 4, 40%").
- **Category, route and maturity colours (D135):** `options.partColors` also takes `'category'` (`TAP_THEME.categories`, `{swPerpetual, recurring, hardware, services}`), `'route'` (`TAP_THEME.routes`, the six `lookups.routes` ids plus `none`) and `'maturity'` (`TAP_THEME.maturity`, `{recruit, onboard, enable, skill, strategic, none}`, one hue ordered by lightness, Recruit lightest). All are `{bg, fg}` per id, colour-blind safe with labels at 4.5:1, written as `--tap-cat-<id>`, `--tap-rt-<id>` and `--tap-mat-<id>`. `dimStack` passes its part values to `partPaints`; with a palette the parts are not numbered, the key is swatches and names (role: the `partColors` value, `d.paintRole` in `stack-draw.js`) and tooltips name the part first. `ptBooks` takes the palette of the split in use (channel or category). Used by `pt-routes`, `pt-maturity` and `pt-books` (split by category).
- **Amount / Share of total (D124):** with `options.amountShare: true` and both `stackedBar` and `stacked100` in `types`, the parts builder (and `dimStack`) returns a segmented control `{key: 'type'}` with "Amount" and "Share of total"; the panel turns the pick into the chart type. The type menu still lists both. Used by `nb-channels`, `pt-reliance`, `cg-segments`, `pt-routes` and `pt-maturity`.
- **HTML clicks:** in HTML results, clickable elements carry `data-tap-region` and/or `data-tap-industry`. The panel delegates clicks and calls `result.target({data: {regionId, industryId}})`.
  - A click naming exactly one industry emits `industry:select {industryId}`.
  - A click that also names a region opens details (`TAP.layers.openDetails`).
  - ECharts clicks follow the same rule, using the target the builder returns.

**Builder conventions for the panel:**
- ECharts data items carry `entityId`, `key` (or `keys`) and `raw`; not-provided marks have `np: true`.
- Series carry `tapRole`: `'value'`, `'total'`, `'notProvided'`, `'highlight'`, `'selection'` (the industry in focus, D105) or `'mark'` (a silent series of numbers drawn over marks, keyed in the legend through items with `mark`; tooltips and clicks reach the marks underneath).
- Tooltip HTML uses the classes `tap-tip`, `tap-tip-title` and `tap-tip-row`, styled in `css/panel.css`.
- A radar leaves out any group with a blank rating; a bubble leaves out rows with a blank x or y. Both name the left-out items in `notes`.
- The `ind.*` measures are defined in `scores.js`.

**Escaping.** Builder `html` and every ECharts tooltip or label `formatter` that returns HTML must pass every data value (region, industry and account names, commentary, success factors) through `TAP.dom.esc()`. These strings come from the workbooks.

**The bubble view of a `parts` report** (for example `ov-ambition`) is drawn by the `parts` builder, using the definition's `x`, `y` and `size`. `TAP.reports.validate` checks every type against its shape (`TAP.reports.SHAPE_TYPES`) and every measure id it names (`TAP.reports.measureIds`).

Generic builders: `compare`, `parts` and `xy` (which also serves `xyz`), in `js/engine/build-*.js`. Dedicated builders: `tierGrid` (`js/reports/tier-grid.js`, the only `grid` report in Phase 1) and `quadrant` (`js/reports/quadrant.js`).

**The ratings grid (D101).** `ind-ratings` uses the dedicated builder `ratingsGrid` (`js/reports/ratings-grid.js`) and the chart type `grid` (a `compare` type; `TAP.custom` never offers it), its default; its types are `grid`, `bar` and `table`, and `bar` is handed to the generic `compare` builder. The grid has one row per comparison entity (`TAP.scope.entities`, so combined figures are rows of their own) and, for each score in `TAP_SETTINGS.scores`, the ratings that carry weight in it and then the score: the cells are `TAP.measures.combined('ind.<rating>' | 'ind.attractiveness' | 'ind.ability', entity, {industryId})`, exactly what the quadrant plots. Rating cells show the number on the tier palette (1 lightest, 3 darkest); scores and combined ratings show one decimal; a blank rating, and a score it leaves out, reads "not provided". HTML cells carry `data-tap-region` (the entity id) and `data-tap-industry`, so a click opens that row's details for the industry.

## 11. Panel, views and side panels

- `TAP.panel.create(el, reportId, opts)` returns `{id, el, refresh(), highlight(target), expand(on), destroy()}`. The panel owns the title, chart or table, legend, source line and controls (US-1.2.2). No insight sentence sits under the title: a chart's insights stay behind its Insights button (D120). An opened insight shows its figures one line per region when they name two regions or more: the insight's first two measures per region, at most 5 regions, then "and N more regions"; figures for no single region follow as rows (D121, `TAP.panelInsights.figureLines`, shared with the Insights page). "Show me" still marks every figure. It re-renders on store changes. With `opts.noCompare: true` the panel offers no "Compare differently" (the Overview's chart, D118). With `opts.local: true` (presentation steps) the panel never takes `state.highlight`, and "Highlight on chart" from its own insight list stays inside the panel. A target from a panel's own insight list carries the finding's `measureId`, as a store target does (D79).
- `TAP.views.register(id, { title, mount(el) })`. `mount` returns `{destroy()}`. `TAP.views.get(id)` and `TAP.views.order()` read `TAP_VIEWS` (`js/engine/registry.js`).
- **The industry in focus (D105).** `opts.industryOf(cmp)` gives a panel the industry its page has in focus; `TAP.panelBuild.industryOf` takes the panel's own `opts.industryId` (a presentation step's) first, then `opts.industryOf`, then, for a one-industry report (`TAP.panelBuild.oneIndustry`: `options.industryPicker`, `dimension: 'rating'` or `{industry}` in the title), `state.industry`, then the first rated industry. It reaches the builder as `ctx.industryId`. The Market coverage view passes `industryOf` to all three charts: the industry picked (`state.industry`), else the one the regions shown disagree on most (`TAP.industryView.current`). The view has two parts, `section.tap-ind__part[data-part="all"]` (tier grid, then quadrant, both full width) and `[data-part="one"]` (a header with the view's only industry select and a line saying why that industry is shown, then the ratings grid and below it the leaders' commentary, both at full width, so the grid keeps its full column headings). `ind-ratings` has no picker of its own any more.
- **Selection, apart from "Show me" (D105, D71).** The industry in focus is marked as selected, never with the highlight's accent outline: the tier grid's row gets `is-selected`, `aria-selected="true"`, an ink bar, its ▸ marker and the word "Selected"; the quadrant rings its bubbles with an ink ring outside where a highlight ring sits (a series with `tapRole: 'selection'`, from `TAP.quadrantLabels.selection`) and names them first, in bold. The quadrant's "Every region" draws one point per region for `ctx.industryId` (per region and industry when none is in focus, as on a region profile); an old `opts.industryFilter` is ignored.
- `TAP.layers.open(name, payload)`, `close()` and `openDetails(target)` handle the side panels, one at a time. They don't block the page.
  - Built-in names: `'sources'` and `'details'`. There is no glossary panel: a term's definition shows in its popover where the term appears (D98).
  - Any other name shows `payload.title` and calls `payload.render(bodyEl)`, so for example PAGES opens the explanation panel without touching layers.
- **Esc order:** popovers handle Esc first and stop it (`preventDefault()`). Side panels listen on `window` and ignore an Esc that was already handled. Then an expanded panel closes.
- `TAP.details.build(target)` returns `{title, groups: [{title, rows: [{label, cell}]}]}` (owned by INDUSTRY; the shell draws it).

**Target** (details and highlights): `{reportId, regionIds: [], industryIds: [], accountIds: [], quadrant, mark, items, theme, figure}`. Every field except `reportId` is optional. `items` (Phase 2) names list rows (17.4); `theme` names a recurring theme for the themes report (17.7). `figure: {key, how}` (from a chart click, `TAP.shapes` `targetFn`) names the column clicked (`<measure>`, `<measure>@y2` or `<measure>@<dim>:<value>`) and, for a combined bar, how it was combined; the details panel then shows that figure first, "In this chart". `mark` says what to draw: `'industryRow'`, `'regionColumn'`, `'cell'`, `'points'`, `'quadrant'`, `'bar'` or `'ratingCell'`. It comes from the rule's `highlight` setting. `state.highlight` holds a Target.

**`measureIds` and `ratingCell` (D102).** A Target may carry `measureIds`, the measures it is about, for a chart that shows several side by side. A panel's own "Highlight on chart" fills it with every measure the insight's figures quote (`TAP.panelInsights.target`). The ratings grid (`ratingsGrid`) outlines (`is-hl`) the cells of the regions named, in the columns of `measureIds` (every column when there is none), and only while it shows one of the target's industries; it reads any mark that way, and `'ratingCell'` names it for a presentation step, e.g. `{regionIds: ['north'], industryIds: ['retail'], mark: 'ratingCell', measureIds: ['ind.references']}`. On a one-industry report (`TAP.panelBuild.oneIndustry`), "Highlight on chart" from the panel's list first switches the panel, and on the Market coverage view the industry in focus, to the insight's industry, as a picker would. A one-industry chart (`TAP.panelBuild.oneIndustry`: the ratings) counts, lists and leads with only the insights naming the industry it shows (`TAP.panelInsights.get(cmp, reportId, industryId)`); with none it shows 0, never another industry's insight. `strongRating`, `weakRating`, `groupPriority` and `notYetWinnable` attach to `ind-ratings` after their first chart, so "Show me" from elsewhere still opens the quadrant or the tier grid, and the Insights page lists each insight once.

**UI modules** (owned by SHELL unless noted):

| Function | Behaviour |
|---|---|
| `TAP.shell.mount(root, {warnings})` | Draws the banner, menu, comparison bar area and an empty view area into `root` |
| `TAP.shell.viewEl()` | The element views mount into |
| `TAP.shell.actionsEl()` | An actions slot after the Data button, at the end of the comparison bar's row (D72, D116): "Present" and "Tour". `TAP.compareBar.mount(el, {actions})` places it |
| `TAP.shell.label()` | The data status label: `{kind: 'sample'|'internal', text}`, or null. Image and table exports carry it (US-1.1.8, US-1.2.10) |
| `TAP.app.stop()` | Unmounts the running app and drops its listeners (for tests) |
| `TAP.showme.go({insightId, target})` (also `bind`, `unbind`, `widen(target, cmp, regionIds)`; a Target may carry `widened: true`) | Handles "Show me": opens the report's view, switches the comparison to All regions if the insight's regions are out of scope, sets `state.highlight`, and highlights the data; falls back to details (INTEGRATOR) |
| `TAP.keys.bind()` / `unbind()` / `viewFor(key)` | Presenting shortcuts: 1 to 4 for the views; one Esc order (popover, side panel, expanded chart) (INTEGRATOR) |
| `TAP.screens.show(root, loadResult)` | Full-page message for `loadResult.reason` (`missing`, `version`, `invalid`), with a copyable error list |
| `TAP.compareBar.mount(el)` | The comparison bar, one row (D116): "Compare", the modes and the pickers the mode needs, then the page buttons. The "Showing..." sentence is in a visually hidden live region only. On the Guide and the Overview (D118) the row holds only the buttons. Reads and writes `state.cmp` |
| `TAP.compareBar.pageButtons(slot?)` | The compact page buttons (D116): Data with the short data date (full date in its label; opens the data sources panel), Present and Tour, each an icon and a word in body text. The bar and the region profile both use it |
| `TAP.layers.top()` | The open side panel's name, or null |
| `TAP.sourcesPanel.render(el)` | The data sources panel body: imports, `TAP.notes`, insight `failures()` |
| `TAP.glossary.popover(termId, anchorEl)` / `close()` | Term popover: the term, its short definition and why it matters (CONTENT). No A to Z list (D98) |
| `TAP.explain.open(reportId, {cmp})` / `sections(reportId, cmp)` | The explanation side panel; `cmp` is a panel's own comparison when it has one. `sections` returns the content as data (PAGES) |
| `TAP.tour.offer()` / `start()` / `stop()` | The welcome card (offered by `app.start` on the real page only) / the tour itself / remove both. Also `steps()` and `fullscreen()` (PAGES) |
| `TAP.overviewCards.popover(anchor, {label, cell, unit})` | One figure in the popover beside it (D129): label, exact value, how it was combined, partial note, kind and file › sheet › cell. Card figures and the profile's glance use it; a figure standing for several (`rows`), the headline's Sources and a region's details keep the side panel (OVERVIEW) |
| `TAP.overviewCards.render(el, cmp?)` | The region cards for `cmp`, else the current scope (the Overview passes all regions, D118): a quick snapshot (D127): ambition, the swatched split (D117), Services, focus tiers, the new business pool and customers by segment, and "To discuss:" with the short form of the region's first `TAP.insights.forRegion` insight, which opens the figure popover with its sentence, why line and Show me (D130) (OVERVIEW) |
| `TAP.sourceTip.icon(src, kind, {where, label})` / `html(...)` | The data icon beside a figure (D100, `js/ui/source-tip.js`): a button, or the same as HTML text for builders that return HTML; null or `''` when there is no file behind the figure (`src` null, or combined by this app). `kind` defaults to `src.kind`; `where` replaces the address text (a list row's "file, row 12"); `label` names the figure for screen readers. Hover shows a popover with `TAP.format.kind(kind).text` and `TAP.sources.address(src).text`; click, tap, Enter or Space keeps it open; Esc or its close button closes it, before any side panel. One popover at a time. Also `where(src, opts)`, `open(btn)`, `close()`, `current()`, and `figure(anchor, title, body)`: the same popover beside a selected figure (D129), with its title, the given lines and a close button; focus moves into it and back to the figure on close; Esc, a click elsewhere or another figure closes it |
| `TAP.multiSelect.render(opts)` / `watch(scope, openId, closed)` / `field(...)` | A dropdown multi-select (D126, `js/ui/multi-select.js`): a button naming the choice ("Regions: All", "Regions: North America", "Regions: 2 selected") that opens a checklist with "All" (tick every option) and "Clear" (untick them) at the top. `opts` is `{id, label, options: [{value, label, color, count}], selected, open, onOpen(open), onChange(selected)}`; the caller keeps the state and redraws. `watch` closes the open one on an outside click or Esc (handled before any side panel, focus back on its button) and returns a stop function. Arrow keys move through the open checklist; Space ticks. `field(id, control, onPick, redraw)` draws one as a panel control, keeping the open one across redraws (D134). Used by the Insights page (`js/views/insights-filters.js`) and dropdown list filters |

**Formatting: `TAP.format`** (`js/core/format.js`). `money(v, {scale, currency})` (chart style, €1.2M; `v` is in thousands unless `scale` says otherwise), `moneyExact`, `pct(v, {exact})`, `num(v, {decimals})`, `rating(v, field)`, `tier(v)`, `cell(cell, {unit, exact, field})`, `kind(k)` (returns `{glyph, label, text}`), `date(iso, {time})`, `list(names)`. The theme's keys are documented in `js/theme.js` itself.

## 12. Insights (`js/insights/*`, `config/insight-rules.js`, `config/insight-wording.js`)

The rules are in `config/insight-rules.js` (`TAP_RULES.rules`); the wording guide, the banned words and the phrases the rule code uses are in `config/insight-wording.js` (`TAP_RULES.wording`, split out in v0.4.1 to keep each file under 300 lines). Either file may load first; each fills its own part of `TAP_RULES`.

**Rule definition** (configuration):

```js
TAP_RULES.rules.push({ id: 'consensus', family: 'priorities', enabled: true,
  description: 'Industries placed in Tier 1 or 2 by most regions.',
  reads: ['marketCoverage.tier'], params: { share: 5 / 7 },
  template: '{industry} is Tier 1 or 2 in {n} of {total} regions.',
  attach: ['ind-tiers'], highlight: 'industryRow', fallback: 'details', context: true });
```

Every rule also carries one of two fields (D111):
- `why`: one sentence on why the finding matters (the decision it moves), shown under the insight's sentence wherever it is shown. The banned-word check applies to it as to sentences: a `why` with a banned word sets the rule aside with a failure.
- `context: true`: the finding is a true background fact that moves no decision. Its insights stay out of panel lists, view headlines and the region profile, and the Insights page lists them in one closed "Context" group after the ranked groups.

Every rule that is not context also carries `short` (D130): a few words with the key figure, from the template's own placeholders ("{wins} new customers needed, {ratio} peers"), shown on the Overview card's "To discuss" line; `shorts` holds one per template variant whose placeholders differ. The insight's `short` is null when the rule has none, a placeholder is empty or a banned word shows; the card then reads "1 finding".

A rule may also carry `broad: true` (D119): it is built on the combined total of all regions (spTotal), so its findings count as organization-wide on the Overview whatever regions they name.

**Rule code:** `TAP.insights.defineRule(id, fn)`, where `fn(ctx)` returns findings. `ctx` is `{params, data, measures, agg, scores, settings}`. A finding is:

```js
{ key: 'healthcare', regionIds: [...], industryIds: [...], accountIds: [],
  vars: { industry: 'Healthcare', n: 6, total: 7 },          // fills the template
  figures: [{ label, cell, unit, field, measureId }],      // shown on demand; unit as in measure meta, field for ratings
  strength: 0.8,                                             // 0..1, how far from normal
  money: 0.12,                                               // 0..1, share of org ARR or pipeline involved
  breadth: 0.43,                                             // optional 0..1; default regionIds ÷ regions in the data
  sources: [src, ...] }
```

**Engine:** `TAP.insights.all()` is computed once against all regions. The functions built on it are:
- `ranked(cmp, {reportId, family, regionId, context, broadOnly})`: insights in scope: figure-based insights first, then the `themes` family (D80); within each group the focus region's insights first, then by significance. Context insights (D111) are left out unless `context` is `true`. `broadOnly` keeps only insights for the organization as a whole (D119, `isBroad`). `all()` uses the same order and keeps every insight;
- `top(cmp, reportId, n, opts)`: the first `n` of `ranked`, with `opts` passed on (`{broadOnly}`);
- `forRegion(regionId)`: the insights about one region, by significance: naming it, not broad, not context, not hidden. The region profile's Top insights are its first three (D128) and the Overview card's "To discuss" line its first (D130);
- `isBroad(insight)`: true when the insight names at least `TAP_SETTINGS.insights.overviewMinRegions` regions (3) or its rule is `broad`. The Overview shows only these: its top insights block, its chart panel's list (panel `opts.broadOnly`) and any view headline for it (`TAP_VIEWS.overview.broadOnly`); the region cards' "To discuss" line is the one exception (D130);
- `hide(id)` / `unhide(id)` / `hidden()`, held in session state only;
- `failures()`: rules that threw, which are shown in the data sources panel.

Significance = family weight × (0.5 strength + 0.3 money + 0.2 breadth). Breadth = regions involved ÷ regions in the data. All weights come from `TAP_SETTINGS.insights`. Normalization (D49): family weights are divided by the largest family weight (at least 1), and the three part weights by their sum, so significance always stays between 0 and 1.

Comparison rules (config `compare: true`) set `provided` on each finding: the number of regions providing the value. The minimum-regions guard reads it, and a comparison finding without it is logged as a failure. Skipped or failing rules are reported once, through `failures()`, which the data sources panel lists. They are not also added to `TAP.notes`.

The engine drops any finding built from a not-provided value. It skips comparison rules when fewer than 3 regions provide the value. It refuses sentences containing a banned word (from `TAP_RULES.wording.banned`).

Every figure carries `unit` (`'money'|'pct'|'rating'|'score'|'count'|'tier'|'text'`), and `field` when the unit is `'rating'`, so pages format it with `TAP.format.cell(cell, {unit, field, exact: true})` without guessing. Add `measureId` when the figure comes from a catalogue measure.

**Insight object:** `{id: ruleId + ':' + key, ruleId, family, sentence, why (null for context), context (boolean), broad (the rule's `broad`, boolean), short (D130, or null), figures, description, regionIds, industryIds, accountIds, significance, sources, reportId, attach, highlight, fallback, label: 'Observation to discuss'}`. `attach` lists the attached reports that exist (a rule may name reports still being built); panel lists filter on it, and `reportId` is its first. When there is no Phase 1 report, `reportId` is null and `fallback` is `'details'`: "Show me" then calls `TAP.layers.openDetails(highlight)`.

## 13. Content (`content/*`, `js/core/content.js`, `js/ui/glossary.js`)

- `TAP_CONTENT.glossary[id] = {term, aliases: [], short, why, related: [ids]}`. `TAP.content.terms()` adds `id` and `layer` (`'general'` or `'organization'`).
- `TAP_CONTENT.guide` holds the Guide page sections.
- `TAP_CONTENT.text` holds every on-screen phrase, split by owner: `content/ui-text.js` (CONTENT: app, the term popover, organization file problems) and one `content/text-<area>.js` per stream (`shell`, `engine`, `data`, `panel`, `overview`, `industry`, `pages`), each adding its own top-level keys. It covers: tour steps, headline templates, family lines, combined-figure explanations, system messages, banners, empty and missing states.
- `TAP_ORG` uses the same shape and overrides or adds keys. It also carries `settings` such as `internalLabel {show, text}`.
- `TAP.content.text(key, vars)` fills `{name}` placeholders. A missing key returns the key in brackets, so gaps are visible in testing.
- `TAP.content.term(idOrWord)` returns the merged glossary entry.
- `TAP.content.regionName(region)` returns the organization layer's short name (`TAP_ORG.regions[id]`) or the data's name. **Every label that names a region uses it.**
- `TAP.content.mark(text, seen)` returns safe HTML with the **first** occurrence of each glossary term marked. `seen` is a per-panel object, so a term is marked once per panel.

## 14. Script order (all three pages; lint compares them)

The master list is `APP` in `tools/build-pages.js`, which writes every page's script tags and the block below; run `node tools/build-pages.js` after adding or removing a script (`verify.sh` fails while a page or this block is out of step).

<!-- script-order:start (written by tools/build-pages.js) -->
```
vendor/echarts.min.js
js/theme.js
js/core/namespace.js  dom.js  icons.js  storage.js  store.js  format.js
config/settings.js
content/ui-text.js  text-shell.js  text-engine.js  text-data.js  text-panel.js  text-overview.js  text-industry.js  text-pages.js  text-engine2.js  text-newbusiness.js  text-customers.js  text-profile.js  text-themes.js  text-present.js  text-custom.js  text-extra.js  text-outlook.js  glossary.js  glossary-p4.js  guide.js
   [index.html only: content/organization.js]
js/core/content.js
   [data file: data/plan-data.js | data/sample-plan-data.js | tests/fixtures/mini-data.js]
js/core/sources.js  check.js  check-rows.js  extra.js  check-p4.js  data.js
js/engine/registry.js  aggregate.js  scope.js  measures.js  scores.js  measures-p2.js  measures-pt.js  measures-p4.js  measures-p4b.js  rows.js  shapes.js  prepare.js  build-compare.js  build-parts.js  build-xy.js  build-list.js  custom.js  build-custom-one.js
config/reports.js  reports-overview.js  reports-industry.js  reports-newbusiness.js  reports-customers.js  reports-partners.js  reports-themes.js  reports-outlook.js  views.js  profile.js  running-order.js  custom-topics.js  comment-themes.js  insight-rules.js  insight-wording.js
js/reports/tier-stats.js  tier-grid.js  quadrant-labels.js  quadrant.js  ratings-grid.js  details.js  details-rows.js  cg-builders.js  nb-grid.js  nb-levers.js  row-bubble.js  themes.js  stack-draw.js  dim-stack.js  pt-books.js  outlook-side.js  outlook-side-draw.js  outlook-coverage.js
js/insights/engine.js  util.js  rules-priorities.js  rules-judgement.js  rules-assumptions.js  rules-realism.js  rules-exposure.js  rules-capability.js  rules-plan.js  rules-shared.js  rules-themes.js  rules-outlook.js
js/panel/panel-chart.js  panel-table.js  panel-menus.js  panel-export.js  panel-insights.js  panel-expand.js  panel-drill.js  panel-build.js  panel.js
js/ui/shell.js  compare-bar.js  layers.js  sources-panel.js  system-screens.js  glossary.js  source-tip.js  explain.js  tour.js  showme.js  keys.js  view-head.js  multi-select.js  present-steps.js  present-record.js  present.js
js/views/overview-cards.js  overview.js  industry.js  new-business.js  customers.js  partners.js  outlook.js  other.js  regions-parts.js  regions.js  insights-filters.js  insights.js
js/ui/custom-measure-picker.js  custom-controls.js  custom-builder.js
js/views/build.js  guide-cards.js  guide.js
js/ui/app.js
```
<!-- script-order:end -->

`tests.html` then adds the harness, `tests/auto-cases.js`, the fixtures and the `tests/test-*.js` files.

## 15. CSS

- `css/base.css` (lead): reset, typography and the Modernist base styles. It reads only the CSS variables that `js/theme.js` writes onto `:root` (`--tap-*`).
- One stylesheet per stream: `css/shell.css` and `layers.css` (SHELL), `glossary.css` (CONTENT), `panel.css` (PANEL), `overview.css` (OVERVIEW), `industry.css` (INDUSTRY), `pages.css` and `guide.css` (PAGES; the Guide's own since D139). `source-tip.css` styles the data icon and its popover (D100).
- No colour literals and no `px` font sizes outside `js/theme.js` and `css/base.css`.

## 16. Ownership

| Area | Owner |
|---|---|
| `docs/ARCHITECTURE.md`, `docs/AGENT-BRIEF.md`, the three HTML pages, `css/base.css`, `js/core/namespace|dom|icons|storage|store|data.js`, `js/engine/registry.js`, `config/settings.js`, `config/reports.js`, `config/views.js`, `js/ui/app.js`, `tests/test-contracts.js`, `tests/test-meta.js`, `tests/fixtures/mini-data.js` | lead |
| `js/theme.js`, `js/core/format.js` | lead (Wave 0, #10 and #18) |
| `tests/test-<area>.js` and the fixtures `sample-expected.js`, `broken-cases.js`, `insights-fixture.js` | the stream named in each file's header (already listed in `tests.html`) |
| everything else | the stream named in the build plan |

A stream that needs a change in a lead-owned file asks for it in its PR description under "Contract changes". It does not make the change itself.

## 17. Phase 2 additions

Phase 2 adds three report views, a region profile, list reports, more breakdowns, drill-down and new insight rules. Everything above still holds; this section adds to it. The Data Contract is unchanged except for additions (D57).

### 17.1 Views and routing

| View id | Menu title | Question (title) | Reports, in order | Owner |
|---|---|---|---|---|
| `newBusiness` | New business | Where will new business come from? | `nb-industries`, `nb-channels`, `nb-levers`, `nb-rows`, `nb-themes` | NB (`nb-themes`: INSIGHTS2) |
| `customers` | Customer growth | How will existing customers grow? | `cg-segments`, `cg-growth`, `cg-exposure`, `cg-bubble`, `cg-accounts` | CGP |
| `partners` | Partners | Which partners carry each plan? | `pt-reliance`, `pt-capacity`, `pt-list` | CGP |
| `regions` | Regions | the region's name | from `config/profile.js` (`TAP_PROFILE.reports`) | PROFILE |

- Menu order: `overview`, `industry`, `newBusiness`, `customers`, `partners`, `regions`, `insights`, `guide`. Number keys 1 to 8 follow it.
- **State:** `state.region` is the region shown on the Regions view, or null (list of regions to pick from). Setting it does not raise `scopeEpoch`.
- **Frame hook:** the shell sets `data-view="<view id>"` on the `.tap-app` root, so a view's stylesheet can adjust the frame (the Regions view hides the comparison bar).
- **Details actions:** `TAP.details.build` may return `actions: [{id, label, href}]`, drawn as links under the details title ("Open profile").
- **Address bar:** `#regions/<id>` opens a profile; `#regions` the picker. `js/ui/app.js` keeps the address bar and `{view, region}` in step, so the back button works.
- A view still being built may list report ids that don't exist yet; `X-contract-reports` allows that only while stubs remain.

### 17.2 The view header: `TAP.viewHead` (`js/ui/view-head.js`, lead)

- `render(el, {viewId, kicker, title, lead})` draws the header and returns `{el, tipEl, refresh(), destroy()}`. It shows the kicker, the question as `h1`, the lead line, an empty tip slot (`tipEl`, filled by PAGES2 for US-2.6.2) and the **headline**.
- **Headline:** `headline(viewId, cmp)` returns the most significant insight attached to any report in `TAP_VIEWS[viewId].reports`, in scope, not hidden. The header shows its sentence, its line on why it matters (D111) and a "Show me" button that emits `showme`. With no insight, the headline line is hidden. Panels have no takeaway (D120), so the headline is never left out for repeating one (D83 retired).
- `mountPanel(slot, reportId, opts)` mounts a panel and shows the error in the slot if it can't. `pair([slotA, slotB])` is the two-panel row (D24). Page column class: `tap-vh-page`; slot class: `tap-vh-slot`.
- Views put their wording in their own `content/text-*.js` and their layout in their own CSS; `css/view-head.css` holds only the shared parts.

### 17.3 Breakdowns (US-2.7.5, ENGINE2)

- Dimensions: `year`, `industry`, `channel`, `motion`, `segment`, `risk`. A measure lists the ones it supports in `meta.dims`; the panel offers only breakdowns that are both in the report's `breakdowns` and in the selected measure's `dims`.
- Measure context keys: `{year, industryId, channel, motion, segment, risk}`. `channel` is a `lookups.channels` id; `motion` is `'nb'` or `'cg'`; `segment` is a `lookups.segments` id; `risk` is `'high'`, `'medium'` or `'none'`.
- `TAP.prepare.run` adds one column per breakdown value. Year columns keep the key `<id>@y1..3`; the others use `<id>@<dim>:<value>`, with `column.breakdown = {dim, value, label}`. Industry values are the industries with a value for some entity in scope; the others are fixed lists.
- `compare` draws grouped bars; `parts` draws one stack per entity and breakdown value. Every group is labelled.
- One region only (D125): `TAP.reports.BREAKDOWN_META` describes what a dimension needs, and `TAP.reports.oneRegion(dim)` is true for one flagged `oneRegion: true` (`industry` and `solution`, the dimensions with more than six categories in the sample; `risk` and `partnerType`, with three values each, are offered with any number of regions, D142). The panel offers a flagged option only while `TAP.scope.entities(cmp)` is one region entity; otherwise the option stays visible with `aria-disabled="true"` and the note "One region only" beside the control (`TAP.panelBuild.held(def, entities, dim)`). A flagged breakdown on while several regions show (the comparison widened, a step or `opts.initial` asked for it) falls back to no breakdown, with one line under the controls (`.tap-panel__bd-note`) until the next change. Custom charts (Build a chart) are left alone.

### 17.4 List reports (US-2.7.2; engine ENGINE2, panel PANEL2)

**Definition** (`shape: 'list'`, builder `list` by default, `types: ['list']`, `defaultType: 'list'`, no `measures`):

```js
TAP_REPORTS['cg-accounts'] = {
  id: 'cg-accounts', view: 'customers', title: '...', explain: {...},
  shape: 'list', defaultType: 'list', types: ['list'],
  rows: 'accounts',                       // 'newBusiness' | 'accounts' | 'partners'
  columns: [{ key: 'region' }, { key: 'name' }, { key: 'segment' }, { key: 'incr3', label: '3-year incremental ARR' }],
  sort: { key: 'incr3', dir: 'desc' },    // default sort; a list of these sorts by each in turn
  filter: [{ key: 'segment', label: 'Segments', multi: true }, { key: 'riskLevel', label: 'Risk', multi: true }],   // optional; multi: a dropdown (D134)
  sources: ['IN', 'PRE', 'DER'], breakdowns: [], options: {}
};
```

**Row figures: `TAP.rows`** (`js/engine/rows.js`, ENGINE2)
- `list(source, regionIds)` returns `[{id, key, regionId, source, sourceRow, item}]` in region file order, then source row order. `key` is the `sourceRow`, or `p<position>` when the row number is missing, not whole, or already used earlier in that section; `id` is `<regionId>:<key>`. List rows, click targets (`items[].row`), highlights, details and row bubbles all use the key, so every row stays its own. The check warns about repeated row numbers.
- `cell(source, key, row)` returns a full cell (section 7) with `src: {regionId, section, field, row, kind}`. Text, money, percentages and counts all come back as cells, so the list, details and bubbles format them the same way.
- `columns(source)` returns `[{key, unit, kind, label}]` for every key a list can show:
  - `newBusiness`: `region`, `industry`, `tier`, `subVertical`, `market`, `targetAccounts`, `hitRate`, `avgDealSize`, `wins`, `arr3`, `services3`, `successFactors`, `alsoTargeted` (APP: the other regions naming the same sub-industry).
  - `accounts`: `region`, `name`, `industry`, `country`, `productLine`, `segment`, `riskLevel`, `currentArr`, `growthY1`, `growthY2`, `growthY3`, `multiplier3y`, `incr3`, `oi3`, `servicesRatio`.
  - `partners`: `region`, `name`, `channel`, `maturity`, `expertiseGeo`, `expertiseProduct`, `fteSales`, `fteConsultants`, `fte`, `centralSupportPct`, `arr3`, `services3`, `oiPerFte` (APP), `alsoNamed` (APP).
- `matchKey(text)` gives the key two names are matched on: trimmed, lower case, inner spaces collapsed (US-2.1.5, US-2.3.4, US-2.5.3).

**The `list` builder** (`js/engine/build-list.js`, ENGINE2) returns the usual result plus:
- `html`: a `table.tap-list` with a header button per column (`data-tap-opt="sort" data-tap-value="<key>:<asc|desc>"`) and one `tr` per row carrying `data-tap-region` and `data-tap-row="<source>:<regionId>:<sourceRow>"`. Every value passes through `TAP.dom.esc`. Highlighted rows (`ctx.highlight.items`) carry `is-highlight`.
- `table`: the same rows and columns, for the table export and copy.
- `controls`: one `select` per filter (`key: 'filter:<key>'`), with "All" first. A filter with `multi: true` is a dropdown instead (D134): `{key, kind: 'multi', label, value: [values ticked], options: [{value, label, count}]}`, none ticked meaning all; each option counts the rows it would list within the other filters. A single value stored from before still counts as ticked. The panel draws it with `TAP.multiSelect.field(id, control, onPick, redraw)`, which keeps the open dropdown across the panel's redraws.
- `target(params)` maps a row click to `{reportId, regionIds: [r], items: [{section, regionId, row}]}`.
- **Scope:** rows come from `TAP.scope.regionIds(cmp)`. In `one` (and an old `pair`) the focus region's rows come first. `set` shows only the selected regions; `all` and `org` show every row.
- **Drill context:** with `ctx.drill` (a Target from the level above, 17.6), rows are filtered to its `regionIds` and `industryIds`.

**Agreed details (PANEL2 and ENGINE2):**
- Row clicks: the panel calls `result.target({data: {regionId, industryId, row}})`, where `row` is the clicked row's `data-tap-row` string, then `TAP.layers.openDetails(target)`. Source `accounts` maps to section `customerGrowth` in `items`.
- Sorting: a click on `[data-tap-opt]` sets `ctx.opts[key]` to the `data-tap-value` string (`"incr3:desc"`); the builder writes the next direction on each header.
- Value kinds (US-2.6.4): the panel adds the kind glyph and word to list headings from `result.table.columns[i].kind`; the builder puts `data-tap-col="<key>"` on each `th` and never draws kinds itself. Builder HTML is the table only; the panel draws the copy button, row count and glyph key around it.
- `defaultBreakdown` in a definition is the breakdown the panel starts with (and returns to when `scopeEpoch` changes).
- Row bubbles (`rowBubble`) name `TAP.rows` column keys in `x`, `y` and `size`; `TAP.reports.measureIds` skips them when `def.rows` is set. `TAP_SETTINGS.rowBubble.labelMax` (10) sets how many carry a label. D133: `options.topPerRegion: n` draws, with more than one region, only each drawn group's `n` rows with the largest `y` (a region, or the combined rest in One vs the rest), with one line under the chart naming `n` and every row in scope; the table lists the rows drawn. `options.oneRegionColors: 'risk'` colours every row of a single region by its `riskLevel` from `TAP_THEME.risk`, with a legend of the levels present. `cg-bubble` sets `topPerRegion: 5` and `oneRegionColors: 'risk'`. D137: `options.topBy: [column keys]` ranks the top rows by the sum of those columns instead of `y` (a blank column counts as nothing); `options.names: 'beside'` puts every named row's name beside its bubble (the nearest spot clear of other names, else to the right) with no numbered key; `oneRegionColors: 'channel'` colours one region's rows by `channel` from `TAP_THEME.channels` (a row with no channel takes the focus grey, keyed "Channel not provided"). `pt-capacity` sets `topPerRegion: 5`, `topBy: ['arr3', 'services3']`, `names: 'beside'` and `oneRegionColors: 'channel'`.
- CGP's wrappers `cgSegments`, `cgGrowth`, `cgExposure` live in `js/reports/cg-builders.js`.
- `TAP.rows` also gives `section(source)` (the Data Contract section of a row source) and `rowSrc(...)`; "also" cells (`alsoTargeted`, `alsoNamed`) carry `regionIds`.
- A target item may have `row: null`: it means the region's whole section (for example the customer growth thresholds), not one row.
- "Show me" on a list highlights the matching rows (`is-hl`) and scrolls the list to the first; it doesn't filter (D71). Insight rules that point at list rows use highlight mark `null` and carry `items`.
- The banned-word check skips the workbook names an insight quotes (`partner`, `subIndustry`, `regions`).

**Panel** (PANEL2): `type: 'list'` hides the chart type menu and the table switch. Clicks on any `[data-tap-opt]` element in builder HTML set `ctx.opts[key] = value` and rebuild (generic, not list-specific). Clicks on `[data-tap-row]` open details with the builder's target. The list header row is sticky and the body scrolls inside the panel.

**Details for rows:** `TAP.detailsRows.build(target)` (`js/reports/details-rows.js`, CGP) is called by `TAP.details.build` when `target.items` is set. It lists every field of the item with its source, using `TAP.rows.cell`.

**Target** gains `items: [{section, regionId, row}]` (`section`: `newBusiness`, `customerGrowth` or `partners`; `row`: the `sourceRow`).

### 17.5 Phase 2 measures (`js/engine/measures-p2.js`, ENGINE2)

All return cells as in section 9; ids other streams may rely on:

| Id | Meaning | valueKind / kind | dims |
|---|---|---|---|
| `rc.<m>.<t>` (`m`: `nb`, `cg`, `all`; `t`: `arr`, `services`, `oi`) | Recap order intake for a motion and type, all channels | amount / DER | year, channel (+ motion for `all`) |
| `rc.<m>.<t>.<channel>` (`direct`, `partner`, `allianceA`, `allianceB`) | The same for one channel: the stacked parts | amount / DER | year |
| `rc.share.<channel>` | Share of total order intake (both motions) through that channel; combined from summed parts | rate / APP | year |
| `nb.oi` | New business ARR plus services potential | amount / APP | year, industry |
| `nb.<t>.tier1`, `nb.<t>.tier2` (`t`: `arr`, `services`, `oi`) | New business in the region's Tier 1 or Tier 2 industries | amount / DER | year |
| `ind.nb.services`, `ind.nb.oi` | New business services, and order intake, in one industry (`ctx.industryId`); `ind.nb.arr` exists | amount / DER | year |
| `cg.accounts` | Accounts in the plan | count / PRE | segment, risk |
| `cg.currentArr` | Current ARR of the accounts (same figure as `cg.baseArr`) | amount / PRE | segment, risk |
| `cg.oi3` | Three-year order intake (`cumulativeOrderIntake`) | amount / DER | segment, risk |
| `cg.seg.<s>.<v>` (`s`: segment id; `v`: `accounts`, `arr`, `oi`) | The parts for the segment mix | count or amount | risk |
| `cg.growth.<s>` (`s`: `all` or a segment id) | Growth % for plan year `ctx.year` = incremental ARR ÷ current ARR over the accounts (the `cg.growthY*` rule); year null = three-year incremental ARR ÷ current ARR | rate / APP | year |
| `cg.multiplierAccounts` | Accounts planned with a three-year multiplier | count / IN | segment |
| `cg.top3Share`, `cg.riskShare` | Share of three-year incremental ARR in the top 3 accounts, and in high or medium risk accounts. **Combined over the combined accounts**, never by averaging shares (D60) | rate / APP | — |
| `pt.count`, `pt.fte`, `pt.arr`, `pt.services`, `pt.oiPerFte` | Partners named, sales plus consultant FTE, three-year ARR and services, order intake per FTE (partners with FTE only) | count, count, amount, amount, rate / IN or APP | year (`pt.arr`, `pt.services`) |
| `amb.nbShare` | Share of three-year ARR ambition from new business; combined from summed parts | rate / APP | — |

`TAP.measures.combined` keeps working for every id; shares and ratios that must be combined from parts say so in their meta (`combine: 'ratioOfSums'`) and `combined` honours it. Row-weighted rates (`nb.hitRate`, `nb.avgDealSize`, `nb.growthY2/3`, `nb.servicesRatio`) carry `combine: 'rowWeights'`: a region's cell keeps `ratio: {num, den}`, rows with a value but a blank weight are left out and the cell is partly provided, and a combined figure weighs each region by the `den` its own figure used (D78). A report's `options.weights` still overrides.

### 17.6 Drill-down (US-2.7.1, PANEL2)

- A definition may carry `drill: { next: '<reportId>', label: '<level name>', rootLabel: '<chart short name>' }`. Clicking a mark whose target names at least one region opens `next` in the same panel, with `ctx.drill` set to that target. The child report may itself have `drill`. `rootLabel` (optional, D123) is the chart's short name ("Industries by region"): the breadcrumb's first step and the back button's words one level down; the report's title when left out.
- The panel keeps the level stack and draws a breadcrumb of buttons in its header ("Industries by region › Healthcare, North America"; the current step is marked `aria-current`); Backspace or Alt + Left goes up one level while the panel has focus. A change of comparison or view returns to the top level.
- While drilled (D123) the panel also shows a band across the top of its header ("Drilled in: step 2 of 2"), a level heading under the question naming what was selected and what is shown ("North America · Healthcare: the 3 new business rows behind it", from the target's regions, industry, solution or builder label and, for a list, its row count), and a "← Back to <level above>" button first under the header. Wording: `panel.drill*` in `content/text-panel.js`.
- A step keeps the panel's top where it was on screen (or just under the sticky bar if it was above it) and moves focus with `preventScroll` (D110): to the back button after a step down; after a step up to the element that was selected, else the panel title.
- Reports without `drill` keep the Phase 1 click (details). `TAP.panelDrill.create(panel)` returns `{push(target, def, from), up(), top(), path(), back(), band(), heading(def, res), destroy()}`.

### 17.7 Phase 2 builders and rules

| Builder | File | Owner | Used by |
|---|---|---|---|
| `list` | `js/engine/build-list.js` | ENGINE2 | every list report |
| `nbLevers` | `js/reports/nb-levers.js` | NB | `nb-levers` (bars and dots through `compare`, plus the bubble) |
| `nbGrid` | `js/reports/nb-grid.js` | NB | `nb-industries` (grid by tier, tier shown in each cell) |
| `rowBubble` | `js/reports/row-bubble.js` | CGP | `cg-bubble`, `pt-capacity`: one bubble per row; definition fields `rows`, `x`, `y`, `size` name `TAP.rows` column keys |
| `themes` | `js/reports/themes.js` | INSIGHTS2 | `nb-themes` |

`compare` reports may set `options.refLines: [{value, label}]` (ENGINE2 draws them as labelled lines, e.g. the exposure thresholds).

**Insight rules (INSIGHTS2):** new families `plan`, `shared`, `themes` (weights in `TAP_SETTINGS.insights.familyWeights`).

| Rule id | Family | File | Attach |
|---|---|---|---|
| `channelReliance` | plan | `rules-plan.js` | `pt-reliance`, `nb-channels` |
| `planMakeup` | plan | `rules-plan.js` | `ov-ambition` |
| `sharedSubIndustry` | shared | `rules-shared.js` | `nb-rows` |
| `sharedPartner` | shared | `rules-shared.js` | `pt-list` |
| `partnerCapacity` | shared | `rules-shared.js` | `pt-capacity` |
| `partnerLoad` (D112) | shared | `rules-shared.js` | `pt-capacity`, `pt-reliance` |
| `servicesDelivery` (D112, optional: reads the Phase 4 `servicesFromPartners`) | plan | `rules-plan.js` | `pt-reliance`, `pt-books` |
| `recurringTheme` | themes | `rules-themes.js` | `nb-themes` |

**D112 (v0.4.1)** also adds two rules to Phase 1 families: `industryCover` (realism, `rules-realism.js`; `ind-tiers`, `nb-industries`; not the quadrant, whose three slots stay with its own findings), a Tier 1 or 2 industry's year-1 goal against its whole pipeline and the pipeline created in 12 months, one insight per region (two or more industries are counted in one sentence that names the two largest goals, D121), which replaces `noPipeline` and `priorityNoPipeline`; and `priorityVsPlan` (priorities, `rules-priorities.js`; `ind-tiers`, `nb-industries`), a priority holding a small share of its regions' new business plan, reading the `consensus` share. Each new rule carries a `why` line (D111).

**Recurring themes:** `window.TAP_COMMENT_THEMES = {minRegions, themes: [{id, label, keywords: []}]}` (`config/comment-themes.js`). `TAP.themes.all()` returns `[{id, label, keywords, regions: [{regionId, quotes: [{text, src}]}]}]` ranked by number of regions; `match(text)` returns the theme ids a text mentions (whole words, any case).

### 17.8 Phase 2 ownership

| Stream | Owns |
|---|---|
| ENGINE2 | `js/engine/*` except `registry.js`; `content/text-engine2.js`; `tests/test-measures-p2.js`, `tests/test-rows.js`, `tests/fixtures/mini-p2*.js` |
| PANEL2 | `js/panel/*`, `css/panel.css`, `content/text-panel.js`, `tests/test-list.js`, `tests/test-panel.js` |
| NB | `js/views/new-business.js`, `js/reports/nb-grid.js`, `js/reports/nb-levers.js`, `config/reports-newbusiness.js`, `content/text-newbusiness.js`, `css/newbusiness.css`, `tests/test-newbusiness.js` |
| CGP | `js/views/customers.js`, `js/views/partners.js`, `js/reports/row-bubble.js`, `js/reports/details-rows.js`, `config/reports-customers.js`, `config/reports-partners.js`, `content/text-customers.js`, `css/customers.css`, `tests/test-customers.js`, `tests/test-partners.js` |
| INSIGHTS2 | `js/insights/*`, `config/insight-rules.js`, `content/text-themes.js`, `css/themes.css`, the Phase 1 insight tests (`tests/test-insights.js`, `test-rules.js`, `test-ranking.js`, `test-guardrails.js`), `config/comment-themes.js`, `config/reports-themes.js`, `js/reports/themes.js`, the sample data generator (`tools/sample-*.js`, `tools/generate-sample-data.js`), `data/sample-plan-data.js`, `docs/PLANTED-CASES.md`, `tests/fixtures/sample-expected.js`, `tests/test-insights-p2.js` |
| PROFILE (wave B) | `js/views/regions.js`, `js/views/regions-parts.js`, `config/profile.js`, `content/text-profile.js`, `css/profile.css`, `tests/test-profile.js`; also the "Open profile" links in `js/views/overview-cards.js` and `js/reports/details.js` |
| PAGES2 (wave B) | `content/glossary.js`, `content/guide.js`, `content/ui-text.js`, `content/text-pages.js`, `js/ui/tour.js`, `js/ui/keys.js`, `js/views/guide.js`, the tip line in `js/ui/view-head.js` (by request), `README.md`, `docs/*` except ARCHITECTURE and AGENT-BRIEF, `tests/test-pages-p2.js` |
| lead | as section 16, plus `js/ui/view-head.js`, `css/view-head.css` |

## 18. Phase 3 additions

Phase 3 adds presentation mode, custom charts, extra template sections, the handover pack and the portfolio edition. Everything above still holds. Decisions: D65 to D68 and D70.

### 18.1 Views

- Menu order: `overview`, `industry`, `newBusiness`, `customers`, `partners`, `other`, `regions`, `insights`, `guide`. As built today (`config/views.js`, D115): three groups, `groups.start` (`overview`, `regions`), `groups.data` (`industry`, `newBusiness`, `customers`, `partners`, `outlook`, `other`) and `groups.tools` (`insights`, `build`, `guide`); every view is in exactly one group and `order` is the groups one after the other. Number keys 1 to 9, then 0 for the tenth item (D90), none for an eleventh.
- `other` ("Other sections", US-3.2.2) is shown only when the data has extra sections. A view spec may carry `available()`; `TAP.views.order()` leaves out a view whose `available()` returns false. Number keys follow `order()`.
- "Build a chart" (US-3.5.1) is its own view, `build` (`js/views/build.js`, address `#build`), just before the Guide. The two sit together at the right end of the top bar, apart from the plan views (D94, D96), in one group (`.tap-menu__tools`) that wraps as a whole when the menu needs a second line (D104). It was a Guide section until D96.
- The menu (`js/ui/shell.js`, D115) draws one list per group (`ul.tap-menu__group[data-group]`, named by `menu.groups.*` in `content/text-shell.js`) inside the one `nav[data-tour="menu"]`, with Insights joining the tools group. On one row the centre group is centred on the bar; the right group starts as wide as the brand (`--tap-menu-offset`, measured by the shell). On a narrow bar (container queries in `css/shell.css`) the start and tools groups share the first line and the plan views take the second.
- **Guide extras:** other streams add Guide sections with `TAP.guideExtras.push({id, title, render(el)})` at load time (the running order, "Your presentation" on screen, US-3.1.3). `js/views/guide.js` draws each whole in its own card (`data-guide` is its id, across both columns) after the sections of "How to use this app", and lists it in the Guide's contents; one that throws shows its error in its own card. `render` may return `{destroy()}`, which the Guide calls when it is unmounted.
- **The Guide's layout (D139):** a sticky contents list on the left ("Search the guide", then the two parts with a link per section; the section in view carries `aria-current`) and the sections as cards in two columns on the right (`js/views/guide-cards.js`), one column below about 1100 px wide or at 150% zoom. A card shows its first paragraph; "Read more" (`aria-expanded`) opens the rest in place. The search keeps the sections whose title or text holds every word. `TAP.guide.open(sectionId)` opens the Guide at a section, with its card open and focus on its heading; the address `#guide/<sectionId>` does the same (the app then shows `#guide`), and the tour's "Open the Guide" lands on the section about what territory account planning is. Printing gives one column with every card open.

### 18.2 Running order and presentation mode (Epic 3.1, PRESENT)

On screen the running order is called a presentation, and `config/running-order.js` the presentation file (D97); the code keeps the technical name.

**`config/running-order.js`** sets `window.TAP_RUNNING_ORDER = { steps: [...] }`. A step:

```js
{ title: 'Where the money sits',          // optional; an insight step uses the insight sentence
  report: 'nb-industries',                // or insight: '<insight id>', or custom: {measure, by, type}
  measure: 'nb.arr', type: 'heatmap', breakdown: null,
  cmp: { mode: 'one', focus: 'north', restAgg: 'average' },   // optional; merged over the defaults
  highlight: { regionIds: ['north'], mark: 'bar' } }          // optional Target
```

A step's `cmp.mode` is `'all'`, `'set'` (one region or more) or `'one'`; an old `'pair'` with `focus` and `second` is read as `'set'` with those two regions (D99), an old `'org'` as `'all'` (D114), and recording never writes either. A step on an Overview chart (`ov-ambition`) shows every region whatever its `cmp` says, with no comparison menu (D118). A step may also set `industry: '<industry id>'` (one-industry reports such as the ratings). `type: 'table'` shows the table view and `breakdown: 'none'` starts with no breakdown; recording writes all three when they apply. `opts.initial` accepts the same: `type: 'table'`, `breakdown: 'none'` and `industryId`.

- `TAP.present.check(steps)` returns `{ok: [...], skipped: [{index, reason}]}`; skipped steps go to `TAP.notes` with source `'presentation'` (a new notes source; the data sources panel lists it, PRESENT adds that).
- `TAP.present.start(steps?)` saves `{view, expanded}` and the page scroll, then shows each step in the expanded panel. `next()`, `prev()`, `first()`, `stop()`, `current()`. `stop()` restores what was saved. `TAP.keys.unbind()` (and so `TAP.app.stop()`) ends a running presentation.
- While presenting, `TAP.present.active()` is true and presentation mode owns Space, Right, Left, Backspace, Home and Esc (after a popover's Esc). It turns the panel's own keys off with `TAP.panelDrill.keys(false)` on start and back on at stop (`TAP.panelKeys.enabled` is checked by the drill keys, the panel menu Esc and the expanded-panel keys) (D70).
- A step shows its report in a full-screen presentation layer of its own (`TAP.panel.create` in that layer, with `opts.cmp` and `opts.initial`), not in the view's panels.
- A step's comparison and highlight go to the step's own panel only: the comparison as `opts.cmp`, the highlight through the panel handle's `highlight(target)`. Presentation never writes `cmp` or `highlight` to `TAP.store`, so `scopeEpoch` doesn't move and the charts behind the layer keep their drill level, own comparison and choices (D74). Only `expanded` is set, to the step's report.
- Progress row: "Step n of m" and the step title, at least 16 px.
- **Recording (US-3.1.3):** `TAP.present.record(step)`, `recorded()`, `move(i, d)`, `remove(i)`, `clearRecorded()`, `asFileText()`; kept through `TAP.storage` key `runningOrder.recorded`. The panel menu's "Add to presentation" calls `record` with the panel's current state.

### 18.3 Custom charts (Epic 3.5, CUSTOM)

- `TAP.custom.options()` returns `[{measureId, label, dims: [...], unit, valueKind}]` for measures whose `valueKind` is not `text` or `category`.
- **The spec (D140):** `{ask, measure, by, type, region?}`. `ask` is the question the chart starts from: `'regions'` (one bar per region, `by: 'entity'`, following the comparison bar), `'one'` (one region, named in `region`, split by a dimension of the measure in `by`; the comparison bar is ignored) or `'years'` (a bar per plan year for each region compared, `by: 'year'`). `type` is `'bar'` or `'table'`. An older spec `{measure, by, type}` still reads: `TAP.custom.askOf(spec)` derives the question from `by`, a `type` of `'dot'` or `'groupedBar'` reads as the bars, and a `'one'` spec with no `region` follows the comparison as it did. `TAP.custom.byFor(by, ask)` and `fits(by, ask)` say what a measure offers for a question; `TAP.custom.ASKS` lists the three.
- `TAP.custom.definition(spec)` returns a report definition (`id: 'custom:<measure>:<by>'`, plus `:<region>` for one region; `custom: true`; shape `compare`, by entity, with the plan years as a breakdown, or with the measure's dimension as its breakdown), or `{errors}`. It passes `TAP.reports.validate` before use. `def.spec` is the spec in full (what a running-order step and the kept charts store). A one-region definition carries `def.cmp` (`{mode: 'set', set: [region]}`), which the builder passes as `opts.cmp` with `noCompare`, and a presentation step takes unless the step writes its own `cmp`; its builder is `customOne` (`js/engine/build-custom-one.js`: one bar per value in the region's colour, largest first with the value on the bar, plan years in their order, and a table with one row per value; with several regions it hands over to the compare builder). `types` is `[chart, 'table']`: `bar`, or `groupedBar` for the plan years; the dot plot is never offered.
- The panel accepts a definition object instead of an id: `TAP.panel.create(el, def, opts)` registers it in `TAP_REPORTS` under `def.id` first (`TAP.panelDrill.reportOf`). The "Custom chart" badge when `def.custom` is drawn by the panel (CUSTOM asks PANEL-file changes through the lead, or makes them under "Files outside ownership" when small).
- `opts.initial: {type, measureId, breakdown}` sets a panel's starting choices (`TAP.panelDrill.initial`); presentation steps use it.
- Session list: `TAP.custom.saved()`, `save(spec)` (refuses a seventh; the same chart twice is kept once, compared on the full spec), `remove(i)`; held in memory only. On screen the kept charts are a row of chips at the top of the view ("Your charts", `.tap-custom__kept`): each chip reopens its chart (`[data-custom-open]`) and has a × with an accessible name (`[data-custom-remove]`).
- **The builder (D140):** `js/ui/custom-builder.js` (`TAP.customBuilder.render(host, opts)`) draws the chips, the controls on the left (`js/ui/custom-controls.js`, `TAP.customControls`: `render`, `fit`, `choices`, `listFor`, `presetRegion`) and the chart panel beside them, redrawn at every change; two columns from 1232 px wide (controls 400 px, the chart at least 760 px), stacked below that with the chart under the controls. Controls, in order: "What do you want to see?" (`[data-control="custom-ask"]`, three buttons with a line of help each), for one region a Region dropdown (`select[data-control="custom-region"]`, preset to the one region the comparison bar shows, else the first in the data, with a note that the bar is ignored) and By (`[data-control="custom-by"]`, the measure's own dimensions, labels from `panel.breakdowns.*`), the measure picker narrowed to the question, then Show as (`[data-control="custom-type"]`: `bar`, `table`). Changing the question keeps the measure when it still fits, else takes the first key measure of the topic on screen. `TAP.customControls.fit(spec, all, topic)` is the rule; `spec()` on the handle returns `def.spec`.
- **Measure picker (D122):** `js/ui/custom-measure-picker.js` (`TAP.customPicker`: `render(list, current, state, onPick)`, `topicOf(id)`, `topics(list)`) draws the Measure picker: a "Find a measure" search box, topic buttons (`[data-control="custom-topic"]`) and the topic's measures as radios (`input[data-custom="measure"]`, one group). `config/custom-topics.js` sets `window.TAP_CUSTOM_TOPICS`, `[{id, prefixes, ids, key}]` in screen order: a measure belongs to the topic naming it in `ids`, else to the one holding its id's first part; one no topic claims shows under "Other measures". A topic shows its `key` measures (5 to 10, those the data has and that fit the question) with the current measure first when it is not a key one; "Show all N measures in <topic>" lists the rest A to Z. Search matches every typed word in the plain name and lists the hits under topic headings. A topic with no measure left is not shown. The builder keeps the picker's `{topic, expanded, query}` across its redraws; a measure set from elsewhere (a spec, a kept chart) brings its own topic.
- As built: options also carry `by`, `kind` and `short`; `TAP.custom` also gives `types(ask)` (an older `by` is accepted) and `byLabel(by)`; `by` may be any of `TAP.reports.BREAKDOWNS` the measure lists; per-industry figures are recognised by the `ind.` id prefix and fit "Break one region down" by industry only; panels for custom charts are created with `opts.initial.type` from the spec.

### 18.4 Extra sections (Epic 3.2, EXTRA)

- Data Contract addition: `meta.extraSections: [{id, title, intro, columns: [{key, label, unit, kind, column}]}]` (`column`, the worksheet column letter, is optional); per region `extra: {<sectionId>: [{sourceRow, <key>: value}]}`.
- `TAP.check.run` checks them and only warns.
- `TAP.rows` gains the row source `extra:<sectionId>` with the section's columns; `TAP.sources.address` names the section title as the sheet.
- The `other` view builds one `list` definition per section at mount time.
- `js/core/extra.js` (`TAP.extra`, loaded after `check.js`) holds the data side: the cleaned sections, their rows and cells for `TAP.rows`, the source map for `TAP.sources` and the warnings for `TAP.check`.

### 18.5 Ownership (Phase 3)

| Stream | Owns |
|---|---|
| PRESENT | `config/running-order.js`, `js/ui/present*.js`, `css/present.css`, `content/text-present.js`, `tests/test-present.js`; small additions to `js/ui/keys.js` (P), `js/ui/shell.js` (Present button in the actions slot), `js/ui/sources-panel.js` (the `presentation` notes) and the panel menu ("Add to presentation") under "Files outside ownership" |
| CUSTOM | `js/engine/custom.js`, `js/engine/build-custom-one.js`, `js/ui/custom-builder.js`, `js/ui/custom-controls.js`, `js/ui/custom-measure-picker.js`, `config/custom-topics.js`, `css/custom.css`, `content/text-custom.js`, `tests/test-custom.js`, `tests/test-custom-picker.js`, `tests/test-custom-ask.js`; the "Custom chart" badge in the panel under "Files outside ownership" |
| EXTRA | `js/core/extra.js`, `js/views/other.js`, `content/text-extra.js`, the extra-section parts of `js/core/check.js`, `js/core/sources.js` and `js/engine/rows.js`, `docs/DATA-CONTRACT.md`, a new docs file EXTENDING-TEMPLATE.md, the sample generator (`tools/sample-*.js`, `tools/generate-sample-data.js`, `data/sample-plan-data.js`, `tests/fixtures/sample-expected.js`), `tests/test-extra.js` |
| DOCS3 | new in the docs folder: HANDOVER.md, CASE-STUDY.md, PUBLISHING.md, index.html and a screenshots folder; new scripts package.sh and portfolio-shots.sh; `README.md`, `docs/COPILOT-PROMPTS.md`, `tests/test-docs3.js` |
| lead | as before; Wave 0 added registry `available()`, Guide extras and the panel's definition and starting-choice helpers |

## 19. Phase 4 additions (full template)

Phase 4 adds the parts of the full template the first copy lacked (D84): the plan against the strategic plan and the base year, the revenue outlook, solutions and product categories, and customer value against value through the organization's books. Everything above still holds. Decisions: D84 to D87. Data Contract changes are additions only (D57); `meta.schemaVersion` stays "0.2".

### 19.1 Data Contract additions

**Lookups** (all optional; a file without them is valid):

| Field | Shape | Notes |
|---|---|---|
| `lookups.productCategories` | `[{id, name}]` | ids `swPerpetual`, `recurring`, `hardware`, `services` |
| `lookups.solutions` | `[{id, name, category}]` | `category` is a product category id |
| `lookups.partnerTypes` | `[{id, name}]` | e.g. a value-added reseller, a system integrator |
| `lookups.partnerMaturity` | `[{id, name, rank}]` | rank 1 to 5: Recruit, Onboard, Enable, Skill, Strategic |
| `lookups.routes` | `[{id, name}]` | ids `ownSales`, `customerSuccess`, `allianceBReseller`, `otherResellers`, `systemIntegrators`, `partnerExisting` |

**Per region** (all optional):

| Field | Shape | Tag | Source in the template |
|---|---|---|---|
| `revenue` | `[{year, channel, motion, type, value, sourceCell}]`, `type` `arr` or `services` | DER | Recap, revenue outlook at customer value |
| `booksValue` | as `revenue`; `type` also `swPerpetual`, `hardware` (`arr` is recurring) | DER | Recap, value through the organization's books |
| `strategicPlan` | `[{year, type, value, variance, sourceCell}]`, `type` `arr`, `services`, `swPerpetual`, `hardware`; `variance` (optional, DER) is the workbook's own variance cell | PRE | Recap, order intake against the strategic plan |
| `baseYear` | `{year, actualsThrough, items: [{category, budget, forecast, actuals, pipeline, coverage, sourceRow}]}` | PRE | Order intake sheet; `actualsThrough` is "YYYY-MM"; `coverage` only when the workbook gives one |
| `routes` | `[{route, year, type, value, solution, sourceCell}]`, `solution` optional | DER (some IN) | Recap, order intake by route to market |
| `outsourcingPct` | number or null | IN | Partner sheet, outsourcing % |
| `newBusiness[].solution` | solution id or null | IN | New Business, solution column |
| `partners[].type` | partner type id or null | IN | Partner sheet |
| `partners[].maturity` | a `partnerMaturity` id (text that matches a maturity name is accepted and mapped) | IN | Partner sheet |
| `partners[].supportPct`, `.distribution`, `.servicesFromPartners` | three numbers by plan year (null allowed) | IN / DER | Partner sheet |
| `customerGrowth.accounts[].riskLevel` | also `low` | PRE | Customer Growth |

`meta.sourceMap` gains entries `revenue`, `booksValue`, `strategicPlan`, `routes` (fixed cells by item) and `baseYear` (sheet and columns), so every new figure traces to its cell (D26).

**Check (`js/core/check-rows.js` and a new `js/core/check-p4.js`, DATA4):** types and lookup ids are errors as for the existing sections; repeated items (same year, channel, motion, type) are warnings; likely-wrong values only warn: revenue above the order intake of the same year, channel and motion; a books value above the customer value for `allianceA`, `allianceB` or `partner`; a coverage that disagrees with pipeline over the remaining target by more than 5%; a stored strategic plan `variance` that disagrees with books value minus the strategic plan.

### 19.2 Measures (`js/engine/measures-p4.js`, ENGINE4)

All return cells as in section 9. Money sums; shares and ratios combine as a ratio of sums (`combine: 'ratioOfSums'`, carrying `ratio: {num, den}`); each meta names `unit`, `valueKind`, `kind` and `dims`.

| Id | Meaning | valueKind / kind | dims |
|---|---|---|---|
| `bk.oi`, `bk.<type>` (`type`: `arr`, `services`, `swPerpetual`, `hardware`) | Order intake through the organization's books | amount / DER | year, channel, motion |
| `bk.oi.<channel>` | The same for one channel (stack parts) | amount / DER | year, motion |
| `cv.oi` | Order intake at customer value (the same figure as `rc.all.oi`) | amount / DER | year, channel, motion |
| `bk.gap`, `bk.gapShare` | Customer value minus books value over the types both sides hold (ARR and services), and that difference as a share of customer value | amount / APP, rate / APP | year, channel |
| `sp.oi`, `sp.<type>` | Strategic plan order intake | amount / PRE | year, category |
| `sp.plan` | The plan's books order intake on the same basis as the strategic plan | amount / DER | year, category |
| `sp.variance`, `sp.variancePct` | `sp.plan - sp.oi`, and that over `sp.oi` | amount / APP, rate / APP | year, category |
| `by.budget`, `by.forecast`, `by.actuals`, `by.pipeline` | Base year figures | amount / PRE | category |
| `by.growth` | Plan year 1 (books) over the base-year figure, minus 1; `ctx.against` `forecast` (default) or `budget` | rate / APP | category |
| `by.coverage` | Pipeline over the order intake still to win (forecast minus actuals); the workbook's ratio when given (kind PRE), else APP | rate | category |
| `rv.<m>.<t>` (`m` `nb`, `cg`, `all`; `t` `arr`, `services`, `oi`) | Revenue outlook | amount / DER | year, channel (+ motion for `all`) |
| `rv.share` | Revenue in a year over order intake of the same year (`rc.all.oi`) | rate / APP | year, channel |
| `nb.<t>.sol` (`t` `arr`, `services`, `oi`) | New business by solution (`oi` is a derived sum, kind APP). The existing `nb.arr`, `nb.services` and `nb.oi` also list `solution` in their dims | amount / DER | year, solution |
| `oi.cat` | Books order intake by product category | amount / DER | year, category |
| `rt.oi` | Order intake by route to market | amount / DER | year, route, solution |
| `pt.count.maturity`, `pt.oi.maturity` | Partners and their planned order intake by maturity | count / IN, amount / IN | maturity, partnerType |

**As built (ENGINE4):** `TAP.measures.available(id)` is false when no region has a value for a Phase 4 measure (`meta.optional`); Build a chart and the Outlook view's "no data" line use it. `by.coverage` cells are kind PRE only when one base-year item carries the workbook's ratio; several categories together are worked out by the app (APP). A `sp.<type>` measure asked for another category is not applicable. A list with no item for a channel, type, route or category is "not provided"; a row-based figure (solutions, partner maturity) with no row in the group is zero. The partner list's `type` and `distribution` columns appear only when the file has them (`TAP.rows.optional`); a cell may carry `rank`, which lists sort by (maturity in the lookup's order).

**As built (the rest of Phase 4):**
- `by.plan` (DER): plan year 1 books value on the base-year basis, honouring `ctx.against` (forecast by default, or budget); `by.growth` reads it, so the growth traces to its parts. `TAP.prepare.run` passes `ctx.opts.against`, else `def.options.against`.
- `by.coverage` has the unit `ratio`: `TAP.format.cell` prints two decimals and "×" ("1.09×"), on axes too.
- `sp.plan` sums books value for each year and category the strategic plan gives a figure for; `by.growth` takes year 1 books value over the categories the base-year figure is given for (like for like).
- On `nb.arr`, `nb.services`, `nb.oi` and the six lever measures, a row naming no solution counts under `none` in every region, so the columns always add up; `nb.<t>.sol` is "not provided" for a region where no row names a solution.
- `TAP.prepare.dimHasData(measureId, dim)`: a Phase 4 dimension is offered in the panel's breakdown menu and in Build a chart only when some region has a non-zero figure under a lookup value. The panel's measure switch lists only measures `TAP.measures.available` allows.
- `category` and `route` breakdown values fall back to the contract's fixed ids when a file leaves the lookup out.
- `TAP.sources.address`: a sum over several fixed cells of the new lists reads as a block ("E90:G91"), or first to last with a count.
- Builders: `dimStack` (`js/reports/dim-stack.js`, drawing in `stack-draw.js`): one measure split by the values of one dimension (`options.by`), as stacked bars, 100% bars, a heatmap and a table, with numbered parts in region shades or, with `options.partColors`, parts in a theme palette keyed by swatch and name (D135); used by `nb-solutions`, `pt-routes`, `pt-maturity`, `ol-revenue`, `ol-category`. `ptBooks` (`pt-books`), `olSide` (`js/reports/outlook-side.js`: two or more named bars per entity with a closing figure; `ol-strategic`, `ol-baseyear`, `ol-revshare`) and `olCoverage` (`ol-coverage`, the compare chart plus pipeline and still-to-win columns).
- A drill Target may carry `solution` (a solution id or `none`); the list builder then keeps only new business rows for that solution (17.4, 17.6).

**Breakdowns:** `TAP.reports.BREAKDOWNS` gains `solution`, `category`, `route`, `maturity` and `partnerType`; context keys `{solution, category, route, maturity, partnerType}`; values come from the lookups in their order, plus "not named" (`none`) for rows with no value. The Build a chart dimensions follow (US-3.5.2).

### 19.3 Views and reports

- **New view `outlook`** ("Outlook", menu after Partners; D87): `ol-strategic`, `ol-baseyear`, `ol-coverage`, `ol-revenue`, `ol-revshare`, `ol-category` (`config/reports-outlook.js`, `js/views/outlook.js`, OUTLOOK). With no strategic plan, base year and revenue for any region, the view shows one line saying so.
- **New business view:** `nb-solutions` (solution heatmap and stacks, drill to `nb-rows` filtered by solution) after `nb-industries` (NBPT).
- **Partners view:** `pt-books` (customer value against books value), `pt-routes` (route to market), `pt-maturity` (partners by maturity) after `pt-capacity`; the partner list gains `type`, `maturity`, `distribution` columns (NBPT).
- **Region profile:** glance lines `strategic` and `revenue`; reports `ol-strategic` and `ol-revenue` (PAGES4).
- **Running order:** two Outlook steps (PAGES4).

### 19.4 Insights (`js/insights/rules-outlook.js`, INSIGHTS4)

New family `outlook` (weight in `TAP_SETTINGS.insights.familyWeights`, figure-based, so it ranks with the others, D80). Rules: `spGap` (a region's plan far below or above its strategic plan), `spTotal` (the plans together against the strategic plans), `y1Jump` (year 1 far above the base-year forecast), `lowCoverage`, `booksGap` (a large share of customer value not running through the books), `solutionReliance` (one solution carrying most of a region's new business). Each attaches to the report that shows its figure and names `measureId` (D79): `sp.oi` for `spGap` and `spTotal` (the measure `ol-strategic` draws the variance under), `by.growth`, `by.coverage`, `bk.gapShare`, `nb.oi.sol`. The rules carry `optional: true`: a rule so marked whose inputs are absent from every region is skipped without a `failures()` entry, so a file without the Phase 4 parts shows no new notes (D57). Thresholds are in `config/insight-rules.js` (D91).

### 19.5 Ownership (Phase 4)

| Stream | Owns |
|---|---|
| DATA4 (wave A) | `js/core/check-p4.js`, its call in `js/core/check.js`, the Phase 4 parts of `js/core/check-rows.js`, `docs/DATA-CONTRACT.md`, the sample generator (`tools/sample-*.js`, `tools/generate-sample-data.js`, new `tools/sample-p4.js`), `data/sample-plan-data.js`, `tests/fixtures/sample-expected.js`, `docs/PLANTED-CASES.md`, `content/text-data.js`, `tests/test-p4-data.js` |
| ENGINE4 (wave A) | `js/engine/measures-p4.js` (new), `js/engine/rows.js` (new list columns), `js/engine/prepare.js` and `js/engine/registry.js` (breakdowns only), `js/engine/custom.js`, `content/text-engine.js`, new `tests/fixtures/mini-p4.js` and `mini-p4-expected.js`, `tests/test-measures-p4.js` |
| OUTLOOK (wave B) | `js/views/outlook.js`, `config/reports-outlook.js`, `content/text-outlook.js`, `css/outlook.css`, `tests/test-outlook.js` |
| NBPT (wave B) | `config/reports-newbusiness.js`, `config/reports-partners.js`, `js/views/new-business.js`, `js/views/partners.js`, `content/text-newbusiness.js`, `content/text-customers.js` (partner wording), the `newBusiness` and `partners` lines of `config/views.js`, `tests/test-p4-reports.js`, and the view-list assertions in `tests/test-newbusiness.js` and `tests/test-partners.js` |
| INSIGHTS4 (wave B) | `js/insights/rules-outlook.js` (new), `config/insight-rules.js`, `tests/test-insights-p4.js` |
| PAGES4 (wave B) | `content/glossary.js`, `content/guide.js`, `js/ui/tour.js`, `js/views/regions-parts.js`, `config/profile.js`, `config/running-order.js`, `docs/IMPORT-BRIEF.md`, `docs/COPILOT-PROMPTS.md`, `docs/REAL-DATA-CHECKLIST.md`, `docs/HANDOVER.md`, `README.md`, `tests/test-pages-p4.js` |
| lead | as before; Wave 0: this section, `config/views.js` (the `outlook` entry), the stubs, `config/settings.js` (family weight), the page lists |
