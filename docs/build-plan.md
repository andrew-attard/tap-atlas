<!-- Copy of the approved build plan (2026-10-03). The live copy with progress notes is kept by the lead. -->
# TAP Atlas: Build Plan (Phase 1)

## Context

All Phase 1 planning is done and locked: 58 stories across Epics 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8 and 1.9; 227 test cases; Data Contract v0.2; decisions D1 to D36; the Claude Design "Plan Atlas" design reviewed and adopted (D32); a public repo with issues #1–#82 and project board 3. This plan turns that into a working app for the **CRO demo on Tue 2026-10-06**, with handover to Microsoft 365 Copilot (real-data import, outside the repo) on **Mon 2026-10-05**. The build runs **parallel agents in git worktrees** where file ownership can be kept separate, with the lead (me) owning contracts, merges, the vault and checkpoints. The user confirmed: unattended running with pre-approved commands, and two app editions.

**Resuming after compaction: read in this order**
1. This plan; after approval it is copied to the vault as `Build Plan.md` and to `docs/build-plan.md` in the repo.
2. Vault: `Epics & User Stories.md` (stories with GitHub issue links), `Test Plan.md`, `Data Contract.md`, `Decision Log.md` (D1–D43), `Design Review - Plan Atlas.md`.
3. Repo `~/projects/tap-atlas`: `docs/ARCHITECTURE.md` and `docs/AGENT-BRIEF.md` once Wave 0 has written them.
4. Claude Design project `eb62f8a3-d756-4f5e-a5e2-6b96f5dac9b1`, read through the claude_design MCP. Port `tpe-theme.js`, `tpe-insights.js`, `tpe-charts.js` and `tpe-ui.js`, which are plain scripts and reusable with fixes. Rewrite `Plan Atlas.dc.html` and `ReportPanel.dc.html`, which run on a React/CDN runtime.
5. Issue map: `~/.config/tap-atlas/issue_map.json`. Denylist: `~/.config/tap-atlas/denylist.txt`.

**Standing rules (from memory and decisions):**
- Append every user prompt to the Prompt Log, and every decision to the Decision Log.
- Raise only critical decisions.
- Keep everything generic; never open the real workbooks.
- Conventional Commits with `Refs: #N`. One branch per story. The PR uses `Closes #N` and lists the tests run. I merge with rebase once tests pass (D36).
- Scan all PR and issue text against the denylist.
- Code comments in plain words and short, with a header in every file.

---

## Decisions to record before Wave 0 (D37 to D43)

| # | Decision |
|---|---|
| D37 | **Two editions.** `index-sample.html` is the public and portfolio edition: it loads `data/sample-plan-data.js` and has no organization layer. `index.html` is the internal edition: it loads `data/plan-data.js` and `content/organization.js`, both gitignored. The Copilot handover creates `organization.js` from `organization.example.js`. *(User confirmed.)* |
| D38 | **ECharts 5.6.0,** vendored. The prototype's theme keys are 5.x; moving to v6 is a later chore. |
| D39 | **GitHub Actions CI** on pull requests: lint plus headless Chrome tests. The private denylist runs locally only. |
| D40 | **Unattended running** with a narrow set of pre-approved commands in the user's local settings (not the repo): push to `feat/*`, `fix/*` and `chore/*` branches, `scripts/open-pr.sh`, `gh pr merge --rebase`, headless Edge and Chrome, and the repo scripts. *(User confirmed.)* |
| D41 | **Theme-only palette fix allowed** if the colour-vision test (TC-027) fails. |
| D42 | **Report definitions split by view** (`config/reports-overview.js`, `config/reports-industry.js`) under a documented schema in `config/reports.js`. US-1.2.1 is amended from "one file" to "one schema". Insight rules stay in **one** file (US-1.7.1). |
| D43 | **One theme file:** `js/theme.js` writes the CSS variables at load, so there is no separate theme CSS that can drift out of step. Archivo woff2 fonts are vendored with the OFL licence. |

---

## File map (shipped folder, every file at about 300 lines or fewer)

