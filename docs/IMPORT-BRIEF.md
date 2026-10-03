# Import brief for Copilot

What the import must do, so it can be built in Microsoft 365 Copilot with the real workbooks in view. The import turns the regional planning workbooks into the one data file the app reads.

This brief sets the requirements and lists the open choices. It does not decide how the import is built: that is decided in the Copilot phase, once the real workbooks and their differences can be seen (decision D27).

## Copilot early pack

Give Copilot these first, in one new chat, before any real workbook. They are enough to start designing the import a day early.

| Give | Why |
|---|---|
| `docs/DATA-CONTRACT.md` | The exact shape of the data file. It wins wherever another document differs |
| `docs/IMPORT-BRIEF.md` (this file) | What the import must do, and the choices still open |
| Prompt 2 in `docs/COPILOT-PROMPTS.md` | The ready-made prompt that starts the work |
| `tests/fixtures/mini-data.js` | A small valid example of the shape: four regions, every section, a full `meta.sourceMap`. It sets `window.TEST_FIXTURES.mini` and has `isSample: true`; the real file sets `window.PLAN_DATA` and has `isSample: false` |
| `js/core/check.js` and `content/text-data.js` | The app's contract check and the wording of its messages, so Copilot knows what the app will reject and how each problem is reported |

Then add one real workbook, or screenshots of each sheet's header rows, inside Copilot only.

**Read with:** `docs/DATA-CONTRACT.md` (the exact shape of the data file; it wins wherever this brief and the contract differ) and `docs/ARCHITECTURE.md` (how the app uses the file).

