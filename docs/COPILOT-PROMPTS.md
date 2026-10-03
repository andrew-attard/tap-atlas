# Starter prompts for Copilot

Ready-made prompts for the common tasks in the real-data phase, run in Microsoft 365 Copilot. Each prompt names the files to attach and the result to expect.

Generic on purpose: these prompts use generic terms. Organization-specific details (real terms, region names, brand colours) are typed into the Copilot chat or kept in the internal project folder, outside this repository (D2).

## How to use these

- Copilot is a chat assistant. It sees only what you attach or paste, so attach every file listed, by its path in the app folder.
- Start a new chat per task. Paste the prompt from its box, fill in anything in `<angle brackets>`, then attach the files.
- Copilot cannot run the app. You save its files into the folder, open the page, and paste back anything that went wrong.
- Real data stays on your laptop and in Copilot. Files that hold real data or organization details (`data/plan-data.js`, `content/organization.js`, a branded `js/theme.js`) live only in the internal copy of the folder and never go to the public repository.
- Every prompt repeats the same constraints paragraph, so Copilot keeps to the build's rules even when a chat starts cold.

## Where things live

From `docs/ARCHITECTURE.md`. A file marked "planned" is named by the build plan and may not exist yet in your copy.

| Area | Files |
|---|---|
| Pages | `index.html` (internal edition: real data and organization layer), `index-sample.html` (sample data), `tests.html` (test page) |
| Data | `data/plan-data.js` (real, from the import), `data/sample-plan-data.js` (fictional) |
| Data rules | `docs/DATA-CONTRACT.md` (the contract), `js/core/check.js` (the contract check), `js/core/sources.js` (file › sheet › cell) |
| Look | `js/theme.js` (every colour, font, size and the logo) |
| Settings | `config/settings.js` (weights, thresholds, limits) |
| Reports | `config/reports.js` (the schema), `config/reports-overview.js`, `config/reports-industry.js`, `config/views.js` |
| Measures | `js/engine/measures.js`, `js/engine/scores.js` |
| Insights | `config/insight-rules.js` (rules, thresholds, wording), `js/insights/engine.js`, `js/insights/rules-*.js` |
| Wording | `content/glossary.js`, `content/guide.js`, `content/ui-text.js`, `content/text-*.js` |
| Organization layer | `content/organization.example.js` (starter), `content/organization.js` (yours, never committed) |
| Handover | `README.md`, `docs/IMPORT-BRIEF.md`, `docs/REAL-DATA-CHECKLIST.md` |

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

## 2. Build the import from the brief

Use to design and build the import that turns the regional workbooks into the data file.

