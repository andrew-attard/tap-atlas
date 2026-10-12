# Starter prompts for Copilot

Ready-made prompts for the common tasks in the real-data phase, run in Microsoft 365 Copilot. Each prompt names the files to attach and the result to expect.

Generic on purpose: these prompts use generic terms. Organization-specific details (real terms, region names, brand colours) are typed into the Copilot chat or kept in the internal project folder, outside this repository (D2).

## How to use these

- Copilot is a chat assistant. It sees only what you attach or paste, so attach every file listed, by its path in the app folder.
- Start a new chat per task. Paste the prompt from its box, fill in anything in `<angle brackets>`, then attach the files.
- Copilot cannot run the app. You save its files into the folder, open the page, and paste back anything that went wrong.
- Real data stays on your laptop and in Copilot. Files that hold real data or organization details (`data/plan-data.js`, the real mapping `config/import-map.js`, `content/organization.js`, the `assets/` folder, a palette-changed `js/theme.js`) live only in the internal copy of the folder and never go to the public repository.
- The import is part of the app (D147). Copilot fills the mapping that tells it where every field sits in the workbooks (prompts 2, 16 and 6); you run the import from the **Import** button and paste the panel's report back. Copilot writes no import code and never writes the data file.
- Every prompt repeats the same constraints paragraph, so Copilot keeps to the build's rules even when a chat starts cold.

## Where things live

The main files by area. `README.md` has a short table for every file, and a "which files to share for which change" table.

