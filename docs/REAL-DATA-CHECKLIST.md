# Real-data run checklist

Step by step, for the data owner taking the app onto real data the day before the first demo. Each step has a tick box and a note on what "good" looks like. Work through it in order. If a step can't be ticked, write down the exception and what was done about it in the run log (section 5).

Generic on purpose: this copy names no organization, region, file or person. The run log, real file names and anything organization-specific live in the internal project folder, outside this repository (D2).

**Have ready:** the real regional workbooks, the internal copy of the app folder (a copy taken from the public repository's main branch, kept on approved storage outside any git clone), the import built with Copilot (`docs/IMPORT-BRIEF.md`, prompt 2 in `docs/COPILOT-PROMPTS.md`), `content/organization.js` (prompt 3), and, if the organization's branding is wanted, a `js/theme.js` edited in the internal copy (prompt 4).

## 1. The run

- [ ] **1. Move company-specific material into the internal project folder.**
  Real workbooks, the import's mapping and code if it names anything organization-specific, the region list and short names, organization terms, brand assets, decisions taken with Copilot, and this run's log.
  *Good:* the public repository holds none of it. If you work from a git clone, `scripts/verify.sh` passes its denylist scan and `git status` shows no data or organization file. The internal copy of the app folder has `data/plan-data.js`, `content/organization.js` and any branded `js/theme.js` only there.

- [ ] **2. Produce the data file with Copilot's import.**
  Run the import on every regional workbook and save the result as `data/plan-data.js` in the internal copy of the folder.
  *Good:* the import's own validation report shows no errors for any region (notes are fine, they are read in step 4). One region per workbook. `meta.isSample` is `false`. The file is well under 1 MB.

- [ ] **3. Open the app and clear contract-check errors.**
  Double-click `index.html`. If it stops with "The data file has problems that stop the app from opening", press **Copy the list**, paste it into Copilot with prompt 6, fix the import (never the data file by hand), re-run and reopen.
  *Good:* the Overview opens within about 2 seconds with All regions and no focus region. No error screen. No "No plan data found" or version message. The browser console (F12) shows no errors.

- [ ] **4. Review the data sources panel and import notes.**
  Click the "Data:" date on the comparison bar.
  *Good:* every region is listed with its source file name, file date and import date. Every import note has been read, and each one is either accepted (written in the run log) or fixed in the workbook and re-imported. If import dates differ, the panel says so and you know why. No note about a broken organization file.

- [ ] **5. Spot-check sources against the workbooks.**
  For each region, pick at least one figure per section (Market Coverage, New Business, Customer Growth, Partner and Recap). Read its file › sheet › cell behind the data icon beside it (in its details panel or the table view's source column), open that workbook at that cell, and compare.
  *Good:* every checked figure matches its cell. Calculated figures say "calculated in the workbook" and still point to a cell. Combined figures (totals, averages) list the regions they came from. Each check is listed in the run log.

- [ ] **6. Walk every view in each comparison mode.**
  Tick each cell of the grid below. The columns follow the comparison bar's three modes, with Selected regions checked twice: one region on its own, and several. Open each panel's table at least once and check blanks read "not provided" (never 0) and unrated rows are left out quietly.

  | View | All regions | Selected regions: one | Selected regions: several | One vs the rest |
  |---|---|---|---|---|
  | Overview | [ ] | [ ] | [ ] | [ ] |
  | Market coverage | [ ] | [ ] | [ ] | [ ] |
  | New business | [ ] | [ ] | [ ] | [ ] |
  | Customer growth | [ ] | [ ] | [ ] | [ ] |
  | Partners | [ ] | [ ] | [ ] | [ ] |
  | Outlook (full template) | [ ] | [ ] | [ ] | [ ] |
  | Insights | [ ] | [ ] | [ ] | [ ] |
  | Guide | [ ] | n/a | n/a | n/a |

  *Good:* every chart draws, nothing shows "Not built yet" or an error, the sentence above the charts names the right regions, region labels use the short names, and no figure looks implausible against what you know of the plans.

- [ ] **7. Read every insight for wording and fairness.**
  Open the Insights page and read each one, with its figures.
  *Good:* every insight is accurate (its figures match the charts) and fair to the region it names, in words you would be comfortable saying to that regional leader. Anything awkward on the day: use "Hide for this session" (it comes back on reload). Anything wrong every time: tune it with prompt 5 and record the change.

- [ ] **8. Confirm the internal label shows and the sample banner doesn't.**
  *Good:* the internal confidentiality label from `content/organization.js` appears on every screen and on a chart saved as an image, and can't be dismissed. "Sample data: all figures are fictional" appears nowhere.

- [ ] **9. Test a Teams screen share.**
  Share the browser window in a Teams call and view it on a second device at 1080p.
  *Good:* titles, labels and takeaways are readable without zooming, at 125% and 150% browser zoom too. Nothing relies on hover. The person on the second device signs off, recorded in the run log.

- [ ] **10. Run the pre-demo regression (section 2).**
  *Good:* the test page passes in full and every smoke check passes, with results logged.

- [ ] **11. Save a known-good copy of the folder.**
  Copy the whole internal app folder, data file and organization file included, to approved storage, named with the date.
  *Good:* the copy opens by double-click and shows the same Overview. Its location is written in the run log. Access matches who may see the real plans (whoever has the folder has the data).

## 1a. The full template: checks after the import

Only when the workbooks are the full template (prompt 16 in `docs/COPILOT-PROMPTS.md`, section 4 of `docs/IMPORT-BRIEF.md`). Do these after step 4 and before step 6. Ask Copilot to run the first four on the data file (step 3 of prompt 16); the app's own check repeats them as warnings in the data sources panel.

- [ ] **A. The variance equals the plan minus the strategic plan.**
  For each region, year and product category with a strategic plan figure, the workbook's variance is the books value of that year and category minus the strategic plan.
  *Good:* no warning about a strategic plan variance in the data sources panel. On **Outlook**, the strategic plan chart's variance for one region matches the workbook's variance cell.
- [ ] **B. Revenue is never above order intake.**
  For each region, year, channel and motion, the revenue outlook is at most the order intake at customer value (the recap) it comes from.
  *Good:* no revenue warning. On **Outlook**, revenue as a share of order intake is 100% or less for every region and year.
- [ ] **C. Books value is never above customer value for a reseller channel.**
  For Partner, Alliance A and Alliance B, the books value of ARR and services is at most the customer value of the same year.
  *Good:* no books value warning. On **Partners**, the customer value against books value chart shows a difference of zero or more.
- [ ] **D. The coverage ratio matches its parts.**
  Where the order intake sheet gives a coverage ratio, it is pipeline over forecast minus actuals, within 5%.
  *Good:* no coverage warning; the base year chart's actuals month matches the sheet's.
- [ ] **E. Lookups are complete.**
  Every solution, partner type, maturity level and route in the data names an entry of its lookup; partner maturity has the five levels, Recruit to Strategic, in that order.
  *Good:* no unknown-id error. The partner list sorts by maturity from Recruit to Strategic.
- [ ] **F. Spot-check the new blocks.**
  For each region, trace one figure from each new block (revenue outlook, books value, strategic plan, route to market, base year) to its cell, as in step 5.
  *Good:* every checked figure matches its cell, and a region without a part reads "not provided" on Outlook and on its profile, never zero.

## 2. Before every demo: pre-demo regression

Run this before each demo, not only on the first run, on the folder you will present from.

- [ ] **Test page.** Open `tests.html` from the folder, with no internet connection.
  *Good:* every automated test runs and the summary shows no failures. **Copy results** pastes the summary into the run log.
- [ ] **Smoke set.** Work through the checks below in the app (`index.html`).
  *Good:* every check passes; any failure is fixed or written in the run log with the decision taken.
- [ ] **Known-good copy.** Save a dated copy of the folder that passed.
  *Good:* the copy's location is in the run log. If anything breaks later, present from this copy.

**The smoke set** (every case the Test Plan tags as smoke, 23 in all; the case ids let you record results against it):

| Case | Check |
|---|---|
| TPV-TC-001, 002 | `index.html` opens on the Overview within 2 seconds in Chrome, and in Edge, with no console errors |
| TPV-TC-007 | Each menu item loads its view and highlights the item |
| TPV-TC-011 | Reopening the app starts on Overview, All regions, no focus |
| TPV-TC-013 | One vs the rest: the sentence names the focus region against the average of the others, and the combined figure is labelled |
| TPV-TC-019 | The "Data:" date opens the data sources panel with every region's file, dates and notes |
| TPV-TC-021 | A chart tooltip and its table row both show the figure's file › sheet › cell |
| TPV-TC-036 | Readable on a Teams share on a second 1080p device (sign-off recorded) |
| TPV-TC-037 | Sample edition only (`index-sample.html`): the sample banner shows on every view and can't be dismissed |
| TPV-TC-053 | A panel's insights icon shows the count (for example 5), lists 3 and links to the Insights page; hover alone doesn't open it |
| TPV-TC-057 | Switching chart type keeps the comparison, breakdown and focus |
| TPV-TC-066 | "Copy to clipboard" on a table pastes into Excel with columns intact, including the source column and the data label |
| TPV-TC-089 | Clicking a region card opens its details; the comparison stays the same |
| TPV-TC-093 | The ambition report defaults to a stacked bar per region (new business and customer growth), matching the cards |
| TPV-TC-102 | The Overview shows three insights in ranking order, the focus region's first when one is set |
| TPV-TC-110 | The tier bubble grid: colour shows tier, size shows pipeline, switching to current ARR changes sizes; the legend separates system figure from leader choice |
| TPV-TC-115 | The attractiveness vs ability chart, All regions: one labelled bubble per industry, averaging stated |
| TPV-TC-123 | Selecting an industry in the grid, the scatter and the ratings chart updates the commentary panel |
| TPV-TC-138 | The Insights page lists every insight, ranked, grouped by family with a one-line explanation each |
| TPV-TC-172 | The Guide has three sections and a contents list whose links jump to each |
| TPV-TC-182 | Clicking a marked term shows its definition and why it matters; hovering also shows it |
| TPV-TC-193 | The contract check finds no errors in the sample data file (automated, on the test page) |
| TPV-TC-218 | `tests.html` with no internet runs every automated test and shows a pass or fail summary |

On the real-data edition, also confirm the real data file's contract check is clean (step 3).

## 3. Real-data acceptance in short

The real data is accepted for the demo when steps 3 to 7 are ticked: the contract check is clean, every view has been walked in each comparison mode, every insight has been read for accuracy and wording, and at least one figure per section per region has been traced to its workbook cell and confirmed.

## 4. Fallback (contingency only)

The data owner already has the real workbooks, so this should not be needed. Use it only if the data file isn't ready, or won't pass step 3, in time for the demo.

- [ ] **Present the sample edition.** Open `index-sample.html` from the last known-good folder.
  *Good:* every screen carries the standard banner "Sample data: all figures are fictional", unchanged, so nobody mistakes it for the real plans. The presenter opens with one line on why: the real plans are being imported and will follow.
- [ ] **Record it.** Write in the run log that the fallback was used, why, and the new date for the real-data run.

## 5. Run log

Keep one entry per run in the internal project folder, never in this repository.

| Field | Entry |
|---|---|
| Date and time | |
| Run by (role) | |
| Data file `generatedAt` and regions included | |
| Test page result (pasted summary) | |
| Smoke set result, with any failures | |
| Source spot-checks (region, section, cell, match) | |
| Full template checks A to F, with any mismatch and the decision taken | |
| Insights hidden or tuned, and why | |
| Exceptions and decisions | |
| Teams share sign-off | |
| Known-good copy location | |