```
index.html · index-sample.html · tests.html                      script order fixed in Wave 0 (lead only)
css/  base.css (lead) · shell.css · layers.css · panel.css · views.css (one marked section per stream)
js/theme.js                                                       THE theme file (TAP_THEME + ECharts theme + CSS variables)
js/core/     namespace · dom · icons · store · storage · format · data (lead) · sources · check (DATA) · content (CONTENT)
js/engine/   measures · scores · scope · aggregate · shapes · prepare · build-compare · build-parts · build-xy (ENGINE) · registry (lead)
js/reports/  tier-grid · quadrant · details (INDUSTRY)
js/insights/ engine + six rules-<family>.js files (INSIGHTS)
js/panel/    panel · panel-chart · panel-menus · panel-table · panel-export · panel-insights (PANEL)
js/ui/       app (lead) · shell · compare-bar · layers · sources-panel · system-screens (SHELL) · glossary (CONTENT) · explain · tour (PAGES)
js/views/    overview(+cards) (OVERVIEW) · industry (INDUSTRY) · insights · guide (PAGES)
config/      settings · views · reports (lead) · reports-overview · reports-industry · insight-rules (one owner)
content/     glossary · guide · ui-text · organization.example (CONTENT)
data/        sample-plan-data.js (generated, committed). plan-data.js is gitignored
docs/        ARCHITECTURE · AGENT-BRIEF · DATA-CONTRACT · PLANTED-CASES · IMPORT-BRIEF · COPILOT-PROMPTS · REAL-DATA-CHECKLIST · build-plan
tools/       generate-sample-data (+settings, names) · lint.js · parse-results.js        (Node, development only)
scripts/     verify.sh · test-headless.sh · screenshot.sh · check-text.sh · open-pr.sh
tests/       harness · cvd · auto-cases · fixtures/mini-data (hand-calculable, 4 regions) · fixtures/broken-cases · test-contracts · test-meta · test-<area>
vendor/      echarts.min.js + licence · fonts/ archivo-400/600/800.woff2 + OFL.txt · .github/workflows/ci.yml
```

## Interface contracts (fixed in Wave 0 in `docs/ARCHITECTURE.md`)

- **Globals.**
  - Configuration, data and content: `PLAN_DATA`, `TAP_THEME`, `TAP_SETTINGS`, `TAP_VIEWS`, `TAP_REPORTS`, `TAP_RULES`, `TAP_CONTENT`, `TAP_ORG`. Configuration files add to these globals rather than replacing them.
  - Code lives only under `window.TAP.<module>`, in IIFEs, and reads other modules at call time.
  - No modules, `fetch` or `eval`.
  - `app.js` starts the app unless `<body data-autostart="false">`. `tests.html` uses that switch and mounts the app itself for DOM tests.
- **State and events (`TAP.store`, `TAP.bus`).**
  - State holds `view`, `cmp {mode, focus, second, set, restAgg}`, `industry`, `expanded`, `layer`, `highlight` and session-only `hiddenInsights`.
  - `scopeEpoch` increases on any shared comparison change or view change; panels clear their own override when it does (US-1.1.4).
  - The address bar follows the view, but every load opens on Overview with All regions.
  - Bus events: `showme`, `industry:select`, `details:open`, `charts:reset`.
- **Comparison scope.** `TAP.scope.entities(cmp)` returns entities with `{id, kind, regionIds, how, role, color, label}`, plus `sentence(cmp)`. Colours come from the entity's role, cycle with a warning past 8 regions, and never default to a sample-specific ID.
- **Cells and sources.**
  - A cell is `{v, state: value|notProvided|notApplicable, kind: IN|PRE|DER|APP, src}`.
  - `TAP.sources.address(ref)` gives file › sheet › cell.
  - `TAP.agg.combine(values, rule)` is the **only** place the US-1.2.5 combining table is implemented; insights reuse it.
- **Measures.** `TAP.measures.get(id)(regionId, {year, industryId})` returns a cell, and `meta(id)` describes it. Reports, cards and insights all use the same registry, so figures can't drift.
- **Report schema:**
  ```
  {id, view, title, explain{shows, read, lookFor}, shape, builder?, dimension, measures, parts, size,
   defaultType, types, breakdowns, sources, options}
  ```
  `TAP.shapes.types(def, entityCount)`: a table is always offered, radar only for 3 or fewer regions, bubble only when a size measure exists. `validate(def)` errors stay inside the panel.
