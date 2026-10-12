# Internal handover: customizing the app with an approved AI tool

A template for the organization that takes this app into use. It is written for two readers: the organization's approved AI tool (for example Microsoft 365 Copilot), which follows it step by step, and the data owner, who runs the import and keeps the internal copy. Anything in `<angle brackets>` is a placeholder: fill it in inside the approved tool, keep the filled copy in the internal project folder, and never commit it anywhere.

This document is generic on purpose, so any organization can use it with its own approved tool. The public repository holds this template only; it never holds a filled copy, real data, a logo, an organization name or a storage path (D2, D144).

**Read with:** `docs/HANDOVER.md` (the maintainer's guide), `docs/COPILOT-PROMPTS.md` (a ready prompt per task), `docs/IMPORT-BRIEF.md` (the import), `docs/REAL-DATA-CHECKLIST.md` (the first real run), `docs/DATA-CONTRACT.md` (the data file's shape).

---

## 1. The rules from here on

The build phase worked in a public repository on fictional data, with checks that kept anything organization-specific out. The customization phase is the opposite: everything is organization-specific, so everything stays inside. These rules hold for every step below (D145).

1. **The internal copy is not a git folder.** Never run `git init`, commit, push, open a pull request, publish to GitHub Pages or any other page, or paste any file, figure or screen into a tool or chat that is not the approved one. The internal copy lives on `<approved storage location>`, with access limited to `<the intended audience>`.
2. **Nothing goes back to the public repository.** Not the data file, not the organization layer, not the logo, not a tuned setting, not a note. If something in the app itself must change (a bug, a missing feature), the owner raises it on the public side as a generic request, on fictional data; the fix comes back with the next public build (section 8).
3. **The app has no login.** Whoever can open the folder can read every figure in it. The folder, its storage and its access list are the access control. Do not put the folder in a shared drive wider than its audience, and do not send it as an attachment.
4. **Exports stay inside too.** Charts saved as images, tables copied to a spreadsheet and the presentation file all carry real figures. They carry the internal label (section 5) and stay on approved storage.
5. **The approved tool is the only assistant that sees real data.** The workbooks, the data file, the organization layer and the filled copy of this document are given to `<the approved AI tool>` only (D1).
6. **No feature changes.** The tool customizes; it does not build. Section 3 says exactly what may change.

## 2. Who does what

| Who | Does | Needs |
|---|---|---|
| `<the approved AI tool>` | Fills the mapping the app's importer reads, fills the organization layer, tunes the thresholds the owner asks for, prepares the presentation file | The documents named in each step, one real workbook or its header rows inside the tool only |
| `<the data owner>` | Takes the public build onto approved storage, runs the import, places the files, works through the checklist, keeps the run log | The workbooks, the internal copy, this document filled in |
| `<the presenter or manager>` | Opens `index.html` from the folder | Nothing else: no import, no install |

## 3. What may change, and what may not

**May change** (configuration, content, branding, data and the import):

| File or folder | What goes there | Prompt |
|---|---|---|
| `config/import-map.js` | The mapping: where every field sits in the real template, the region list with the workbook file names, the lookups with the real names. The public copy describes the fictional sample; the real one is written over it here | 2, 16, 6 |
| `data/plan-data.js` | The real data, written by the app's Import button (**Save data/plan-data.js**) and moved into `data/`; never written by hand, by the tool or by any script | none: the Import button |
| `content/organization.js` | Wording, organization terms, Guide sections, region short names, the confidentiality label, the logo and app name | 3 |
| `assets/` | The logo file named in the organization layer | 3 |
| `config/settings.js` | Combining weights and the insight ranking weights, where the owner has confirmed values | 5 |
| `config/insight-rules.js` | Insight thresholds, and a rule switched off where it does not fit the organization | 5 |
| `config/running-order.js` | The meeting's presentation, recorded from the screen and pasted in | 14 |
| `js/theme.js` | Colours and font only, and only if the organization wants its own palette | 4 |