| Area | Files |
|---|---|
| Pages | `index.html` (internal edition: real data and organization layer), `index-sample.html` (sample data), `tests.html` (test page) |
| Data | `data/plan-data.js` (real, saved from the Import panel; internal copy only), `data/sample-plan-data.js` (fictional, made by `tools/generate-sample-data.js`) |
| Import | `config/import-map.js` (the mapping: where every field sits in the workbooks, the region list, the lookups; the shipped copy describes the sample, the real one lives in the internal copy only), `js/import/*.js` (the importer, which reads the workbooks through the mapping), `js/ui/import-panel.js` and `js/ui/import-report.js` (the Import panel and its report), `content/text-import.js` (its wording) |
| Data rules | `docs/DATA-CONTRACT.md` (the contract), `js/core/check.js` and `js/core/check-p4.js` (the contract check), `content/text-data.js` (its messages), `js/core/sources.js` (file › sheet › cell) |
| Look | `js/theme.js` (every colour, font, size and the logo fallback), `css/base.css` and one stylesheet per area (`css/shell.css`, `css/layers.css`, `css/panel.css`, `css/overview.css`, `css/industry.css`, `css/pages.css`, `css/guide.css`, `css/glossary.css`, `css/view-head.css`, `css/newbusiness.css`, `css/customers.css`, `css/profile.css`, `css/themes.css`, `css/outlook.css`) |
| Settings | `config/settings.js` (weights, thresholds, limits) |
| Reports | `config/reports.js` (the schema), one definitions file per view (`config/reports-overview.js`, `config/reports-industry.js`, `config/reports-newbusiness.js`, `config/reports-customers.js`, `config/reports-partners.js`, `config/reports-themes.js`, `config/reports-outlook.js`), `config/views.js`, `config/profile.js` (the reports on a region profile) |
| Measures | `js/engine/measures.js`, `js/engine/measures-p2.js` (the Phase 2 measures), `js/engine/measures-p4.js` (the full template's measures), `js/engine/scores.js` (per-industry measures and the two scores), `js/engine/rows.js` (figures for single rows on lists) |
| Charts and lists | `js/engine/build-compare.js`, `js/engine/build-parts.js`, `js/engine/build-xy.js`, `js/engine/build-list.js` (lists), `js/reports/*.js` (the dedicated charts) |
| Insights | `config/insight-rules.js` (rules, thresholds, wording), `config/comment-themes.js` (recurring theme keywords), `js/insights/engine.js`, `js/insights/rules-*.js` (one file per family) |
| Screens | `js/ui/shell.js`, `js/ui/compare-bar.js`, `js/ui/layers.js`, `js/ui/showme.js` ("Show me"), `js/ui/keys.js` (shortcuts), `js/ui/view-head.js` (the newer views' header and tips), `js/views/*.js` (the views, including `js/views/other.js` for extra sections), `js/panel/*.js` (the report panel, drill-down, expanded charts) |
| Presenting | `config/running-order.js` (the presentation file), `js/ui/present*.js` (presentation mode) |
| Custom charts | `js/engine/custom.js` (which measures and dimensions can be combined), `js/ui/custom-builder.js` and `js/views/build.js` ("Build a chart" in the menu) |
| Extra sections | `js/core/extra.js` (reading and checking them), `js/views/other.js` (the Other sections view), `docs/EXTENDING-TEMPLATE.md` (how to add one) |
| Wording | `content/ui-text.js`, `content/glossary.js`, `content/guide.js`, and one file per area, `content/text-<area>.js` (shell, engine, engine2, data, panel, overview, industry, newbusiness, customers, profile, themes, pages, present, custom, extra) |
| Organization layer | `content/organization.example.js` (starter), `content/organization.js` (yours: wording, terms, region names, the label, the logo and app name; internal copy only, never committed), `assets/` (the logo file, internal copy only) |
| Tests | `tests.html`, `tests/test-*.js`, `tests/fixtures/mini-data.js` (a small valid data file) |
| Handover | `docs/HANDOVER.md` (start here), `docs/INTERNAL-HANDOVER.md` (the template for taking the app into use), `README.md`, `docs/IMPORT-BRIEF.md`, `docs/COPILOT-PROMPTS.md`, `docs/REAL-DATA-CHECKLIST.md`, `docs/EXTENDING-TEMPLATE.md` (adding more of the template) |

## 1. Orientation

Use at the start of the real-data phase, or whenever a new chat needs the big picture.

**Attach:** `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA-CONTRACT.md`

```
You are helping me maintain TAP Atlas, a small browser app that shows every region's territory account plan side by side. I have attached the README, the architecture notes and the data contract. Read them, then explain back to me in plain English, in under 300 words:
1. what the app is for and who uses it;
2. how it runs and the two editions (index.html and index-sample.html);
3. how plan data gets into the app, and what happens if the data file is wrong;
4. where the look, the settings, the reports, the insight rules and the wording live;
5. the rules any change must follow.
Then list anything in the files that is unclear or seems to contradict itself. Don't suggest changes yet.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a short summary that gets these right: a static app opened by double-clicking `index.html`; the data file `data/plan-data.js` sets `window.PLAN_DATA`; the app checks it against the contract on load and lists problems with a copy button; `js/theme.js` holds the look, `config/` the settings, reports and insight rules, `content/` the wording; the organization layer is a separate file. Compare it with the README. If anything is wrong, correct Copilot before moving on.

## 2. Fill `config/import-map.js` for the real template

Use to fill the mapping that tells the app's importer where every field sits in the real planning workbooks. The import itself is built into the app (D147): nothing is coded here.

**Attach:** `config/import-map.js` (the sample mapping: the shape to fill), `docs/IMPORT-BRIEF.md`, `docs/DATA-CONTRACT.md`, `docs/ARCHITECTURE.md` (section 20: the mapping's shape, what the cells may hold, the importer's checks), `tests/fixtures/import-maps.js` (a second example: the test fixtures' mappings). This is the pack in `docs/IMPORT-BRIEF.md`. In Copilot only: one real workbook, or screenshots of each sheet's header rows.

```
The app's importer reads our regional planning workbooks through a mapping file, config/import-map.js, which sets window.IMPORT_MAP. The attached copy describes a fictional sample's layout; I need the same file for our real template. Section 20.1 of the attached ARCHITECTURE.md gives the mapping's exact shape and 20.2 what each cell may hold; import-maps.js is a second example. The brief sets the rules (R1 to R9) and section 3 describes the template; the data contract sets the field names and the lookups. I have also attached one real workbook.
Step 1: Compare the real workbook with the sample mapping and section 3 of the brief. List every difference: sheet names, extra or missing sections, columns or rows, header wording, and where the merged two-row headers sit.
Step 2: List the open points per section and wait for my answers: which row is the first data row of each section, and whether a last row is needed; which column each field of the data contract is in, with one column per plan year for by-year fields; which of the order intake sheet's two forecasts is the later one; the recap sheet's region filter cell; the hidden lists sheets that hold the dropdown values; the cell where a workbook names its region; and the file name or pattern of each region's workbook.
Step 3, after I answer: write the whole config/import-map.js, no code. Give it a header comment of your own in the same shape as the attached file's (File, Purpose, Provides, Depends on, Used by), saying that the file describes the real template, is kept in the internal copy only and is filled by hand from the real workbooks, never generated. Then the mapping: meta with isSample false and our template version; the region list in display order with stable ids; the lookups with our real names and stable ids; aliases for every other spelling the workbooks use; and every section with its sheet, header row and header texts, first row, column letters, fixed cells and, for the grid blocks, their axes or enumerated cells. Leave out personal names and account ids: the importer gives accounts their ids. Then tell me to save the file over config/import-map.js in the internal copy, press Import in the app, pick the workbooks and paste the report back to you.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** first a list of layout differences and the open points, then a pause for your answers. After that: one complete `config/import-map.js` and no code. Save it over the mapping in the internal copy only, then press **Import** in `index.html` (the button is on every page and on the no-data screen), pick every workbook and read the report; **Copy report** gives the text to paste back. Fix the mapping with prompt 6 until no region has an error, then **Use these plans now** and **Save data/plan-data.js**. Record your answers in the internal project folder, and work through `docs/REAL-DATA-CHECKLIST.md`.

## 3. Fill the organization layer

Use to add organization terms, short region names, tour wording, the internal confidentiality label, the logo and the app name (D143).

**Attach:** `content/organization.example.js`, `content/glossary.js`, `content/guide.js`, `content/ui-text.js`, and `content/text-pages.js` if you replace tour wording. In the chat, type the terms, region short names, label wording, the app name and the logo file name you want.

```
Create content/organization.js for this app from the attached starter file, content/organization.example.js. Follow its format exactly, using its commented examples. Fill in:
- these organization terms and acronyms: <list, each with a one-line definition>;
- short display names for each region, keyed by the region ids in our data file: <id: short name, ...>;
- the internal confidentiality label: <wording>, shown on every screen;
- the app name shown in the top bar and the browser tab: <name> (text.app.name), and the logo: settings.brand with logo 'assets/<file name>' and a short logoAlt;
- any tour or planning-explainer wording to replace: <optional>.
Where a term already exists in glossary.js, write the organization version so it replaces the general one. Each term's definition shows when someone clicks the term on screen. Return the whole file.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one complete `content/organization.js` in the starter's format. Save it next to the starter (it is gitignored and loaded only by `index.html`), and the logo file under `assets/` in the internal copy. Check: open `index.html`; the internal label shows on every screen; the top bar and the tab show the name and the logo; region labels use the short names; a marked term shows the organization definition. If the file is broken, the data sources panel says so and the app falls back to the general wording.

## 4. Change the colour palette through the theme file

Use to apply the organization's colours and font. The logo and the app name go through the organization layer (prompt 3), not this file.

**Attach:** `js/theme.js`. In the chat, give the brand colours and font name.

```
Rebrand this app by changing only the attached theme file, js/theme.js. Brand colours: <list with their use>. Font: <name>, falling back to the current fonts. Leave the logo slot as it is: the logo comes from the organization layer.
Keep every existing key and comment; change values only. Keep body text contrast at 4.5:1 or better on its background. Keep the region colours distinct for colour-blind viewers, never red (red means highlight) and never grey (grey means the rest). Keep the accent for interface elements only. Return the whole file and a short table of what changed.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a full replacement `js/theme.js` with the same keys, plus a change table. Save it in the internal copy of the folder only. Check: open `tests.html?suite=theme` (all pass, including the colour-blind check), then `index.html` (charts and page pick up the new look). A brand font that isn't stored in the folder falls back to the next font in the list.

## 5. Tune insight thresholds and weights

Use when an insight fires too often, too rarely, ranks too high or reads unfairly. To drop one for a single session, use "Hide for this session" in the app instead: no file change needed.

**Attach:** `config/settings.js`, `config/insight-rules.js`, `docs/PLANTED-CASES.md` (what each rule is meant to find). In the chat, quote the insight sentence and say what's wrong.

```
In this app, insights are rule-based. config/insight-rules.js holds each rule's thresholds (params), wording (template) and on/off switch (enabled); config/settings.js holds the ranking weights (insights.weights, insights.familyWeights) and the score weights. This insight is a problem: "<insight sentence>". The problem: <fires too often | ranks too high | wording unfair | ...>.
Propose the smallest change to settings or rule definitions that fixes it, without editing any code file. Give a table: file, setting, old value, new value, why, and what else it will change. Then return only the changed entries.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a change table and the changed entries only, in configuration files. Check: open `tests.html`. If an insight test fails, the new value no longer finds a planted case in the sample data; decide with Copilot whether the change is still right and record the decision. Then open `index.html` and reread the Insights page.

## 6. Fix the mapping, never the data file

Use when the Import panel's report shows errors, or notes you want explained; also when `index.html` stops with "The data file has problems that stop the app from opening", or when the data sources panel lists warnings.

**Attach:** `config/import-map.js` (the mapping in use), `docs/DATA-CONTRACT.md`, `docs/ARCHITECTURE.md` (section 20) and `docs/IMPORT-BRIEF.md` (section 5, the rules). Paste the report copied with **Copy report** in the Import panel (or the list copied with **Copy the list**, or the data sources panel's notes).

```
The app imported our planning workbooks through the attached mapping, config/import-map.js, and reported the problems below. A region's errors and notes name the sheet and cell; the contract check's lines name the field, the region, the item and what was expected.
<paste the copied report>
Group the problems by cause. For each cause, say whether it is a mapping problem (show the changed entries of config/import-map.js: a sheet name, a row or column, a lookup name or an alias) or a problem in a workbook (say which file, sheet and cell to check, and whether the note can be accepted as it is). Write no code: the importer is part of the app. Never edit data/plan-data.js by hand. The fix goes in the mapping or in the workbook, so it repeats on the next import.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** problems grouped by cause, with changed mapping entries and a list of workbook cells to check. Save the mapping, import again from the **Import** button and read the report. Repeat until no region has an error; then **Use these plans now**, **Save data/plan-data.js**, move the file into `data/` and reopen `index.html`. The data sources panel should hold only notes you have read and accepted.

## 7. Add a report

Use to add a chart for a question the current views don't answer.

**Attach:** `config/reports.js` (the schema), the view's definitions file (`config/reports-overview.js`, `config/reports-industry.js`, `config/reports-newbusiness.js`, `config/reports-customers.js` or `config/reports-partners.js`), `config/views.js`, and the measures that exist: `js/engine/measures.js`, `js/engine/measures-p2.js` and `js/engine/scores.js`.

```
Add a report to this app. The question it should answer: "<question>". It belongs on the <overview | industry | newBusiness | customers | partners> view. Reports are definitions that follow the schema documented in config/reports.js; no chart code is needed for an existing data shape.
Write one new definition in the view's file: an id, the title phrased as the question, the three explanation texts, the shape, the measures, the default and allowed chart types, the breakdowns and the source kinds. Add its id to the view's list in config/views.js. Use only measures that exist in js/engine/measures.js, js/engine/measures-p2.js or js/engine/scores.js. If one is missing, say so and propose it separately; don't invent an id.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one definition and a one-line change to `config/views.js`, plus a separate proposal if a measure is missing. Check: open `tests.html?suite=report%20definitions` (the new definition validates), then `index.html`; an invalid definition shows its error inside its own panel only, so the rest of the view still works.

## 8. Add a keyword to a recurring theme

Use when leaders write about a topic in words the themes don't catch yet, or to add a theme.

**Attach:** `config/comment-themes.js` (the themes and their keywords), `docs/PLANTED-CASES.md` (the sample cases the themes must still find). In the chat, give the theme and the word or phrase, with one or two comments that use it.

```
In this app, recurring themes are found with plain keyword lists in the attached config/comment-themes.js: a comment counts for a theme when it holds one of the theme's keywords as a whole word or phrase, in any case. A theme found in at least minRegions regions becomes an insight. Add the keyword "<word or phrase>" to the theme "<theme label>" (or add a new theme with an id, a label, plural true or false, and its keywords).
Add each other form (a plural, a verb form) as its own keyword. Check the keyword can't match words that mean something else, and say which. Don't change any code file. Return only the changed theme entries.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** the changed theme entries only. Check: open `tests.html`. If a themes test fails, the new keyword changes the sample data's planted theme counts (`docs/PLANTED-CASES.md`). Then run `node tools/generate-sample-data.js` to refresh `tests/fixtures/sample-expected.js` and re-run the tests. Then open the themes report on the New business view: its explanation lists every keyword.

## 9. Add a report to the region profile

Use to show one more existing report on every region profile, for that region against the average of the rest.

**Attach:** `config/profile.js` (the profile's report list), `config/views.js`, and the file that defines the report (for example `config/reports-customers.js`).

```
In this app, a region profile shows a list of existing reports for one region against the average of the other regions. The list is configuration: TAP_PROFILE.reports in the attached config/profile.js, in the order shown. Add the report "<report id or title>" to the profile, after "<report id>".
Use only a report id that exists in the attached definitions file; don't write a new definition here (prompt 7 does that). Keep the order sensible: at most two panels sit side by side, and a list report takes the full width. Return the changed config/profile.js.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one id added to `config/profile.js`. Check: open `tests.html`, then `index-sample.html#regions/<region id>`; the report shows for that region against the rest, with chart switching, table and sources as everywhere else. An unknown id shows its error in its own panel only.

## 10. Add a column to a list

Use to show one more field on a list report: the new business rows (`nb-rows`), the accounts (`cg-accounts`) or the partners (`pt-list`).

**Attach:** the list's definitions file (`config/reports-newbusiness.js`, `config/reports-customers.js` or `config/reports-partners.js`), `js/engine/rows.js` (the columns each list can show), `content/text-engine2.js` (column headings), `docs/DATA-CONTRACT.md` (the fields in the data file).

```
In this app, a list report shows one row per new business row, account or partner. Its definition names its columns by key, from the keys js/engine/rows.js offers for that row source (TAP.rows.columns). Add the column "<field>" to the list "<report id>", after "<column key>".
If rows.js already offers the key, change only the definition's columns list. If it doesn't, say so: name the data contract field it would read, its unit (money, pct, count or text) and its kind (leader input, system figure or calculated), and propose the rows.js entry and the heading for content/text-engine2.js separately. Never read a field the data contract doesn't list.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a changed `columns` list in the definition, or a separate proposal for `js/engine/rows.js` and `content/text-engine2.js`. Check: open `tests.html`, then the list. The new heading carries its value kind and sorts like the others, and selecting a row still opens its details.

## Extending the app to more of the template

Prompts 11 to 13 follow the three levels in `docs/EXTENDING-TEMPLATE.md`: an extra section (data only), a measure and a report (configuration), and a new view (code). Use the lowest level that answers the question. Attach exactly the files listed: they hold everything Copilot needs, and nothing else from the folder is required.

## 11. Add a template section as an extra section

Use when a sheet of the template should be visible, region by region, without its own chart.

**Attach:** `docs/EXTENDING-TEMPLATE.md`, `docs/DATA-CONTRACT.md`, `js/core/extra.js` (how the app reads and checks extra sections), `content/text-extra.js` (the wording of its warnings), `config/import-map.js` (the mapping; its `extra` list describes extra sections) and `docs/ARCHITECTURE.md` (section 20.1). In Copilot only: one real workbook, or a screenshot of the sheet's header rows.

```
Our planning template has a sheet the app doesn't show yet: "<sheet name>". Following level 1 of the attached EXTENDING-TEMPLATE.md, the "Extra sections" part of the data contract and the extra list in section 20.1 of ARCHITECTURE.md, extend our mapping, config/import-map.js, so the app's importer writes this sheet as an extra section.
Step 1: From the workbook, list the sheet's columns and propose for each: a key, a heading, a unit (money, pct, count or text), a kind (IN leader input, PRE system figure, DER calculated in the workbook) and the column letter. Propose the section's id, title (the sheet name), a one-sentence intro, the first data row and the key column whose blank cell marks a spare row. Wait for my answers.
Step 2, after I answer: add the entry to the mapping's extra list, no code. The importer then writes the meta.extraSections entry and, for every region, extra.<section id> with one row per filled worksheet row: its sourceRow, one field per column, null for a blank cell, money in thousands, spare rows and personal names left out. Change nothing else in the mapping. Tell me to save it, import again from the Import button and paste the report back.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a column table to confirm, then one entry for the mapping's `extra` list and no code. Check: save the mapping, import again from the **Import** button and read the report, then **Use these plans now** and read the data sources panel: problems in an extra section are warnings naming the section and the field, and never stop the app. Open **Other sections**, check one row per region against the workbook through its details (file › sheet › cell), then run `tests.html`.

## 12. Chart a figure from an extra section

Use when a figure from an extra section should be compared across regions as a chart on an existing view.

**Attach:** `docs/EXTENDING-TEMPLATE.md`, `docs/DATA-CONTRACT.md`, `config/reports.js` (the report schema), the view's definitions file (for example `config/reports-customers.js`), `config/views.js`, `js/engine/measures.js` (how measures are defined), `js/engine/rows.js` and `js/core/extra.js` (how an extra section's rows and cells are read), `tools/build-pages.js` (the script list). In the chat, paste the section's `meta.extraSections` entry from the data file (its description only, no rows).

```
Following level 2 of the attached EXTENDING-TEMPLATE.md, add a chart to the <view> view that answers: "<question>". It reads the extra section "<section id>" described below.
<paste the meta.extraSections entry>
Write: (1) a new file js/engine/measures-local.js, with its header, defining the measure(s) with TAP.measures.define, reading rows only through TAP.rows with the source "extra:<section id>", keeping each figure's source rows, and returning a blank cell, never zero, when nothing was provided; (2) the measure labels for a wording file under content/; (3) one report definition for the view's definitions file, following config/reports.js, with its id added to the view's list in config/views.js; (4) the line to add to tools/build-pages.js. Use only existing shapes and chart types. Say which existing measure, if any, already answers the question instead.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a new measures file, a wording entry, one definition, a one-line change to `config/views.js` and one to `tools/build-pages.js`. Check: run `node tools/build-pages.js` (or add the `<script>` line to the three pages by hand), open `tests.html` (all pass, including the report definitions), then the view in `index-sample.html` and `index.html`: chart, table and the source line all work.

## 13. Add a view

Use when a section needs a page of its own, with several reports and a menu entry.

**Attach:** `docs/EXTENDING-TEMPLATE.md`, `docs/ARCHITECTURE.md` (views and the menu, sections 11 and 17), `config/views.js`, `js/views/partners.js` and `js/views/customers.js` (a small view and the layout it uses), the report definitions the view will show, `content/text-customers.js` (how view wording is written), `tests/test-partners.js` (a view's tests) and `tools/build-pages.js`.

```
Following level 3 of the attached EXTENDING-TEMPLATE.md, add a view called "<menu title>" that asks "<question>" and shows these reports: <report ids>. It goes in the menu after "<view>". It should appear only when <condition, or "always">.
Write: (1) js/views/<id>.js, with its header, registering the view and reusing TAP.cgpLayout as js/views/partners.js does (with available() if it is conditional); (2) the change to config/views.js (menu order and report list); (3) the view's wording (kicker, title, lead, label) for a content/ file; (4) a test file modelled on tests/test-partners.js: the view mounts, its title is the question, its menu position; (5) the lines to add to tools/build-pages.js for the view and the tests. Don't change any other view.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one view file, one test file, small changes to `config/views.js`, a wording file and `tools/build-pages.js`. Check: run `node tools/build-pages.js`, open `tests.html` (all pass), then `index-sample.html` at 1280 px wide and at 125% and 150% zoom: the menu still fits, the number keys follow the menu order, and the view's reports switch charts, show tables and name their sources.

## Presenting and building charts in the meeting

Phase 3 added presentation mode, which plays a meeting's presentation full screen, one step at a time, and "Build a chart" in the menu, which makes a chart from any measure that allows it. Prompts 14 and 15 help with both.

## 14. Set the presentation for a meeting

Use before a meeting, to fix the steps of the saved presentation, which the Guide's "Present the saved presentation" plays: which report, measure, chart type, comparison and highlight each step shows, in order. (**Present** and the P key present the charts on the page as they are on screen, so a saved list is needed only for a set running order.)

**Attach:** `config/running-order.js` (the current presentation), `docs/ARCHITECTURE.md` (section 18.2 explains every field of a step), `config/views.js` and the definitions files of the reports you want (for example `config/reports-newbusiness.js`). If you made a presentation from the screen with "Add to presentation", paste the text that "Copy as file text" in the Guide gives you into the chat.

```
Write config/running-order.js for this app's presentation mode. Keep its header comment and set window.TAP_RUNNING_ORDER = { steps: [...] }, with each step in the shape described in section 18.2 of the attached ARCHITECTURE.md.
The meeting runs in this order:
1. <what to show, e.g. "the new business by industry heatmap, all regions">
2. <e.g. "the same report, <region id> against the average of the rest, highlighting <region id>">
3. <e.g. "the insight about <topic>">
<more steps>
Use only report ids from the attached definitions files and measure ids those reports list; for an insight step, use the insight id I give you. If I pasted recorded steps, start from them and change only what I ask. Give each step a short title. If a step asks for something the reports can't show, say so instead of inventing an id.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one file to save over `config/running-order.js`. Check: open `index-sample.html` (or `index.html`), open the Guide and choose "Present the saved presentation" under "Your presentation": the progress row shows "Step 1 of n" and the first title, and the arrow keys step through. A step that can't be shown is skipped and listed in the data sources panel with the reason; fix it and try again. Esc returns to the view you were on, with your comparison as it was.

## 15. Keep a custom chart as a report, or offer a measure in "Build a chart"

Use when a chart someone built in the meeting should stay (custom charts last for the session only), or when a measure is missing from the "Build a chart" lists.

**Attach:** `js/engine/custom.js` (how the choices and the definition are made), `config/reports.js` (the schema), the target view's definitions file (for example `config/reports-customers.js`), `config/views.js`, and the measure files: `js/engine/measures.js`, `js/engine/measures-p2.js`, `js/engine/scores.js`. In the chat, give the chart's measure, "by" and chart type as its panel shows them.

```
In this app, "Build a chart" makes a custom report definition from a measure, a dimension ("by") and a chart type, as js/engine/custom.js shows; custom charts last for the session only.
Task A, to keep a chart: turn the custom chart <measure id> by <entity | industry | channel | segment | year> as <chart type> into a permanent report on the <view> view. Write one definition in the view's file following config/reports.js, with an id that doesn't start with "custom:", the title phrased as the question "<question>", the three explanation texts, the same measure and breakdown, and the chart type as the default. Add its id to the view's list in config/views.js.
Task B, to offer a measure: the measure <measure id> doesn't appear in "Build a chart" (or not by <dimension>). Explain from its metadata (unit, valueKind, dims) why, and propose the smallest change to its dims, only if that combination makes sense for the measure (a rate must never be summed).
Do only the task I name: <A | B>.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** for A, one definition and a one-line change to `config/views.js`; for B, an explanation and a one-line change to the measure's `dims`, or a reason to leave it. Check: open `tests.html` (all pass), then the view, or "Build a chart" in the menu: the measure appears with the new choice, and a chart built from it shows the "Custom chart" badge and the same figures as its table.

## The full template

Prompt 16 brings the parts of the full template into a mapping that already covers the four sections: the recap blocks, the order intake sheet for the year before the plan, and the new columns. Section 4 of `docs/IMPORT-BRIEF.md` says where each new field comes from; the importer reads them once the mapping names the blocks.

## 16. Extend the mapping to the full template

Use once the mapping covers the four sections and the workbooks are the full template: the recap on its own sheet, the order intake sheet for the year before the plan, and the new columns on New Business and Partner.

**Attach:** `config/import-map.js` (the mapping so far), `docs/IMPORT-BRIEF.md` (section 4 maps every new field to its sheet and block), `docs/DATA-CONTRACT.md` (the "Full template" part), `docs/ARCHITECTURE.md` (section 20.1: the grid blocks' axes and the `baseYear` section), `tests/fixtures/import-maps.js` (its `miniP4` mapping has every full-template block). In Copilot only: one real workbook of the full template.

```
Our workbooks are now the full planning template. Following section 4 of the attached IMPORT-BRIEF.md, the "Full template" part of the data contract and section 20.1 of ARCHITECTURE.md, extend our mapping, config/import-map.js, so the app's importer also reads the new parts. The miniP4 mapping in import-maps.js is a small example of them.
Step 1: From the workbook, list where each field in the brief's section 4.1 table sits. For the recap sheet: its region filter cell, and for each grid block (order intake at customer value, revenue outlook, books value, the strategic plan with its variance cells, route to market) the first row and column and the order of its axes by plan year, channel, motion, type, product category and route, or the enumerated cells where a block is irregular. For the order intake sheet: the first row, the column of each field, which of its two forecasts is the later one, and the cells of the year and the last month of actuals. On New Business: the solution column. On Partner: the type, maturity, support %, distribution and services columns per plan year, and the outsourcing % cell. List the dropdown values of the hidden lists sheet for solutions, partner types and partner maturity, and propose a stable id for each. Wait for my answers.
Step 2, after I answer: write the whole config/import-map.js, no code, with a header comment of your own in the same shape as the attached file's (File, Purpose, Provides, Depends on, Used by) saying that the file describes the real template, is kept in the internal copy only and is filled by hand from the real workbooks, never generated. Add: the five new lookups (productCategories, solutions, partnerTypes, partnerMaturity, routes) with the real names and the ids we agreed; aliases for other spellings; the grid blocks revenue, booksValue, strategicPlan (with its variance columns) and routes, each with the filter cell; the baseYear section with the later forecast column; the new columns on newBusiness and partners; and the outsourcingPct cell. Change nothing in the four existing sections except the recap block's sheet and filter cell. Tell me to save it over the mapping in the internal copy, import again from the Import button and paste the report back.
Step 3: The importer's report already runs these checks on every region and writes each mismatch as a note with its sheet and cell: the strategic plan variance equals the plan (the books value of that year and category) minus the strategic plan; revenue is never above the order intake (recap, customer value) of the same year, channel and motion; books value is never above customer value for Partner, Alliance A and Alliance B over ARR and services; the coverage ratio is within 5% of pipeline over forecast minus actuals; every solution, partner type, maturity and route names an entry of its lookup. Read the notes I paste back, group them by cause, and say for each whether it is a mapping problem, a workbook saved without recalculating, or a figure to accept as it is. Never change a figure.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a location table and the lookup values to confirm, then one complete mapping and no code, then the report's notes grouped by cause (an empty list is possible). Check: import from the **Import** button and read the report: the full template's blocks list as read for the regions that have them, and every note carries its sheet and cell. Then **Use these plans now**; open **Outlook**, the new charts on **New business** and **Partners**, and one region profile; **Save data/plan-data.js** and move it into `data/`; and work through the full template part of `docs/REAL-DATA-CHECKLIST.md`. The app's own check repeats the same comparisons as warnings in the data sources panel.