**Attach:** `docs/IMPORT-BRIEF.md`, `docs/DATA-CONTRACT.md`, `tests/fixtures/mini-data.js` (a small, valid example of the file's shape). In Copilot only: one real workbook, or screenshots of each sheet's header rows.

```
I need an import that turns our regional planning workbooks into the one data file this app reads. The attached brief sets the requirements; the data contract sets the exact output shape; mini-data.js is a small valid example of that shape. I have also attached one real workbook.
Step 1: Compare the real workbook with section 3 of the brief. List every difference: extra or missing sheets, sections, columns or rows, and header wording.
Step 2: For each open choice in section 6 of the brief, give your recommendation with its pros and cons for our workbooks. Do not decide for me: wait for my answers.
Step 3, after I answer: build the import in small files, each with a header comment. It must meet requirements R1 to R9, apply the validation rules in section 5, write import notes with sheet and cell, fill meta.sourceMap and sourceRow, keep blanks as null, and leave out personal names. Tell me exactly how to run it and where to save data/plan-data.js.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** first a list of layout differences and a recommendation per open choice, then a pause for your decisions. After that: the import's files, a template mapping for this template version, a validation report per region, and run instructions. Record your decisions in the internal project folder. Then check the output with prompt 6 and `docs/REAL-DATA-CHECKLIST.md`.

## 3. Fill the organization layer

Use to add organization terms, short region names, tour wording and the internal confidentiality label.

**Attach:** `content/organization.example.js`, `content/glossary.js`, `content/guide.js`, `content/ui-text.js`. In the chat, type the terms, region short names and label wording you want.

```
Create content/organization.js for this app from the attached starter file, content/organization.example.js. Follow its format exactly, using its commented examples. Fill in:
- these organization terms and acronyms: <list, each with a one-line definition>;
- short display names for each region, keyed by the region ids in our data file: <id: short name, ...>;
- the internal confidentiality label: <wording>, shown on every screen;
- any tour or planning-explainer wording to replace: <optional>.
Where a term already exists in glossary.js, write the organization version so it replaces the general one. Return the whole file.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one complete `content/organization.js` in the starter's format. Save it next to the starter (it is gitignored and loaded only by `index.html`). Check: open `index.html`; the internal label shows on every screen; region labels use the short names; a marked term shows the organization definition. If the file is broken, the data sources panel says so and the app falls back to the general wording.

## 4. Apply branding through the theme file

Use to apply the organization's colours, font and logo.

**Attach:** `js/theme.js`. In the chat, give the brand colours, font name and logo file name.

```
Rebrand this app by changing only the attached theme file, js/theme.js. Brand colours: <list with their use>. Font: <name>, falling back to the current fonts. Logo: <file name>, stored in the folder at assets/<file name>.
Keep every existing key and comment; change values only. Keep body text contrast at 4.5:1 or better on its background. Keep the region colours distinct for colour-blind viewers, never red (red means highlight) and never grey (grey means the rest). Keep the accent for interface elements only. Return the whole file and a short table of what changed.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a full replacement `js/theme.js` with the same keys, plus a change table. Save it in the internal copy of the folder only, with the logo under `assets/`. Check: open `tests.html?suite=theme` (all pass, including the colour-blind check), then `index.html` (charts and page pick up the new look). A brand font that isn't stored in the folder falls back to the next font in the list.

## 5. Tune insight thresholds and weights

Use when an insight fires too often, too rarely, ranks too high or reads unfairly. To drop one for a single session, use "Hide for this session" in the app instead: no file change needed.

**Attach:** `config/settings.js`, `config/insight-rules.js`, `docs/PLANTED-CASES.md` (what each rule is meant to find). In the chat, quote the insight sentence and say what's wrong.

```
In this app, insights are rule-based. config/insight-rules.js holds each rule's thresholds (params), wording (template) and on/off switch (enabled); config/settings.js holds the ranking weights (insights.weights, insights.familyWeights) and the score weights. This insight is a problem: "<insight sentence>". The problem: <fires too often | ranks too high | wording unfair | ...>.
Propose the smallest change to settings or rule definitions that fixes it, without editing any code file. Give a table: file, setting, old value, new value, why, and what else it will change. Then return only the changed entries.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** a change table and the changed entries only, in configuration files. Check: open `tests.html`. If an insight test fails, the new value no longer finds a planted case in the sample data; decide with Copilot whether the change is still right and record the decision. Then open `index.html` and reread the Insights page.

## 6. Fix data file errors from the contract check

Use when `index.html` stops with "The data file has problems that stop the app from opening", or when the data sources panel lists warnings.

**Attach:** `docs/DATA-CONTRACT.md` and the import's files. Paste the list copied with **Copy the list** (or the data sources panel notes).

```
The app checked our data file against the attached data contract and reported the problems below. Each line names the field, the region, the item and what was expected.
<paste the copied list>
Group the problems by cause. For each cause, say whether it is a bug in the import (show the fix in the import's code) or a problem in a workbook (say which file, sheet and cell to check, and how the import should record it as a note). Fix the import, never the data file by hand, so the fix repeats on the next run.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** problems grouped by cause, with import fixes and a list of workbook cells to check. Re-run the import, save `data/plan-data.js` and reopen `index.html`. Repeat until the app opens and the data sources panel holds only notes you have read and accepted.

## 7. Add a report

Use to add a chart for a question the current views don't answer.

**Attach:** `config/reports.js` (the schema), the view's definitions file (`config/reports-overview.js` or `config/reports-industry.js`), `config/views.js`, `js/engine/measures.js` (the measures that exist).

```
Add a report to this app. The question it should answer: "<question>". It belongs on the <overview | industry> view. Reports are definitions that follow the schema documented in config/reports.js; no chart code is needed for an existing data shape.
Write one new definition in the view's file: an id, the title phrased as the question, the three explanation texts, the shape, the measures, the default and allowed chart types, the breakdowns and the source kinds. Add its id to the view's list in config/views.js. Use only measures that exist in js/engine/measures.js. If one is missing, say so and propose it separately; don't invent an id.

Constraints: The app is opened from a file (file://), with no server and no build step. Classic <script> tags only: no modules, import/export, fetch or eval. No web libraries, CDN links or web fonts; anything needed is stored in the folder. Keep each file small (under about 300 lines) with its header comment. docs/DATA-CONTRACT.md is the only interface between the data and the views. Never put real data or organization names into files that go to the public repository.
```

**Expect:** one definition and a one-line change to `config/views.js`, plus a separate proposal if a measure is missing. Check: open `tests.html?suite=report%20definitions` (the new definition validates), then `index.html`; an invalid definition shows its error inside its own panel only, so the rest of the view still works.