**May not change:** anything else under `js/` or `css/`, the report definitions and views under `config/reports*.js` and `config/views.js`, the glossary and Guide files under `content/` (the organization layer adds to them instead), the Data Contract (additions only, and only on the public side), the sample edition `index-sample.html` and its data, the tests. Prompts 7 to 13 of `docs/COPILOT-PROMPTS.md` (a new report, column, view or template section) are extensions, not customization: they need `<the owner>`'s approval first, and the result stays internal.

A simple test for the tool: if a change would be the same for any organization, it belongs on the public side; if it is specific to this organization, it belongs in one of the eight places above. The importer itself (`js/import/`) is the same for every organization and may not change; the mapping is where the template's particulars go.

## 4. Start from a tagged build

1. Take release `<version, for example v0.4.1>` of the public repository: the release's download, or `scripts/package.sh` run on a clone, which writes a known-good copy under `dist/`.
2. Copy that folder to `<approved storage location>` as the internal copy. It must not be a git clone: no `.git` folder inside.
3. Open `index-sample.html` once from the copy. The sample edition shows the fictional data and proves the copy is complete.
4. Note the version: it is in `js/core/namespace.js` (`TAP.version`) and in the release notes. Write it in the run log.

## 5. Inputs to collect, and where each goes

| Input | Who provides it | Where it goes in the app |
|---|---|---|
| The regional planning workbooks | `<the regional leaders, via the data owner>` | The **Import** button in the app reads them through the mapping in `config/import-map.js` and saves `data/plan-data.js` |
| The template's layout: sheet names, header and first rows, the column of each field, the fixed cells, the recap filter cell, the dropdown lists | `<the data owner>`, from one workbook inside the tool | `config/import-map.js`, filled by the tool |
| The region list and short names | `<the data owner>` | `regions` in `content/organization.js` (ids as in the data file) |
| Organization terms, acronyms, product and programme names | `<RevOps>` | `glossary` in the organization layer; general wording through `text` |
| How the plans are filled in: the planning calendar, who owns each section, what each figure means in this organization, deadlines | `<the director of RevOps>` | Guide sections in the organization layer, part `planning` (new sections, or paragraphs added to existing ones); shown with the "Organization wording" badge |
| How the plans drive the strategy: what leadership looks for, how the plans are reviewed, what happens after the meeting | `<the CRO>` | Guide sections in the organization layer, part `howTo` or `planning`; the Guide's opening paragraph can be replaced the same way |
| The confidentiality label | `<the data owner>` | `settings.internalLabel` in the organization layer; it shows on every screen and every export |
| The logo and the app name | `<marketing or the data owner>` | `settings.brand` and `text.app.name` in the organization layer; the logo file under `assets/` |
| Weights and thresholds to confirm (the combining weights say "to be confirmed" in `config/settings.js`) | `<the CRO>` | `config/settings.js`, `config/insight-rules.js` |
| The meeting's presentation | `<the presenter>` | Recorded in the app ("Add to presentation" in a chart's menu), copied as file text from the Guide, pasted over `config/running-order.js` |

Leadership context is text, not figures. It explains; it does not judge a region. Keep it in the Guide's neutral tone, in short paragraphs.

## 6. Order of work

Each step names the prompt to use from `docs/COPILOT-PROMPTS.md` and the files to attach. Start a new chat per step and paste the prompt as it is; the constraints paragraph in every prompt keeps the tool to the rules.