- **Builders.** Pure functions `fn(ctx)` returning `{option|html, table, legend, sizeLegend, notes, missing, empty, error, target()}`. Generic builders cover the compare, parts, xy and xyz shapes. Only the tier grid and the quadrant have dedicated builders. Display nudging never changes the values shown in tooltips or tables.
- **Panel and views.**
  - `TAP.panel.create(el, reportId, opts)` with `highlight`, `expand` and `destroy`.
  - `TAP.views.register(id, {mount})`.
  - `TAP.layers.openDetails(target)` and `TAP.details.build(target)`.
- **Insights.**
  - Configuration entries hold `{id, family, enabled, description, reads, params, template, attach, highlight, fallback}`.
  - Rule code: `TAP.insights.defineRule(id, fn)` returns findings.
  - Significance = family weight × (0.5 strength + 0.3 money + 0.2 breadth).
  - `all()` is computed once against all regions; `ranked(cmp, filter)`, `top`, `hide` and `failures` build on it.
  - Banned words are checked, and anything built from not-provided values is dropped.
- **Content.** `TAP_CONTENT.glossary`, `.guide` and `.text` (tour, headline templates, family lines, combined-figure explanations, messages, banners). `TAP_ORG` overrides it. `TAP.content.mark(text, seen)` marks only the first occurrence of each term per panel.
- **Stubs.** Every module exists from Wave 0 as a stub of the right shape (`TAP.stub()` shows "Not built yet (#N)"). `test-contracts.js` checks the shapes; `test-meta.js` fails at release if any stub remains.

---

## Waves (one agent = one stream in its own worktree; one branch and one PR per story)

