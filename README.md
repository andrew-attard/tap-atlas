# TAP Atlas

**Territory Account Plan Atlas: every region's plan, side by side.**

TAP Atlas is a small app that runs in the browser. Each regional leader fills in the same planning template. TAP Atlas reads those plans from one data file and shows them together, so leadership can play each region's plan back, compare regions and spot what is worth discussing.

**Start here: [the handover guide](docs/HANDOVER.md)** (`docs/HANDOVER.md`). It says what the app is, how to refresh the data, which checks to run, which document to read for each job, and the known limits and open questions.

This README is for the maintainer working with a chat assistant such as Microsoft 365 Copilot. It says what every file does, and which files to share for each kind of change. Detail lives in `docs/`.

> **Status:** Phase 1 is released as `v0.1.0` and Phase 2 (the New business, Customer growth and Partners views, region profiles, list reports, drill-down and more insights) as `v0.2.0`. Phase 3 adds presentation mode, custom charts, extra template sections, the handover pack and the portfolio edition, for `v0.3.0`. The sample edition runs end to end. The internal edition needs the real data file from the import.

## Open it

No server, no install, no internet. Everything, including the chart library and fonts, is in the folder.

- **To look around:** double-click `index-sample.html`. It shows fictional sample data, with a "Sample data" banner on every screen.
- **To present real plans:** double-click `index.html`, once `data/plan-data.js` exists (see [Replace the data file](#replace-the-data-file)).

Chrome is the main browser; Edge also works. Both are tested. Opened without a data file, `index.html` shows a "No plan data found" screen.

## The two editions

| Page | Data file | Organization layer | In the public repository |
|---|---|---|---|
| `index-sample.html` | `data/sample-plan-data.js` (fictional, generated) | none | yes |
| `index.html` | `data/plan-data.js` (real, from the import) | `content/organization.js` | the page only: both files it adds are gitignored |
| `tests.html` | `tests/fixtures/mini-data.js` and the sample data | none | yes |

All three pages load the same app scripts in the same order. Only the data and organization lines differ. Real data and organization wording live only in the **internal copy** of the folder, on approved storage, never in the public repository.

## Folder layout

```
index.html, index-sample.html, tests.html   the three pages
js/theme.js       every colour, font and size
js/core/          shared basics: state, data loading, the contract check, sources, wording, formatting
js/engine/        figures and charts: measures, combining regions, scope, row figures, the generic chart and list builders
js/reports/       the dedicated charts (tier grid, quadrant, industry grid, levers, row bubbles, themes) and the details content
js/insights/      the insight engine and one rule file per family
js/panel/         the report panel every chart sits in
js/ui/            the page frame, comparison bar, side panels, start-up screens, tour, presentation mode, Build a chart
js/views/         the views: Overview, Industry priorities, New business, Customer growth, Partners, Other sections, Regions, Insights, Guide
config/           settings, views, report definitions, insight rules, the running order (no code, only values)
content/          every word on screen: glossary, Guide text, wording files, organization starter
css/              one base stylesheet and one per area
data/             the data files
docs/             contract, architecture and handover documents
tests/            the test page's tests and fixtures
tools/            Node scripts for development only (lint, sample data, page lists)
scripts/          shell scripts for development only (checks, headless tests, screenshots)
vendor/           ECharts, the Archivo fonts and their licences
```

## What each file does

### Pages and theme

| File | What it does |
|---|---|
| `index.html` | Internal edition: real data plus the organization layer |
| `index-sample.html` | Public edition: fictional sample data |
| `tests.html` | The test page: runs every automated test and shows a summary |
| `js/theme.js` | The theme: every colour, font, size and the logo slot. Writes the CSS variables and the chart theme |

### `js/core/`

| File | What it does |
|---|---|
| `js/core/namespace.js` | Creates `window.TAP`, holds the data version the app reads (`TAP.schemaVersion`) and the stub helper |
| `js/core/dom.js` | Safe helpers for building page elements and escaping text |
| `js/core/icons.js` | Line icons drawn inline, so nothing loads from the web |
| `js/core/storage.js` | Remembers small choices in the browser; keeps working if storage is blocked |
| `js/core/store.js` | The shared app state, the event bus and the notes for the data sources panel |
| `js/core/format.js` | Formats every number, rating and date the same way |
| `js/core/content.js` | Hands out the wording, with the organization layer laid over the general one |
| `js/core/sources.js` | Turns a figure's source into file › sheet › cell; summarises each region's import |
| `js/core/check.js` | The contract check: checks the data file and lists problems in plain words |
| `js/core/data.js` | Loads and checks the data file, then gives everything else simple ways to read it |
| `js/core/extra.js` | Extra template sections: the sections the data file declares, their columns and cells, sources, and their warnings |

### `js/engine/`

| File | What it does |
|---|---|
| `js/engine/registry.js` | The lists of reports, chart builders and views; checks report definitions |
| `js/engine/aggregate.js` | Combines regions into totals and averages. The only place the combining rules live |
| `js/engine/scope.js` | Turns the comparison setting into what a chart draws, with colours and the plain sentence |
| `js/engine/measures.js` | The one catalogue of figures, used by charts, cards and insights alike |
| `js/engine/scores.js` | Attractiveness and ability-to-win scores, and the per-industry measures |
| `js/engine/shapes.js` | Which chart types suit a report, plus the drawing kit the builders share |
| `js/engine/prepare.js` | Runs a report's measures over the comparison into one dataset for chart and table |
| `js/engine/build-compare.js` | Generic builder: one value per region (bar, dot, radar) |
| `js/engine/build-parts.js` | Generic builder: parts of a whole (stacked bars, treemap, bubble) |
| `js/engine/build-xy.js` | Generic builder: two measures against each other (scatter, bubble) |
| `js/engine/measures-p2.js` | The Phase 2 measures: recap by channel and motion, new business by tier, customer growth by segment, exposure, partners |
| `js/engine/rows.js` | Figures for single rows (a new business row, an account, a partner), each with its source, for lists, bubbles and details |
| `js/engine/build-list.js` | Generic builder: a list report, one row per item, with sortable columns and a filter |
| `js/engine/custom.js` | Custom charts: which measure and dimension pairs each measure allows, the report definition for a choice, the session list |

### `js/reports/`, `js/insights/`, `js/panel/`

| File | What it does |
|---|---|
| `js/reports/tier-grid.js` | The tier grid: industries against regions, coloured by tier |
| `js/reports/quadrant.js` | Attractiveness against ability to win, in four labelled areas |
| `js/reports/details.js` | Collects everything about one clicked item for the details panel |
| `js/reports/details-rows.js` | Details for one list row (a new business row, an account or a partner): every field with its source |
| `js/reports/tier-stats.js` | How much regions agree on each industry's tier, shared by the tier grid and the views |
| `js/reports/quadrant-labels.js` | Places the quadrant chart's names and numbers so none overlap |
| `js/reports/nb-grid.js` | New business by region and industry, with each region's tier in the cell |
| `js/reports/nb-levers.js` | The new business levers: bars and dots per lever, plus the bubble of targets against hit rate |
| `js/reports/cg-builders.js` | Small additions to the generic builders for the Customer growth charts (segment shades, notes, reference lines) |
| `js/reports/row-bubble.js` | A bubble per row (account or partner) in its region's colour, the largest labelled |
| `js/reports/themes.js` | Finds recurring themes in commentary and success factors, and draws the themes report |
| `js/insights/engine.js` | Runs the rules, applies the guardrails, ranks results, keeps the hidden list |
| `js/insights/rules-*.js` | One file per rule family: priorities, judgement, assumptions, realism, exposure, capability, plan (channel reliance, plan make-up), shared (shared targets, partner capacity), themes (recurring themes) |
| `js/panel/panel.js` | The report panel: title, takeaway, chart or table, legend, source line, controls |
| `js/panel/panel-chart.js` | Draws the chart, legend and notes inside a panel |
| `js/panel/panel-table.js` | The table view, sortable, with a source column, copyable into Excel |
| `js/panel/panel-menus.js` | The panel's toolbar, menus and controls |
| `js/panel/panel-export.js` | Saves or copies a chart as an image |
| `js/panel/panel-insights.js` | The takeaway line and the panel's short insight list |
| `js/panel/panel-drill.js` | Drill-down inside a panel: the levels, the trail of names, and going back up |
| `js/panel/panel-expand.js` | Expanded and full-screen charts: the slim strip, arrow-key stepping |

### `js/ui/` and `js/views/`

| File | What it does |
|---|---|
| `js/ui/app.js` | Starts the app: checks the data, draws the frame, swaps views |
| `js/ui/shell.js` | The page frame: banner, top bar and menu, view area |
| `js/ui/compare-bar.js` | The comparison bar: five modes, the plain sentence, the data date |
| `js/ui/layers.js` | Side panels (details, data sources, glossary, explanations), one at a time |
| `js/ui/sources-panel.js` | The data sources panel: files, dates, import notes, skipped rules |
| `js/ui/system-screens.js` | Full-page messages when the app can't start, with a copyable problem list |
| `js/ui/glossary.js` | Term popovers and the searchable glossary list |
| `js/ui/explain.js` | The plain-English explanation of a report |
| `js/ui/view-head.js` | The header the newer views share: question, lead line, tip line with "Hide tips", headline insight |
| `js/ui/tour.js` | The optional welcome tour |
| `js/ui/showme.js` | "Show me": opens the right view and chart and highlights the data |
| `js/ui/keys.js` | Presenting shortcuts and the Esc order |
| `js/ui/present*.js` | Presentation mode: steps through the running order full screen, and records a running order from the screen |
| `js/ui/custom-builder.js` | "Build a chart" on the Guide: pickers for measure, dimension and chart type, the custom chart and the session list |
| `js/views/overview.js` | The Overview: headline, top insights, region cards, ambition chart |
| `js/views/overview-cards.js` | The region cards |
| `js/views/industry.js` | Industry priorities: tier grid, quadrant, ratings, commentary |
| `js/views/new-business.js` | New business: industries, channels, levers, the sub-industry list, success factors, themes |
| `js/views/customers.js` | Customer growth: segments, growth, exposure, the account bubble and list; also the layout Partners uses |
| `js/views/partners.js` | Partners: reliance on partners and alliances, partner capacity, the partner list |
| `js/views/regions.js` | Regions: pick a region, then its profile with the main reports for that region against the rest |
| `js/views/regions-parts.js` | The profile's lower parts: the plan at a glance, the region's insights and what its leader wrote |
| `js/views/insights.js` | The Insights page: every insight, ranked and grouped |
| `js/views/other.js` | Other sections: one list per extra template section, shown only when the data has any |
| `js/views/guide.js` | The Guide page: how to use the app, planning explained, the sections other parts add (running order, Build a chart), glossary |

### `config/`

| File | What it does |
|---|---|
| `config/settings.js` | Every tunable number: combining weights, score weights, insight ranking, limits |
| `config/views.js` | The views in menu order and the reports each one shows |
| `config/reports.js` | The report schema, explained field by field |
| `config/reports-overview.js` | Report definitions for the Overview |
| `config/reports-industry.js` | Report definitions for Industry priorities |
| `config/reports-newbusiness.js` | Report definitions for New business |
| `config/reports-customers.js` | Report definitions for Customer growth |
| `config/reports-partners.js` | Report definitions for Partners |
| `config/reports-themes.js` | The recurring themes report |
| `config/profile.js` | The reports a region profile shows, in order |
| `config/comment-themes.js` | Keyword lists for the recurring themes in commentary and success factors |
| `config/insight-rules.js` | Every insight rule: thresholds, wording, on/off switch, where it attaches |
| `config/running-order.js` | The running order for presentation mode: the meeting's steps, in order |

### `content/` and `css/`

| File | What it does |
|---|---|
| `content/ui-text.js` | General wording: app name, tour, Guide and glossary screens |
| `content/text-*.js` | Wording per area: shell, engine and engine2 (measures, lists), data, panel, overview, industry, newbusiness, customers (and partners), profile, themes, pages (Guide, tour, tips), present (presentation mode), custom (Build a chart), extra (extra sections) |
| `content/glossary.js` | The general glossary: every term in plain English |
| `content/guide.js` | The Guide page text |
| `content/organization.example.js` | Starter for the organization layer; copy it to `content/organization.js` |
| `css/base.css` | Fonts, reset, typography and shared building blocks |
| `css/*.css` | One stylesheet per area: shell, layers, panel, overview, industry, pages, glossary, newbusiness, customers, profile, themes, present, custom |
| `css/view-head.css` | The shared header and two-panel layout of the newer views |

### `data/` and `docs/`

| File | What it does |
|---|---|
| `data/sample-plan-data.js` | Fictional sample data. Generated: never edit by hand |
| `data/plan-data.js` | Real data from the import. Internal copy only, gitignored |
| `docs/HANDOVER.md` | The handover guide: start here. What the app is, refreshing the data, the checks, which document for which job, known limits |
| `docs/DATA-CONTRACT.md` | The exact shape of the data file. The only interface between data and views |
| `docs/ARCHITECTURE.md` | How the parts fit and the contract each one codes against |
| `docs/IMPORT-BRIEF.md` | What the import must do, for building it in Copilot |
| `docs/EXTENDING-TEMPLATE.md` | How to bring another template section into the app: an extra section, a measure and report, or a new view |
| `docs/COPILOT-PROMPTS.md` | Ready-made Copilot prompts, each with the files to attach |
| `docs/REAL-DATA-CHECKLIST.md` | Step by step for the real-data run and before each demo |
| `docs/PLANTED-CASES.md` | The deliberate cases in the sample data that each insight rule must find |
| `docs/CASE-STUDY.md` | The case study: the brief, the constraints, the key decisions, the delivery method and what each phase delivered |
| `docs/index.html` | The portfolio landing page: the problem, what the app does, screenshots, how it was built, and a button that opens the sample edition |
| `docs/screenshots/*.png` | One screenshot per view of the sample edition at 1440 x 900, for the landing page and case study. Made by `scripts/portfolio-shots.sh`: never edit by hand |
| `docs/PUBLISHING.md` | How to put the sample edition on the web with GitHub Pages, and what to check after (Pages is not switched on) |
| `docs/AGENT-BRIEF.md`, `docs/build-plan.md`, `docs/build-plan-phase2.md`, `docs/build-plan-phase3.md` | How the builds were organized (background only) |

### `tests/`, `tools/`, `scripts/`, `vendor/`

| File | What it does |
|---|---|
| `tests/test-*.js` | The tests, one file per area; the page runs them all |
| `tests/harness.js` | The small test runner behind `tests.html` |
| `tests/fixtures/mini-data.js` | A tiny valid data file (four regions), worked out by hand in `tests/fixtures/mini-expected.js` |
| `tests/fixtures/broken-cases.js` | Deliberately broken data files for the contract check tests |
| `tests/fixtures/mini-p2.js` | Extra rows (recap, accounts, partners) for the Phase 2 tests, worked out by hand in `tests/fixtures/mini-p2-expected.js` |
| `tests/fixtures/sample-expected.js` | Figures the sample data generator worked out, for tests on the sample data |
| `tests/fixtures/insights-fixture.js` | A small fixed list of insights for the Insights page tests |
| `tests/auto-cases.js` | The automated cases in the Test Plan, so a case without a test shows as pending |
| `tests/harness.css`, `tests/selftest.html`, `tests/cvd.js` | The test page's look, the harness's own checks, and colour-blindness maths for the theme tests |
| `tests/qa.html` | The app as `index-sample.html` loads it, with hooks for the QA checks |
| `tools/generate-sample-data.js` | Rebuilds the sample data from `tools/sample-settings.js` (helpers: `tools/sample-*.js`) |
| `tools/lint.js` | Checks the house rules: headers, file size, no web calls, no stray colours |
| `tools/check-docs.js` | Checks every path the docs name exists |
| `tools/check-docs3.js`, `tools/check-docs3-files.js` | Check the handover and portfolio files: the sample edition works from a web host, the landing page's links, the handover guide, the screenshots and the package script |
| `tools/build-pages.js` | Writes the script list into the three pages |
| `tools/build-auto-cases.js` | Writes `tests/auto-cases.js` from the Test Plan |
| `tools/parse-results.js` | Reads a headless test run and reports the results |
| `scripts/verify.sh` | Runs every check and the headless tests |
| `scripts/test-headless.sh`, `scripts/lib-browser.sh` | Runs a test page in headless Chrome or Edge; finding the browser |
| `scripts/screenshot.sh` | Screenshots of a page at a given size and zoom |
| `scripts/package.sh` | Runs every check, then makes a known-good copy for presenting in `dist/tap-atlas-<version>-<date>/` (no tests or tools; `dist/` is gitignored) |
| `scripts/portfolio-shots.sh` | Retakes the portfolio screenshots in `docs/screenshots/`, one per view, with names that never change |
| `scripts/check-text.sh`, `scripts/open-pr.sh` | Checks text against the private word list; opens a pull request after that check |
| `scripts/qa/*` | The QA checks (`scripts/qa/run-all.sh` runs them all): console errors, text sizes, offline, smoke test, screenshot matrix |
| `vendor/echarts.min.js` | The chart library (Apache ECharts 5.6.0) |
| `vendor/fonts/archivo-*.woff2`, `vendor/fonts/OFL.txt` | The Archivo font in three weights, and its licence (SIL Open Font Licence) |
| `vendor/LICENSE-*.txt` | The licences of ECharts and of the line icons the app draws |

## How data, content and theme fit together

1. `js/theme.js` loads first. It sets `TAP_THEME` and writes the `--tap-*` CSS variables every stylesheet reads.
2. `config/` and `content/` files set plain globals: `TAP_SETTINGS`, `TAP_VIEWS`, `TAP_REPORTS`, `TAP_RULES` and `TAP_CONTENT`. In `index.html`, `content/organization.js` sets `TAP_ORG`, which is laid over the general wording.
3. The data file sets `PLAN_DATA`. On start, `js/core/data.js` runs the contract check (`js/core/check.js`). Errors stop the app with a copyable list; warnings go to the data sources panel.
4. Every figure comes from one place, `js/engine/measures.js`. Reports, cards and insights all read it, so figures can't drift apart. Each figure carries its source, so it can be traced to file › sheet › cell.
5. A report definition in `config/` names its measures and chart types. The builders in `js/engine/` and `js/reports/` draw it inside a panel. No chart code is needed for a new report of an existing shape.

So: **data** says what the plans hold, **config** says what to show and how to weigh it, **content** says it in words, and **the theme** decides how it looks. Code reads all four but holds none of them.

## Replace the data file

1. Run the import (built in Copilot from `docs/IMPORT-BRIEF.md`) on the regional workbooks.
2. Save its output as `data/plan-data.js` in the internal copy of the folder, replacing the old file.
3. Double-click `index.html`. If it stops with "The data file has problems that stop the app from opening", press **Copy the list** and use prompt 6 in `docs/COPILOT-PROMPTS.md`. Fix the import, never the data file by hand.
4. Click the "Data:" date on the comparison bar to check every region's file, dates and import notes.

The full run is in `docs/REAL-DATA-CHECKLIST.md`.

## Run the tests

- **In the browser:** double-click `tests.html`. It runs every automated test and shows a pass or fail summary. **Copy results** copies the summary for the run log. `tests.html?suite=theme` runs one suite; `tests.html?only=TPV-TC-205` runs one case.
- **From a terminal** (Linux or WSL, Node 18 or later, Chrome or Edge): `scripts/verify.sh` runs lint, the denylist scan, the ignored-files guard, the docs paths check and the headless tests in both browsers. `scripts/verify.sh --browser chrome` uses one browser.

## Which files to share for which change

Copilot sees only what you attach. Attach these, plus `docs/ARCHITECTURE.md` if the chat is new.

| Change | Share these files | Then check |
|---|---|---|
| A new report | `config/reports.js`, the view's `config/reports-*.js` file, `config/views.js`, `js/engine/measures.js`, `js/engine/measures-p2.js` (prompt 7) | `tests.html`, then the view in `index-sample.html` |
| A report on the region profile | `config/profile.js`, `config/views.js`, the report's `config/reports-*.js` file (prompt 9) | The Regions view for one region |
| A column on a list | The list's `config/reports-*.js` file, `js/engine/rows.js`, `content/text-engine2.js`, `docs/DATA-CONTRACT.md` (prompt 10) | `tests.html`, then the list |
| A recurring theme keyword | `config/comment-themes.js`, `docs/PLANTED-CASES.md` (prompt 8) | `tests.html`, then the themes report on New business |
| A new insight rule | `config/insight-rules.js`, the family's file in `js/insights/` (e.g. `js/insights/rules-realism.js`), `js/insights/engine.js`, `js/engine/measures.js`, `docs/PLANTED-CASES.md` | `tests.html`, then the Insights page |
| Tuning insights | `config/settings.js`, `config/insight-rules.js`, `docs/PLANTED-CASES.md` (prompt 5) | `tests.html`, then the Insights page |
| Branding | `js/theme.js` (prompt 4); edit it in the internal copy only | `tests.html?suite=theme`, then `index.html` |
| Organization wording | `content/organization.example.js`, `content/glossary.js`, `content/guide.js`, `content/ui-text.js`, and the `content/text-*.js` file that holds the phrase (prompt 3) | The data sources panel in `index.html` shows no organization message |
| A data file error | `docs/DATA-CONTRACT.md`, `js/core/check.js`, `content/text-data.js`, the import's files, and the copied problem list (prompt 6) | `index.html` opens; read the data sources panel |
| Adding a measure | `js/engine/measures.js` (or `js/engine/scores.js` for per-industry figures), `content/text-engine.js` (its label), `docs/DATA-CONTRACT.md`, `config/settings.js` if it is a weighted rate | `tests.html`, then the report that uses it |
| The running order for a meeting | `config/running-order.js`, `docs/ARCHITECTURE.md` (section 18.2), the definitions files of the reports to show (prompt 14) | **Present** in `index-sample.html` steps through every step; nothing listed as skipped in the data sources panel |
| Keeping a custom chart, or offering a measure in "Build a chart" | `js/engine/custom.js`, `config/reports.js`, the view's `config/reports-*.js` file, `config/views.js`, the measure files (prompt 15) | `tests.html`, then the view or the Guide's "Build a chart" |
| Another template section | `docs/EXTENDING-TEMPLATE.md`, `docs/DATA-CONTRACT.md`, `js/core/extra.js`, the import's files (prompts 11 to 13) | The Other sections view in `index.html`, then `tests.html` |
| A general wording change | The `content/text-*.js` file or `content/ui-text.js` that holds the phrase | The screen that shows it |

**Adding a new code file** also means adding its `<script>` line to all three pages in the same place. Either add the file to the list in `tools/build-pages.js` and run `node tools/build-pages.js`, or add the same line by hand to each page. Prefer adding to an existing file when it stays under about 300 lines.

## Rules for every change

- The app opens from a file. Classic `<script>` tags only: no modules, `import`/`export`, `fetch` or `eval`. No web libraries, links or fonts.
- Keep files small (under about 300 lines), each with its header: Purpose, Provides, Depends on, Used by.
- Colours and font sizes only in `js/theme.js`; words only in `content/`; numbers to tune only in `config/settings.js`.
- `docs/DATA-CONTRACT.md` is the only interface between the data and the views.
- Never put real data or organization names into files that go to the public repository. `data/plan-data.js` and `content/organization.js` are gitignored; a branded `js/theme.js` stays in the internal copy.

More detail: `docs/ARCHITECTURE.md` (contracts), `docs/DATA-CONTRACT.md` (data), `CONTRIBUTING.md` (branches, commits, pull requests).

## Built with

Plain HTML, CSS and JavaScript, plus Apache ECharts for charts. Fonts: Archivo, under the SIL Open Font Licence.

## Licence

[MIT](LICENSE)