1. **Orientation** (prompt 1): `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA-CONTRACT.md`. The tool learns the folder and the data shape before it sees a workbook.
2. **Fill the mapping** (prompt 2, then prompt 16 for the full template): `config/import-map.js` (the sample mapping, the shape to fill), `docs/IMPORT-BRIEF.md`, `docs/DATA-CONTRACT.md`, section 20 of `docs/ARCHITECTURE.md` and the second example the brief names, then one real workbook or screenshots of its header rows, inside the tool only. The tool returns the mapping, never code. Save it over `config/import-map.js` in the internal copy, press **Import** in `index.html`, pick the workbooks and read the report; paste the report back to the tool until no region has an error (prompt 6). The answers given to the tool (first rows, columns, which forecast column, the ids) go in the run log.
3. **First real run** with `docs/REAL-DATA-CHECKLIST.md`: **Use these plans now**, read every import note in the data sources panel, **Save data/plan-data.js** and move the file into `data/`, reopen `index.html`. A contract-check error is fixed in the mapping or the workbook with prompt 6, never in the data file by hand.
4. **Fill the organization layer** (prompt 3): `content/organization.example.js` and the content files it names, plus the inputs of section 5. Save it as `content/organization.js` next to the starter; put the logo under `assets/`. Open `index.html`: the data sources panel shows no organization message, the label, logo and name show.
5. **Colours and font**, only if wanted (prompt 4): `js/theme.js` in the internal copy. The theme tests in `tests.html?suite=theme` must still pass.
6. **Thresholds and weights** (prompt 5): `config/settings.js`, `config/insight-rules.js`, with the values `<the CRO>` confirmed. Write every changed value and why in the run log; section 8 needs that list.
7. **The presentation** (prompt 14): record it from the screen, paste the text over `config/running-order.js`. "Present" and the P key show the page on screen; the saved file plays from the Guide.
8. **The checklist's pre-demo regression** (`docs/REAL-DATA-CHECKLIST.md`, section 2) before the first meeting.

## 7. Checks before anyone presents

- `index.html` opens on the Overview within a few seconds, with the internal label and no sample banner.
- The data sources panel (the "Data" button) lists every region's file and dates, no organization-layer message, and every import note has been read and either accepted or fixed.
- The logo, the app name and the short region names show as intended; a marked organization term shows its definition.
- A chart saved as an image and a copied table carry the internal label.
- A dated known-good copy of the whole folder is on approved storage (the checklist's last step), so a broken refresh can be undone in a minute.

## 8. Refreshing from a later public build

Public builds keep coming: fixes and features on fictional data. Taking one is a copy in one direction.

1. Take the new release as in section 4, into a new folder beside the current internal copy.
2. Lay the internal files back over it: `data/plan-data.js`, the real mapping `config/import-map.js` (over the release's sample copy), `content/organization.js`, the `assets/` folder, `config/running-order.js`, and the tuned values in `config/settings.js` and `config/insight-rules.js` (compare the release's copies with yours using the run log's list of changed values; the files themselves may have gained new entries, so carry the values over, not the whole file). A palette-changed `js/theme.js` is carried the same way, value by value.
3. Open `index.html`, run section 7, then the checklist's regression. Only then does the new folder replace the old one; the old one becomes the dated known-good copy.
4. Nothing flows back. If the new release needs a different data file shape or a new entry in the mapping, its release notes say so: extend the mapping first (prompt 16 or 6), import again from the button and save the new data file.

## 9. Record keeping

Keep, in the internal project folder and nowhere else:

- **The run log:** date, release version, workbooks used, import notes accepted, every changed configuration value and why, who checked what.
- **Decisions taken with the tool:** the mapping's answers (first rows, columns, which forecast column, the ids given to solutions, partner types and routes), thresholds, wording choices. The public Decision Log stays generic and never receives these.
- **The filled copy of this document.**

## 10. Placeholders checklist

Fill these before the first step; keep the filled copy internal.

- `<the approved AI tool>`
- `<approved storage location>` and `<the intended audience>`
- `<the data owner>`, `<the presenter or manager>`, `<the owner>` who approves extensions
- `<the director of RevOps>` and `<the CRO>`, or whoever provides the leadership context
- `<version>` of the public build started from
- The region ids and short names, the confidentiality label wording, the logo file name and the app name
- The thresholds and weights to confirm, with who confirms them