**Generic on purpose.** This copy uses generic terms: the organization, regional leader, planning template, Product line 1 to 3, Alliance A and B. It holds no real sheet names, region names, cell addresses or figures. Organization-specific details (the real template's sheet names and layout, the region list, short names) go in the internal project folder, outside this repository (D2). Never add them here.

## 1. The job in one paragraph

About seven regional leaders each fill in the same planning template, one workbook per region. The import reads those workbooks, checks them, and writes one JavaScript file, `data/plan-data.js`, that sets `window.PLAN_DATA`. The app loads that file with a plain `<script>` tag when `index.html` is opened from the folder. Viewers never need the workbooks. When a workbook changes, the import is run again and the file is replaced.

## 2. Requirements (fixed)

These carry over from decisions D11, D26, D27 and D1. However the import is built, it must meet all of them.

| # | Requirement | What it means in practice |
|---|---|---|
| R1 | **Repeatable** | Running it again on the same workbooks gives the same file. Refreshing one region, or all of them, takes minutes, not a rebuild. No hand edits to the output. |
| R2 | **Checked before presenting** | It validates every workbook (section 5) and reports problems per region **before** the data file is replaced. A problem surfaces at import time, never in front of the audience. |
| R3 | **One data file matching the contract** | Output is exactly one file, `data/plan-data.js`, setting `window.PLAN_DATA = { meta, lookups, regions }` as in `docs/DATA-CONTRACT.md`, with `meta.schemaVersion` equal to the version the app reads (`TAP.schemaVersion` in `js/core/namespace.js`, now `"0.2"`). Every field the contract lists must be there. Extra fields and sections are allowed: the app's check ignores them (D47). |
| R4 | **Every figure traceable to file › sheet › cell** | Every list item carries `sourceRow` (the worksheet row it came from). `meta.sourceMap` gives, per section, the sheet name and the column of every field (plus fixed cells for single values). Recap items carry `sourceCell`. Each region's `source.fileName` names the workbook. Together they give an address such as `Region C plan.xlsx › 1. Market Coverage › E17`. |
| R5 | **Three missing-value states** | A number, including `0`, means the leader entered it. `null` means the cell was blank ("not provided"); never turn a blank into `0` or `""`. Not applicable is not stored: it follows from the template's rules (unrated rows, Tier 3 industries with no New Business rows). |
| R6 | **Import notes with sheet and cell** | Anything worth checking that doesn't stop the import goes into the region's `source.notes` as `{ message, sheet, cell }`. The app shows these only in the data sources panel. |
| R7 | **No personal names** | Account managers and any other personal names are left out. Account names stay in one field, `accounts[].name`, so they can later be swapped for anonymous labels (D14, provisional). Free-text fields (commentary, success factors) are copied as written, so they are reviewed by eye during the real-data run. |
| R8 | **Real data stays in approved tooling** | Workbooks and the data file stay on the data owner's laptop and in Copilot. They never go into the public repository (the data file is gitignored) or into any other assistant. |
| R9 | **Finished values, not formulas** | Read the stored results the template already calculated (D5). Do not recreate the template's formulas, except the simple cross-checks in section 5. |

**Also useful:**
- Keep regions in the same order on every run: file order sets each region's colour.
- Record a source per region: `fileName`, `fileModified` (the workbook's last-saved date), `importedAt`.
- Fill `meta.templateVersion` with the template mapping used, so a later template revision gets its own mapping.

## 3. The planning template

What the copy reviewed contains. Field-level detail, types and source tags are in `docs/DATA-CONTRACT.md`.

One workbook per region, four sections, each on its own sheet. Three-year horizon (Year 1 to Year 3). Money in thousands of one currency.

| # | Section | One row is | Contract key |
|---|---|---|---|
| 1 | Market Coverage | an industry (fixed list of about 18, plus "Other" and "Unapplied industry") | `marketCoverage[]` |
| 2 | New Business | a sub-industry in a geographic market (free rows, Tier 1 and 2 industries only) | `newBusiness[]` |
| 3 | Customer Growth | an existing customer account (pre-filled, with spare rows) | `customerGrowth.accounts[]`, plus `thresholds` |
| 4 | Partner and Recap | a partner, plus a recap grid by year, channel, motion and type | `partners[]`, `recap[]` |

**Three kinds of cell, plus what the import adds.** Every value is one of the first three, and the app labels each figure with its kind:

| Tag | Kind | Examples |
|---|---|---|
| IN | Leader input | Tier choice, the six ratings, target accounts, hit rate, growth %, commentary |
| PRE | System pre-fill (from CRM exports and a central model) | Current ARR, pipeline, account lists, services ratios |
| DER | Derived by the template's formulas | ARR potential, services potential, segment, recap totals |
| IMP | Added by the import | Ids, `sourceRow`, `sourceMap`, source records, notes |

**Section by section:**
- **Market Coverage.** Per industry: three attractiveness ratings (growth potential, criticality, competitive intensity) and three ability-to-win ratings (references, expertise, product fit), each on a three-level scale stored as 3 (favourable) to 1 (unfavourable). Also current ARR, total pipeline, pipeline created in the last 12 months, tier (1 group priority, fixed by group strategy; 2 focus; 3 opportunistic) and commentary. "Other" and "Unapplied industry" keep their pipeline but have no ratings or tier.
- **New Business.** Per row: industry, market, sub-vertical, channel split across Direct, Partner, Alliance A and Alliance B (summing to 100%), target accounts, hit rate, average deal size, growth for Year 2 and 3, success factors. Derived: ARR and services potential per year, tier (looked up from Market Coverage). Pre-filled: services ratio.
- **Customer Growth.** Thresholds set by the leader, then per account: name, industry, country, product line, current ARR, risk level (high, medium or blank), growth % per year **or** a 3-year multiplier, services ratio. Derived: incremental ARR, services order intake, cumulative order intake, segment (strategic, growth, core or scaled, from the thresholds).
- **Partner and Recap.** Partners: name, channel, maturity, expertise (geography, product), sales and consultant FTE, central support %, ARR and services per year. Recap: order intake per year by channel, new business vs customer growth, ARR vs services. The import flattens the recap grid into one row per combination, each with its `sourceCell`.

**Left out on purpose:** revenue release rates, monthly phasing, gross-up factors, check columns, instruction text, spacer rows, and personal names.

**Layout traits that matter for reading it:** two-row merged headers, instruction blocks above each table, spare rows marked "keep open", calculation blocks to the right and below. Formulas point to a linked central workbook, so read the stored values; a workbook saved without recalculating can hold stale results (one validation rule catches this).

## 4. The real template has more

The copy reviewed is a first version. The real template has more sections than the four above. The current contract covers only those four, so:

- **The import may carry new sections early.** The app's contract check ignores fields and sections the contract doesn't name: they are neither errors nor warnings (D47). Nothing on screen uses them until the contract is extended.
- To show one in the app: agree the fields first, then extend `docs/DATA-CONTRACT.md` (field, type, tag, notes), the contract check (`js/core/check.js`), `meta.sourceMap`, and any measure or report that will show it.
- **The version rule.** Adding a field or section never changes `meta.schemaVersion`. Raise it only when an existing field changes meaning or shape, and change `TAP.schemaVersion` in `js/core/namespace.js` to match at the same time. A mismatch stops the app with a version message.
- Allowed values not in the copy reviewed (partner maturity, some rating dropdowns) need confirming against the real template.

## 5. Validation rules

From the contract. The import applies them to every workbook before writing the file.

| Rule | Error (stops this region) or note |
|---|---|
| Every region has all four sections and the expected industry list | Error if a section or the industry list is missing; note if a section is present but empty |
| Channel splits sum to 100%, within rounding | Note with the row's cells (e.g. a split that adds up to 95%) |
| `arrPotential` Year 1 = target accounts × hit rate × average deal size | Note: a mismatch usually means the workbook wasn't recalculated before saving |
| Segment matches the thresholds rule | Note on the account's segment cell |
| Ratings and tiers use only allowed values | Note, and the value is imported as `null` (e.g. a rating cell holding text that isn't an allowed option) |
| Blanks stay blank | Never converted to `0` or `""` |

The **segment rule**, checked in this order: current ARR above the strategic threshold is Strategic; below the scaled threshold is Scaled; 3-year order intake above the growth threshold and ARR above the growth ARR threshold is Growth; otherwise Core.

Errors stop the import **for that region only**. Everything worth a look goes into `source.notes` with its sheet and cell. Which problems count as errors and which as notes beyond this table is for the import's design to settle.

**A second check in the app.** When the app opens, it checks the data file against the contract again (US-1.8.2). Problems that would break views stop it loading, with a precise list; smaller ones load and appear in the data sources panel. See section 8.

## 6. Open choices (not decided)

Each depends on the real workbooks, so each is left for the Copilot phase. The pros and cons are a starting point, not a recommendation.

### 6.1 Fixed cell addresses vs finding headers

| | Fixed cell addresses (a mapping per template version) | Finding headers (search for the header text, then read below it) |
|---|---|---|
| How | A mapping says "growth potential is column D from row 10 on sheet 1" | The import looks for each header's text and works out the columns |
| Pros | Simple and predictable. Exact cell addresses for tracing come for free. Fast. Easy to review. Matches the template's own versioning | Survives inserted columns or rows. One import can handle small layout differences between regions |
| Cons | Breaks if a leader inserted a column or row; each break needs a mapping change. Needs a separate check that the layout is as expected | Merged two-row headers and instruction text make matching fragile. Header wording may differ. Harder to test. Must still record the actual cell it read |
| Decide by | Whether leaders altered the template. If all workbooks match, fixed addresses are enough | If several workbooks differ, finding headers (or a per-region mapping) may be needed |

A middle path is possible: fixed addresses plus a check that the expected header text sits where the mapping says, raising an error if not.

### 6.2 Region names: from the workbook vs a short-name list

| | From the workbook | A short-name list |
|---|---|---|
| How | Read the region name from a cell or the file name | A small list maps each workbook to a fixed id and display name |
| Pros | No extra file to keep. Always matches what the leader wrote | Stable ids and order across refreshes (colours stay put). Short names fit charts. Survives renamed files |
| Cons | Names may be long, inconsistent or change between versions. Ids and order may shift | One more thing to maintain. A new region needs a list entry |

Note: the organization layer can already give short display names on screen (`TAP_ORG.regions[id]` in `content/organization.js`), keyed by the region's `id`. So the data file's `id` must be stable either way; the choice is mainly where `id`, `name` and order come from.

### 6.3 An import page in the browser vs another approach

| | Import page in the app folder | Another approach Copilot recommends (for example an Excel script or macro, or Power Query, producing the data file) |
|---|---|---|
| How | The owner opens a local page, picks the workbooks, sees the validation report, and saves the data file | Runs inside Excel or another approved tool and writes the same file |
| Pros | Same platform as the app (opened from a file, no install). Runs entirely on the laptop. Can show the validation report on screen | May read workbook values more reliably. May fit the organization's approved tools better. No spreadsheet library to store |
| Cons | Needs a spreadsheet-reading library stored in the folder (nothing from the web). Browsers can't save over a file directly, so the owner saves a download into `data/` | Might need permissions or tools not available on every laptop. A second platform to maintain. Must still produce exactly the contract's file |

Whatever is chosen: it runs on the data owner's laptop, keeps R1 to R9, and lives outside the public repository unless it is fully generic.

## 7. Output checklist

Before calling the import done, the data file should have:

- [ ] `window.PLAN_DATA = { meta, lookups, regions }` (extra sections are allowed, D47)
- [ ] `meta.schemaVersion` as in `docs/DATA-CONTRACT.md`, `meta.isSample` set to `false`, `meta.currency`, `meta.years`, `meta.generatedAt`, `meta.templateVersion`
- [ ] `meta.sourceMap` covering every field the views read, in the shape shown in `tests/fixtures/mini-data.js`
- [ ] the same `lookups` (industries, product lines, channels, tiers, segments, scales) for every region
- [ ] per region: a stable `id`, `name`, `source` with notes, and all five lists (`marketCoverage`, `newBusiness`, `customerGrowth`, `partners`, `recap`)
- [ ] `sourceRow` on every list item and `sourceCell` on every recap item
- [ ] `null` for blanks, never `0` or `""`
- [ ] no personal names

## 8. How to check the result

1. Save the file as `data/plan-data.js` in the app folder.
2. Open `index.html` by double-clicking it (Chrome, or Edge).
3. If the app stops with "The data file has problems that stop the app from opening", press **Copy the list**. Each line names the field, region, item and what was expected, for example `regions[2].marketCoverage[5].tier: expected 1, 2 or 3, found 'Tier 2'`.
4. Paste the list into Copilot with the import code and `docs/DATA-CONTRACT.md` (prompt 6 in `docs/COPILOT-PROMPTS.md`). Fix the import, not the data file, so the fix repeats on the next run.
5. Repeat until the app opens. Then open the data sources panel (click the "Data:" date on the comparison bar) and read every region's import notes and dates.
6. Spot-check at least one figure per section per region: hover it or use table view, read its file › sheet › cell, and confirm it in the workbook.

The full run, step by step, is in `docs/REAL-DATA-CHECKLIST.md`.
