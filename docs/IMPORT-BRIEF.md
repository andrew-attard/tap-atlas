# Import brief

What the import does and the rules it keeps. The import turns the regional planning workbooks into the one data file the app reads, and it runs inside the app (D147): the data owner presses **Import**, picks the workbooks, reads the report and saves the file. Nothing is built for it in the real-data phase. What the organization's approved AI tool (for example Microsoft 365 Copilot) produces is the **mapping**, `config/import-map.js`: data that says where every field sits in the real template. It writes no code and never writes the data file.

This brief sets the requirements the importer meets (sections 2 to 5), records the choices that were open before the importer was built and how each was settled (section 6), describes the mapping file (6.4), and says how to check a run (section 8).

## The pack for filling the mapping

Give the approved tool these first, in one new chat, before any real workbook. They are enough to fill the mapping from the real template.

| Give | Why |
|---|---|
| `config/import-map.js` | The sample mapping: the exact shape to fill, describing the fictional sample's layout. The real one replaces it in the internal copy |
| `docs/ARCHITECTURE.md`, section 20 | The mapping's shape field by field (20.1), what the cells may hold (20.2) and the checks the importer runs (20.3) |
| `docs/IMPORT-BRIEF.md` (this file) | The rules the importer keeps, the template's sections, and how to test the mapping |
| `docs/DATA-CONTRACT.md` | The exact shape of the data file. It wins wherever another document differs |
| Prompt 2 in `docs/COPILOT-PROMPTS.md` | The ready-made prompt that starts the work |
| `tests/fixtures/import-maps.js` | A second example: the mappings of the small test fixtures, including one with the full template's blocks |

Then add one real workbook, or screenshots of each sheet's header rows, inside the approved tool only. For the full template's parts, prompt 16 in `docs/COPILOT-PROMPTS.md` extends a mapping that already covers the four sections.

**Read with:** `docs/DATA-CONTRACT.md` (the exact shape of the data file; it wins wherever this brief and the contract differ) and `docs/ARCHITECTURE.md` (section 20 for the importer and the mapping, the rest for how the app uses the file).