**Wave 0: foundation (about 4 hours). Lead plus 1 tooling agent.**
- **Lead,** on a chore issue and branch:
  - write `ARCHITECTURE.md` and `AGENT-BRIEF.md`
  - create the full skeleton with headers, stubs and the final script order in all three HTML files
  - write the core modules
  - port the theme (closes #10, US-1.1.9) and `base.css` with Modernist styles folded in
  - port `format.js` (closes #18, US-1.2.6)
  - build the hand-calculable `mini-data` fixture
  - generate `auto-cases.js` from the Test Plan
  - write the `PLANTED-CASES.md` spec (the contract between the DATA and INSIGHTS streams)
- **Tooling agent** (#63, US-1.9.1):
  - the test harness for `tests.html`
  - `test-headless.sh`: Edge and Chrome (Chrome is a per-user install under `%LOCALAPPDATA%`), a fresh profile per run, `--dump-dom`, and proof that UNC `file://` paths work
  - `lint.js`, `parse-results.js`, `check-text.sh`, `open-pr.sh`, `verify.sh` (including a denylist scan of the whole tree) and `screenshot.sh`
  - `cvd.js`
  - CI workflow
  - vendored ECharts 5.6.0 and the Archivo fonts
- **Gate:** `verify.sh` green in both browsers on main, CI green. Tag `w0`.

**Wave 1: foundations (overnight). 5 agents.**

| Stream | Stories (issue) | Owns |
|---|---|---|
| DATA | 1.3.3 (#27), 1.3.1 (#25), 1.3.2 (#26), 1.8.2 (#57), `sources.js` | generator tools, `data/`, `core/check*`, `core/sources`, `DATA-CONTRACT.md`, planted cases |
| ENGINE | 1.2.5 (#17), 1.2.1 (#13), 1.2.11 (#23), 1.1.6 (#7), measures + scores | `js/engine/*` (pure logic, high-effort review) |
| SHELL | 1.1.1 (#2), 1.1.2 (#3), 1.1.3 (#4), 1.1.8 (#9), 1.1.5 (#6) | `ui/shell`, `compare-bar`, `layers`, `sources-panel`, `system-screens`, `shell.css`, `layers.css` |
| CONTENT | 1.6.3 (#39), 1.6.6 (#42), 1.6.2 (#38), 1.6.4 (#40), 1.8.5 (#60) | `content/*`, `core/content`, `ui/glossary` |
| DOCS | first drafts of 1.8.3 (#58), 1.8.4 (#59), 1.8.6 (#61) | the three handover docs |

Merge DATA first. The lead also writes test cases for the nine Should stories that have none (1.1.4, 1.1.11, 1.2.7, 1.2.8, 1.2.9, 1.2.10, 1.3.3, 1.5.6, 1.7.11; TPV-TC-228 onward) and prepares the Wave 2 briefs.

**Wave 2: features (Sunday daytime). 5 agents.**

| Stream | Stories (issue) | Notes |
|---|---|---|
| PANEL | 1.2.2 (#14) first as a minimal working panel, then 1.2.3 (#15), 1.2.4 (#16), 1.1.4 (#5), 1.2.8 (#20), 1.2.10 (#22), 1.2.7 (#19) | Critical path |
| OVERVIEW | 1.5.2 (#30), 1.5.1 (#29), 1.5.3 (#31) | Cards and headline first, since they don't need the panel |
| INDUSTRY | 1.5.4 (#32), 1.5.5 (#33), 1.5.7 (#35), 1.5.6 (#34), 1.2.9 (#21) | Dedicated builders, tested before wiring |
| INSIGHTS | 1.7.1 (#44), 1.7.2 (#45), 1.7.4 (#47), 1.7.5 (#48), 1.7.9 (#52), 1.7.6 (#49), 1.7.7 (#50), 1.7.8 (#51), 1.7.10 (#53), engine side of 1.7.11 | One owner of `insight-rules.js`; tested against the planted cases |
| PAGES | 1.6.1 (#37), 1.6.5 (#41), 1.7.3 (#46), 1.7.11 UI (#54), 1.1.11 tour (#11) | Builds against an insight fixture until #44 merges |

Merge order: PANEL #14, INSIGHTS #44 and #45, INDUSTRY #32, OVERVIEW #29, then the rest.

**Wave 3: integration (Sunday evening). 3 agents.**
- **INTEGRATOR:**
  - "Show me" across views, including the switch back to All regions when needed
  - highlights on every group
  - keyboard map and Esc order
  - arrow-key stepping while expanded
  - fixes for QA defects
- **DOCS:** 1.8.1 README and file guide (#56), header audit, final handover docs.
- **QA** (read-only plus scripts): automated part of 1.9.3 (#65).
  - a screenshot matrix: 4 views × 2 widths × 3 zooms × 5 comparison modes
  - console-error capture
  - D24 text-size checks
  - an offline check

  QA returns a defect list; the lead opens bug issues.

**Wave 4: hardening (Monday morning). Lead plus 1 or 2 fix agents.**
- **Release gates:** no stubs left, lint in release mode, all automated tests green in both browsers.
- **Before the demo:** the smoke set, the pre-demo part of 1.9.4 (#66), and a saved known-good copy.

**Not run in parallel:** contracts, the HTML script lists, `base.css`, store and settings, the vault (all lead only); combining logic and measures (one agent); the panel (one owner); `insight-rules.js` (one owner); sample data and planted cases; merging; the Teams test.

---

## Quality gates (to prevent technical debt)

- **Tests first.**
  - Each story's first commit is a `test(...)` commit adding its automated test cases, which fail; the `feat` commit follows.
  - Combining, scores and insights are checked against the hand fixture or the planted values, never against output the code produced.
- **Lint** (`verify.sh` and CI):
  - Files over 300 lines warn; over 350 they fail.
  - Every file needs its header (Purpose, Provides, Depends on, Used by), and `node --check` must pass.
  - It fails on any of:
    - `type="module"`, `import`/`export`, `fetch(`, `eval` or `new Function`
    - CDN URLs
    - colour literals outside `js/theme.js`
    - font sizes in px outside the theme and base CSS
    - `console.log`
    - `localStorage` outside `storage.js`
    - unmarked `innerHTML`
  - Every script must be listed in the same order in all three HTML files.
- **Each PR:**
  - The template lists the test case IDs with pass or fail, "Contract changes: none, or a request", "Files outside ownership: none", screenshots for UI changes, and the check output.
  - The lead rebases onto main and runs `verify.sh` in both browsers.
  - `/code-review` at **high** effort for engine, data, check and insights; **medium** for panel, views and shell; **low** for docs and content.
  - The lead checks each acceptance criterion, then runs `gh pr merge --rebase --delete-branch`.
  - If main goes red, revert first and fix after.
- **Agents stop and report** when a contract doesn't fit. They never work around it or edit files they don't own.
- **Agent prompts contain** the acceptance criteria word for word, the test case IDs, the planted-case rows, the owned and forbidden files, the order of work, the definition of done, the prototype files to port and their known bugs, and the commands to run.
  - Known prototype bugs: quadrant jitter leaking into values, takeaways ignoring the comparison, highlight on the first group only, the expanded tier grid capped at 440 px, `headline()` crashing with no Tier 1, divide-by-zero in the judgement rule, undefined colours past 8 regions, sample-specific default IDs, hard-coded colours and sizes.

**Concurrency:** at most 5 feature agents at once. The limit is lead review and merge capacity, not usage. Short-lived review agents don't count.

## Checkpoints with the user

| When | What | Time |
|---|---|---|
| **C0, now** | Approve this plan; I record D37–D43 and set up the pre-approved permissions | done here |
| **C1, Sunday morning** | Open `index-sample.html` in Chrome: shell, comparison bar, banner, sources panel, glossary tone. **Receive the Copilot early pack** (Data Contract, contract check, import brief) and start the import in Copilot a day early | about 15 min |
| **C2, Sunday afternoon** | Walk through Overview and Industry. **Read every sample insight for tone.** Confirm which Shoulds slip | about 30 min |
| **C3, Monday late morning** | Teams share read on a second device (TC-036), Chrome and Edge smoke set, 125%/150% zoom, double-click open from a Windows copy, offline check, sign-off | about 45 min |
| **Handover, Monday midday** | Known-good copy, Build Log, Test Plan execution log; real-data run in Copilot | — |

**If Shoulds have to slip, cut them in this order:** #11 tour, #19 breakdown, #34 ratings, #22 images, the true-full-screen part of #20, #54 hide, #5 override, #21 details. **Musts never slip without asking.**

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Too many PRs to review and merge | Scripted checks, review depth by risk, 5-agent limit |
| Streams drift from the contracts | Wave 0 contracts and stubs, `test-contracts.js`, stop-and-report rule |
| Panel late | A minimal panel PR first; consumers do their pure work first |
| Wrong numbers | Hand fixture, one combining module, high-effort review |
| Insight tone | Banned-word test, user reads every insight at C2, hide control |
| Flaky headless runs | Fresh profile per run, both browsers, CI as backstop |
| Leaks into the public repo | `open-pr.sh` and `verify.sh` scan text and the whole tree; obviously fictional names |
| Copilot import late | Early pack at C1; copyable contract-check errors; sample fallback in the checklist |
| Agent stalls on a permission prompt | D40 settings applied before Wave 0 |

---

## Housekeeping on approval (before Wave 0)

1. Copy this plan to the vault as `Build Plan.md`, and to the repo as `docs/build-plan.md` after a denylist scan.
2. Backfill the Prompt Log (the plan request and the two answers above). Add D37–D43 to the Decision Log. Amend US-1.2.1's wording (D42). Update the Build Log and memory.
3. Apply the D40 permissions through the update-config skill, in user-level local settings only.

## Verification (end to end)

- `scripts/verify.sh` runs lint, the full automated test page headless in Edge and Chrome, and a denylist scan of the tracked tree. It must be green on main after every merge, and CI must be green on every PR.
- `scripts/screenshot.sh` produces the view × width × zoom × comparison-mode matrix for the QA review and for C2.
- The Test Plan checkboxes and execution log are updated by the lead after each merge, and the Traceability Dashboard shows no Must story without a passing test before C3.
- The manual and Teams checks are done with the user at C3.
- The pre-demo regression (#66) is run before Tuesday's demo.
