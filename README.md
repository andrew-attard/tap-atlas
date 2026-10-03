# TAP Atlas

**Territory Account Plan Atlas: every region's plan, side by side.**

TAP Atlas is a small app that runs in the browser. Each regional leader fills in the same planning template. TAP Atlas reads those plans from one data file and shows them together, so leadership can play each region's plan back, compare regions and spot what is worth discussing.

This README is for the maintainer working with a chat assistant such as Microsoft 365 Copilot. It says what every file does, and which files to share for each kind of change. Detail lives in `docs/`.

> **Status:** Phase 1. The sample edition runs end to end. The internal edition needs the real data file from the import.

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
js/engine/        figures and charts: measures, combining regions, scope, the generic chart builders
js/reports/       the two dedicated charts (tier grid, quadrant) and the details panel content
js/insights/      the insight engine and one rule file per family
js/panel/         the report panel every chart sits in
js/ui/            the page frame, comparison bar, side panels, start-up screens, tour
js/views/         the four views: Overview, Industry priorities, Insights, Guide
config/           settings, views, report definitions, insight rules (no code, only values)
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

### `js/reports/`, `js/insights/`, `js/panel/`

| File | What it does |
|---|---|
| `js/reports/tier-grid.js` | The tier grid: industries against regions, coloured by tier |
| `js/reports/quadrant.js` | Attractiveness against ability to win, in four labelled areas |
| `js/reports/details.js` | Collects everything about one clicked item for the details panel |
| `js/insights/engine.js` | Runs the rules, applies the guardrails, ranks results, keeps the hidden list |
| `js/insights/rules-*.js` | One file per rule family: priorities, judgement, assumptions, realism, exposure, capability |
| `js/panel/panel.js` | The report panel: title, takeaway, chart or table, legend, source line, controls |
| `js/panel/panel-chart.js` | Draws the chart, legend and notes inside a panel |
| `js/panel/panel-table.js` | The table view, sortable, with a source column, copyable into Excel |
| `js/panel/panel-menus.js` | The panel's toolbar, menus and controls |
| `js/panel/panel-export.js` | Saves or copies a chart as an image |
| `js/panel/panel-insights.js` | The takeaway line and the panel's short insight list |

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
| `js/ui/tour.js` | The optional welcome tour |
| `js/ui/showme.js` | "Show me": opens the right view and chart and highlights the data |
| `js/ui/keys.js` | Presenting shortcuts and the Esc order |
| `js/views/overview.js` | The Overview: headline, top insights, region cards, ambition chart |
| `js/views/overview-cards.js` | The region cards |
| `js/views/industry.js` | Industry priorities: tier grid, quadrant, ratings, commentary |
| `js/views/insights.js` | The Insights page: every insight, ranked and grouped |
| `js/views/guide.js` | The Guide page: how to use the app, planning explained, glossary |

### `config/`

| File | What it does |
|---|---|
| `config/settings.js` | Every tunable number: combining weights, score weights, insight ranking, limits |
| `config/views.js` | The views in menu order and the reports each one shows |
| `config/reports.js` | The report schema, explained field by field |
| `config/reports-overview.js` | Report definitions for the Overview |
| `config/reports-industry.js` | Report definitions for Industry priorities |
| `config/insight-rules.js` | Every insight rule: thresholds, wording, on/off switch, where it attaches |

### `content/` and `css/`

| File | What it does |
|---|---|
| `content/ui-text.js` | General wording: app name, tour, Guide and glossary screens |
| `content/text-*.js` | Wording per area: shell, engine, data, panel, overview, industry, pages |
| `content/glossary.js` | The general glossary: every term in plain English |
| `content/guide.js` | The Guide page text |
| `content/organization.example.js` | Starter for the organization layer; copy it to `content/organization.js` |
| `css/base.css` | Fonts, reset, typography and shared building blocks |
| `css/*.css` | One stylesheet per area: shell, layers, panel, overview, industry, pages, glossary |

### `data/` and `docs/`

| File | What it does |
|---|---|
| `data/sample-plan-data.js` | Fictional sample data. Generated: never edit by hand |
| `data/plan-data.js` | Real data from the import. Internal copy only, gitignored |
| `docs/DATA-CONTRACT.md` | The exact shape of the data file. The only interface between data and views |
| `docs/ARCHITECTURE.md` | How the parts fit and the contract each one codes against |
| `docs/IMPORT-BRIEF.md` | What the import must do, for building it in Copilot |
| `docs/COPILOT-PROMPTS.md` | Ready-made Copilot prompts, each with the files to attach |
| `docs/REAL-DATA-CHECKLIST.md` | Step by step for the real-data run and before each demo |
| `docs/PLANTED-CASES.md` | The deliberate cases in the sample data that each insight rule must find |
| `docs/AGENT-BRIEF.md`, `docs/build-plan.md` | How the first build was organized (background only) |

### `tests/`, `tools/`, `scripts/`, `vendor/`

| File | What it does |
|---|---|
| `tests/test-*.js` | The tests, one file per area; the page runs them all |
| `tests/harness.js` | The small test runner behind `tests.html` |
| `tests/fixtures/mini-data.js` | A tiny valid data file (four regions), worked out by hand in `tests/fixtures/mini-expected.js` |
| `tests/fixtures/broken-cases.js` | Deliberately broken data files for the contract check tests |
| `tools/generate-sample-data.js` | Rebuilds the sample data from `tools/sample-settings.js` (helpers: `tools/sample-*.js`) |
| `tools/lint.js` | Checks the house rules: headers, file size, no web calls, no stray colours |
| `tools/check-docs.js` | Checks every path the docs name exists |
| `tools/build-pages.js` | Writes the script list into the three pages |
| `scripts/verify.sh` | Runs every check and the headless tests |
| `vendor/echarts.min.js` | The chart library (Apache ECharts 5.6.0); fonts are in `vendor/fonts/` |

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
| A new report | `config/reports.js`, `config/reports-overview.js` or `config/reports-industry.js`, `config/views.js`, `js/engine/measures.js` (prompt 7) | `tests.html`, then the view in `index-sample.html` |
| A new insight rule | `config/insight-rules.js`, the family's file in `js/insights/` (e.g. `js/insights/rules-realism.js`), `js/insights/engine.js`, `js/engine/measures.js`, `docs/PLANTED-CASES.md` | `tests.html`, then the Insights page |
| Tuning insights | `config/settings.js`, `config/insight-rules.js`, `docs/PLANTED-CASES.md` (prompt 5) | `tests.html`, then the Insights page |
| Branding | `js/theme.js` (prompt 4); edit it in the internal copy only | `tests.html?suite=theme`, then `index.html` |
| Organization wording | `content/organization.example.js`, `content/glossary.js`, `content/guide.js`, `content/ui-text.js`, and the `content/text-*.js` file that holds the phrase (prompt 3) | The data sources panel in `index.html` shows no organization message |
| A data file error | `docs/DATA-CONTRACT.md`, `js/core/check.js`, `content/text-data.js`, the import's files, and the copied problem list (prompt 6) | `index.html` opens; read the data sources panel |
| Adding a measure | `js/engine/measures.js` (or `js/engine/scores.js` for per-industry figures), `content/text-engine.js` (its label), `docs/DATA-CONTRACT.md`, `config/settings.js` if it is a weighted rate | `tests.html`, then the report that uses it |
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