**Generic on purpose.** This copy uses generic terms: the organization, regional leader, planning template, Product line 1 to 3, Alliance A and B. It holds no real sheet names, region names, cell addresses or figures. Organization-specific details (the real template's sheet names and layout, the region list, short names) go in the internal project folder, outside this repository (D2). Never add them here.

## 1. The job in one paragraph

About seven regional leaders each fill in the same planning template, one workbook per region. The import runs inside the app: the data owner presses **Import**, picks the workbooks, and the app reads them in the browser through the mapping in `config/import-map.js`, checks every region, shows a report, and then offers two things: **Use these plans now**, which shows the imported plans at once, and **Save data/plan-data.js**, which downloads one JavaScript file that sets `window.PLAN_DATA`. Moved into `data/`, that file is what the app loads with a plain `<script>` tag when `index.html` is opened from the folder. Nothing is kept in the browser and nothing leaves the laptop. Viewers never need the workbooks. When a workbook changes, the import is run again and the file is replaced.

## 2. Requirements (fixed)

These carry over from decisions D11, D26, D27 and D1. The app's importer meets all of them; a mapping must keep them too (R7 and R8 in particular).

| # | Requirement | What it means in practice |
|---|---|---|
| R1 | **Repeatable** | Running it again on the same workbooks gives the same file. Refreshing one region, or all of them, takes minutes, not a rebuild. No hand edits to the output. |
| R2 | **Checked before presenting** | It validates every workbook (section 5) and reports problems per region **before** the data file is replaced. A problem surfaces at import time, never in front of the audience. |
| R3 | **One data file matching the contract** | Output is exactly one file, `data/plan-data.js`, setting `window.PLAN_DATA = { meta, lookups, regions }` as in `docs/DATA-CONTRACT.md`, with `meta.schemaVersion` equal to the version the app reads (`TAP.schemaVersion` in `js/core/namespace.js`, now `"0.2"`). Every field the contract lists must be there. Extra fields and sections are allowed: the app's check ignores them (D47). |
| R4 | **Every figure traceable to file › sheet › cell** | Every list item carries `sourceRow` (the worksheet row it came from). `meta.sourceMap` gives, per section, the sheet name and the column of every field (plus fixed cells for single values). Recap items carry `sourceCell`. Each region's `source.fileName` names the workbook. Together they give an address such as `Region C plan.xlsx › 1. Market Coverage › E17`. |
| R5 | **Three missing-value states** | A number, including `0`, means the leader entered it. `null` means the cell was blank ("not provided"); never turn a blank into `0` or `""`. Not applicable is not stored: it follows from the template's rules (unrated rows, Tier 3 industries with no New Business rows). |
| R6 | **Import notes with sheet and cell** | Anything worth checking that doesn't stop the import goes into the region's `source.notes` as `{ message, sheet, cell }`. The app shows these only in the data sources panel. |
| R7 | **No personal names** | Account managers and any other personal names are left out. Account names stay in one field, `accounts[].name`, so they can later be swapped for anonymous labels (D14, provisional). Free-text fields (commentary, success factors) are copied as written, so they are reviewed by eye during the real-data run. |
| R8 | **Real data stays in approved tooling** | Workbooks, the data file and the real mapping stay on the data owner's laptop and in the approved tool. They never go into the public repository (the data file is gitignored; the real mapping lives in the internal copy only) or into any other assistant. |
| R9 | **Finished values, not formulas** | Read the stored results the template already calculated (D5). Do not recreate the template's formulas, except the simple cross-checks in section 5. |

**Also useful:**
- Keep regions in the same order on every run: file order sets each region's colour.
- Record a source per region: `fileName`, `fileModified` (the workbook's last-saved date), `importedAt`.
- Fill `meta.templateVersion` with the template mapping used, so a later template revision gets its own mapping. The importer copies it from the mapping's `meta.templateVersion`.

## 3. The planning template

What the first copy reviewed contains; section 4 adds what the full template has on top. Field-level detail, types and source tags are in `docs/DATA-CONTRACT.md`.

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

## 4. The full template

The copy reviewed first had the four sections above. The full template has more: the recap moves to a sheet of its own with four new blocks, a new order intake sheet covers the year before the plan, the known sheets gain a few columns, and hidden helper sheets hold the dropdown lists. Every new part is an **optional addition** to the contract (D57): a region may carry one part and not another, and a file without any of them reads exactly as before. The "Full template" part of `docs/DATA-CONTRACT.md` has the field-level detail.

**Read every block for the workbook's own region.** The recap sheet has a region filter at the top, and its stored values are for the region the filter was saved on. Read them only when the filter is set to the region the workbook belongs to; otherwise stop this region with an error naming the filter cell (section 5).

### 4.1 Where each new field comes from

Generic block names: the real sheet names, row labels and cells go in the mapping, `config/import-map.js`, in the internal copy (section 6.4).

| Contract field | Sheet | Block in the template | Tag | What to write |
|---|---|---|---|---|
| `recap[]` (unchanged) | Recap | Order intake outlook at customer value | DER | As before: one item per year, channel, motion and type. Only the sheet name in `meta.sourceMap.recap` changes |
| `revenue[]` | Recap | Revenue outlook at customer value | DER | The recap item's shape: `year`, `channel`, `motion`, `type` (`arr` or `services`), `value`, `sourceCell`. One item per year, channel, motion and type |
| `booksValue[]` | Recap | Value through the organization's own books | DER | The recap item's shape, with `type` also `swPerpetual` and `hardware`; the recurring category is `arr` |
| `strategicPlan[]` | Recap | Order intake against the strategic plan | PRE (`value`), DER (`variance`) | One item per year and product category: `year`, `type` (the category, as in `booksValue`), `value` (the strategic plan figure), `variance` (the block's variance in money, optional), `sourceCell` (the cell of `value`). The plan's own figure and the variance % are not stored: the app works them out |
| `routes[]` | Recap | Order intake by route to market | DER (some IN) | One item per route, year and type, with `solution` when the block splits a route by solution: `route`, `year`, `type`, `value`, `solution`, `sourceCell` |
| `baseYear.year`, `baseYear.actualsThrough` | Order intake | The sheet's header: the year and the last month of actuals | PRE | `year` as a number; `actualsThrough` as `"YYYY-MM"` |
| `baseYear.items[]` | Order intake | Totals by product category | PRE | One item per category: `category`, `budget`, `forecast` (the later of the sheet's two forecasts), `actuals`, `pipeline` (unweighted), `coverage` (the sheet's coverage ratio, when it gives one), `sourceRow` |
| `newBusiness[].solution` | New Business | The solution column of each row | IN | The id from `lookups.solutions` that matches the row's solution; `null` when the cell is blank |
| `partners[].type` | Partner | The partner type column | IN | The id from `lookups.partnerTypes`; `null` when blank |
| `partners[].maturity` | Partner | The maturity level column | IN | The id from `lookups.partnerMaturity`. The level's name is accepted too |
| `partners[].supportPct` | Partner | Shared services support %, per plan year | IN | Three decimals (25% is `0.25`), `null` for a blank year |
| `partners[].distribution` | Partner | Distribution at customer value, per plan year | IN | Three numbers in thousands |
| `partners[].servicesFromPartners` | Partner | Services order intake the partner delivers itself, per plan year | DER | Three numbers in thousands |
| `outsourcingPct` | Partner | The outsourcing % at the top of the sheet | IN | One decimal per region; its cell goes in `meta.sourceMap.partners.cells.outsourcingPct` |
| `customerGrowth.accounts[].riskLevel` | Customer Growth | Risk level | PRE | `"low"` is now allowed, with `"high"`, `"medium"` and `null` |
| `lookups.productCategories` | Fixed by the contract | The four categories | IMP | Ids `swPerpetual`, `recurring`, `hardware`, `services`, with display names |
| `lookups.solutions` | Hidden lists sheet | The solutions list | IMP (names PRE) | `{ id, name, category }`: a stable id per solution and the product category it belongs to |
| `lookups.partnerTypes` | Partner, or the hidden lists sheet where it lists them | The values used in the partner type column | IMP (names PRE) | `{ id, name }`: a stable id per type |
| `lookups.partnerMaturity` | Hidden lists sheet | The partner maturity list | IMP | `{ id, name, rank }`: Recruit 1, Onboard 2, Enable 3, Skill 4, Strategic 5 |
| `lookups.routes` | Fixed by the contract | The route to market block's rows | IMP | Ids `ownSales`, `customerSuccess`, `allianceBReseller`, `otherResellers`, `systemIntegrators`, `partnerExisting` |
| `meta.sourceMap.revenue`, `.booksValue`, `.strategicPlan`, `.routes`, `.baseYear` | | | IMP | The sheet of each part (items carry their own `sourceCell`), and for `baseYear` the column of each field and the cells of `year` and `actualsThrough` |

New columns on the known sheets go in those sheets' `meta.sourceMap` entries: `newBusiness.columns.solution`, `partners.columns.type`, and one column per plan year for `supportPct`, `distribution` and `servicesFromPartners`.

**Left out on purpose, as before:** the monthly phasing on the order intake sheet, order intake per team, the price adjustment, the gross-up from contribution to customer value, the revenue release shares in the settings sheet, and the raw system exports. The app needs none of them to show the plans.

### 4.2 Anything else the template holds

Sections the contract does not name one by one (for example a sheet added to the template later) still come in without a contract change:

- **Write a new section as an extra section.** The contract has an optional, additive place for the sections it doesn't name one by one: `meta.extraSections` describes each section and its columns, and each region's `extra` holds its rows (the "Extra sections" part of `docs/DATA-CONTRACT.md`). The app shows every extra section as a list on the **Other sections** view, which appears only when there are any, with file › sheet › cell for each value. Problems in an extra section are warnings, never errors. The mapping's `extra` list describes the sheet and its columns (section 20.1 of `docs/ARCHITECTURE.md`), and the importer writes the rows. Level 1 of `docs/EXTENDING-TEMPLATE.md` gives the steps, and prompt 11 in `docs/COPILOT-PROMPTS.md` asks the approved tool for the entry.
- **To chart a figure from it,** follow level 2 of `docs/EXTENDING-TEMPLATE.md` (prompt 12); for a whole new view, level 3 (prompt 13). Only a section that needs fields of its own, outside the extra-section shape, extends the contract itself: field, type, tag and notes in `docs/DATA-CONTRACT.md`, the contract check (`js/core/check.js`), `meta.sourceMap`, and the measure or report that shows it.
- Anything else the import writes that the contract doesn't name is ignored by the contract check: neither an error nor a warning (D47), and not shown on screen.
- **The version rule.** Adding a field or section never changes `meta.schemaVersion`. Raise it only when an existing field changes meaning or shape, and change `TAP.schemaVersion` in `js/core/namespace.js` to match at the same time. A mismatch stops the app with a version message.
- Allowed values in the dropdowns (some rating scales) are confirmed against the real template. Partner maturity is settled: five levels, Recruit to Strategic, in `lookups.partnerMaturity`.

## 5. Validation rules

From the contract. The import applies them to every workbook before the plans are used or the file is written.

| Rule | Error (stops this region) or note |
|---|---|
| Every region has all four sections and the expected industry list | Error if a section or the industry list is missing; note if a section is present but empty |
| Channel splits sum to 100%, within rounding | Note with the row's cells (e.g. a split that adds up to 95%) |
| `arrPotential` Year 1 = target accounts × hit rate × average deal size | Note: a mismatch usually means the workbook wasn't recalculated before saving |
| Segment matches the thresholds rule | Note on the account's segment cell |
| Ratings and tiers use only allowed values | Note, and the value is imported as `null` (e.g. a rating cell holding text that isn't an allowed option) |
| Blanks stay blank | Never converted to `0` or `""` |
| **Full template:** the strategic plan variance equals the plan minus the strategic plan | Note on the variance cell if the block's variance is not the books value of that year and category minus the strategic plan figure (a workbook saved without recalculating) |
| **Full template:** revenue is never above order intake | Note if a revenue item is above the recap's order intake for the same year, channel and motion |
| **Full template:** books value is never above customer value for a reseller channel | Note if, for Partner, Alliance A or Alliance B, the books value of ARR and services is above the recap's customer value for the same year |
| **Full template:** the coverage ratio matches its parts | Note if the order intake sheet's coverage is more than 5% away from pipeline over forecast minus actuals |
| **Full template:** every solution, partner type, maturity level and route names an entry of its lookup | Note, and the value is imported as `null` |
| **Full template:** the recap is read for the workbook's own region | Error if the recap sheet's region filter is set to another region or to all regions |

The **segment rule**, checked in this order: current ARR above the strategic threshold is Strategic; below the scaled threshold is Scaled; 3-year order intake above the growth threshold and ARR above the growth ARR threshold is Growth; otherwise Core.

Errors stop the import **for that region only**. Everything worth a look goes into `source.notes` with its sheet and cell.

**The app's importer applies these rules** (`TAP.importChecks`, `js/import/import-checks.js`) and shows the result in the Import panel's report, region by region. The table in section 20.3 of `docs/ARCHITECTURE.md` is the exact list: the errors are a rated industry with no Market Coverage row, a required section missing, a header that is not where the mapping says, two workbooks for one region, and the recap filter set to another region; everything else in the table above is a note with its sheet and cell, as is a value of the wrong kind or an error cell (imported as `null`) and a required block with no values (the recap becomes an empty list). An optional part whose sheet is missing is left out of the region. The report then adds the app's contract check (`TAP.check.run`) on the plan as a whole.

**A second check in the app.** When the app opens from the saved file, it checks it against the contract again (US-1.8.2). Problems that would break views stop it loading, with a precise list; smaller ones load and appear in the data sources panel. See section 8.

## 6. The choices, and how they were settled

These three choices were open while the import was still to be built. They were settled when the importer moved into the app (D147, D157); the tables stay as the record of the trade-offs, and 6.4 describes the mapping file the choices led to.

### 6.1 Fixed cell addresses vs finding headers

**Settled (D157): fixed addresses, with an optional header check.** The mapping gives each section its sheet, first row and column letters, and each grid block its axes or enumerated cells; where it also gives a `headerRow` and `headers`, the importer checks that the expected text sits there before reading a row, and when it does not the region is stopped with an error naming the cell. A workbook whose layout differs needs a mapping change, not a code change.

| | Fixed cell addresses (a mapping per template version) | Finding headers (search for the header text, then read below it) |
|---|---|---|
| How | A mapping says "growth potential is column D from row 10 on sheet 1" | The import looks for each header's text and works out the columns |
| Pros | Simple and predictable. Exact cell addresses for tracing come for free. Fast. Easy to review. Matches the template's own versioning | Survives inserted columns or rows. One import can handle small layout differences between regions |
| Cons | Breaks if a leader inserted a column or row; each break needs a mapping change. Needs a separate check that the layout is as expected | Merged two-row headers and instruction text make matching fragile. Header wording may differ. Harder to test. Must still record the actual cell it read |
| Decide by | Whether leaders altered the template. If all workbooks match, fixed addresses are enough | If several workbooks differ, finding headers (or a per-region mapping) may be needed |

A middle path is possible: fixed addresses plus a check that the expected header text sits where the mapping says, raising an error if not.

### 6.2 Region names: from the workbook vs a short-name list

**Settled (D157): a region list in the mapping, with a fallback.** The mapping's `regions` list gives each region a stable `id`, `name`, the workbook's file name or a pattern with `*`, and the `filterName` the recap sheet's filter uses. The list's order sets the colours. A workbook that matches no entry is still read: its name comes from the mapping's `nameCell`, else from the file name without its extension, its id from that name, and the report says so in a note.

| | From the workbook | A short-name list |
|---|---|---|
| How | Read the region name from a cell or the file name | A small list maps each workbook to a fixed id and display name |
| Pros | No extra file to keep. Always matches what the leader wrote | Stable ids and order across refreshes (colours stay put). Short names fit charts. Survives renamed files |
| Cons | Names may be long, inconsistent or change between versions. Ids and order may shift | One more thing to maintain. A new region needs a list entry |

Note: the organization layer can already give short display names on screen (`TAP_ORG.regions[id]` in `content/organization.js`), keyed by the region's `id`. So the data file's `id` must be stable either way; the choice is mainly where `id`, `name` and order come from.

### 6.3 An import page in the browser vs another approach

**Settled (D147): the import page is in the app.** An Import button on every page and on the no-data and invalid screens opens the Import panel. The workbooks are read in the browser with a spreadsheet library stored in the folder (`vendor/xlsx.mini.min.js`, D148), so nothing loads from the web and nothing leaves the laptop. The browser cannot save over a file, so the panel offers the data file as a download that the owner moves into `data/`.

| | Import page in the app folder | Another approach the approved tool recommends (for example an Excel script or macro, or Power Query, producing the data file) |
|---|---|---|
| How | The owner opens a local page, picks the workbooks, sees the validation report, and saves the data file | Runs inside Excel or another approved tool and writes the same file |
| Pros | Same platform as the app (opened from a file, no install). Runs entirely on the laptop. Can show the validation report on screen | May read workbook values more reliably. May fit the organization's approved tools better. No spreadsheet library to store |
| Cons | Needs a spreadsheet-reading library stored in the folder (nothing from the web). Browsers can't save over a file directly, so the owner saves a download into `data/` | Might need permissions or tools not available on every laptop. A second platform to maintain. Must still produce exactly the contract's file |

The importer is generic, so it lives in the public repository; what is organization-specific is the mapping, which does not (6.4).

### 6.4 The mapping file

`config/import-map.js` sets `window.IMPORT_MAP`: one object that describes the template's layout. It is data, not code. The exact shape is in section 20.1 of `docs/ARCHITECTURE.md`; in short, it holds:

- `meta`: the template version, the currency, the plan years, `isSample` (`false` for the real template) and, when needed, how text numbers are written;
- `regions`: the region list in display order, each with its id, name, workbook file name or pattern, and the name the recap filter uses; and `nameCell`, the cell where a workbook names its region, for a workbook that matches no entry;
- `lookups`: the data file's lookups, as they will be written, with the real names of industries, product lines, channels, solutions, partner types, maturity levels and routes, and stable ids for each;
- `aliases`: other spellings found in the workbooks, mapped to the id, score or value they mean;
- `sections`: for each row section, the sheet, the header row and first row, the column letter of every field (one per plan year for by-year fields) and the fixed cells; for each grid block, the sheet, the filter cell, and its row and column axes, regular or enumerated;
- `extra`: any extra sections (section 4.2), with their columns.

**How the approved tool fills it from the real template** (prompt 2 in `docs/COPILOT-PROMPTS.md`, then prompt 16 for the full template): it starts from the sample mapping and changes the values, section by section. The sheet names as the real template spells them. The header row and the first data row of each section. The column letter of each field, and the two forecast columns of the order intake sheet, saying which is the later one. The fixed cells (the thresholds, the outsourcing %, the base year's year and last actuals month). For each grid block, the first row and column and the order of the axes, or the enumerated cells when a block is irregular; the recap filter cell. The region list with the real file names. The lookups with the real names, and aliases for any other spelling the workbooks use. The shipped copy describes the fictional sample and is generated by `tools/build-import-map.js`, so the real mapping is a new file written over it, never a hand edit of the generated one.

**How to test it:** the Import button's report. Import every workbook and read the report: a region that reads cleanly lists its parts as read; a wrong sheet name, row or column shows as an error or as notes with the sheet and cell, and a mismatch between the lookups and the workbook's names shows as notes on the cells that did not match. Fix the mapping and import again. The round trip the test page runs (write workbooks from the sample data, import them, compare) is for the sample mapping only: it is not available on real data, so spot-checks against the workbook (section 8) take its place.

**Where it lives:** the real mapping is organization-specific (sheet names, region names, file names, product names), so it stays in the internal copy of the folder, with the data file and the organization layer, and never comes back to the public repository.

## 7. Output checklist

Before calling a mapping done, the data file the panel saves should have:

- [ ] `window.PLAN_DATA = { meta, lookups, regions }` (extra sections are allowed, D47)
- [ ] `meta.schemaVersion` as in `docs/DATA-CONTRACT.md`, `meta.isSample` set to `false`, `meta.currency`, `meta.years`, `meta.generatedAt`, `meta.templateVersion`
- [ ] `meta.sourceMap` covering every field the views read, in the shape shown in `tests/fixtures/mini-data.js`
- [ ] the same `lookups` (industries, product lines, channels, tiers, segments, scales) for every region
- [ ] per region: a stable `id`, `name`, `source` with notes, and all five lists (`marketCoverage`, `newBusiness`, `customerGrowth`, `partners`, `recap`)
- [ ] `sourceRow` on every list item and `sourceCell` on every recap item
- [ ] `null` for blanks, never `0` or `""`
- [ ] no personal names
- [ ] for the full template, where a region's workbook has them: `revenue`, `booksValue`, `strategicPlan`, `baseYear`, `routes` and `outsourcingPct`; `solution` on New Business rows; `type`, `maturity`, `supportPct`, `distribution` and `servicesFromPartners` on partners; the five Phase 4 lookups; and a `meta.sourceMap` entry for each part a region carries. A part a region does not have is left out, never filled with zeros

## 8. How to check the result

1. Open `index.html` by double-clicking it (Chrome, or Edge). Without a data file it shows the "No plan data found" screen, which has the Import button too; the sample edition, `index-sample.html`, works the same way for a trial run.
2. Press **Import** and pick every regional workbook. The panel says which file it is reading, then shows the report.
3. Read the report: the summary (regions imported, left out, missing from the mapping's list, mapping problems), then per region its file, saved date and the parts read, its errors, its notes with sheet › cell, and at the end the contract check on the whole plan. A contract error reads like `regions[2].marketCoverage[5].tier: expected 1, 2 or 3, found 'Tier 2'`.
4. Fix the **mapping**, never the data file: press **Copy report** and paste it into the approved tool with `config/import-map.js` and `docs/DATA-CONTRACT.md` (prompt 6 in `docs/COPILOT-PROMPTS.md`). A problem in a workbook is fixed in the workbook, or accepted as a note. Import again.
5. When no region has an error, press **Use these plans now**: the app shows the imported plans at once. Open the data sources panel (click the "Data:" date on the comparison bar) and read every region's import notes and dates.
6. Press **Save data/plan-data.js**, move the download into `data/` in the internal copy, replacing the old file, and reopen `index.html`: it now opens on the new data without the import.
7. Spot-check at least one figure per section per region: select the data icon beside it (in its details or the table view), read its file › sheet › cell, and confirm it in the workbook.

The full run, step by step, is in `docs/REAL-DATA-CHECKLIST.md`.
