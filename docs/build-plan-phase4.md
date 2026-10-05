# Build plan: Phase 4 (full template)

Stories: the project's Epics & User Stories note, "Phase 4: Full template" (US-4.1.1 to US-4.6.4, issues #435 to #460, milestone "Phase 4: Full template"). Test cases TPV-TC-634 to TPV-TC-766. Contracts: `docs/ARCHITECTURE.md` section 19. Decisions D84 to D87. Release: `v0.4.0`.

## Waves

| Wave | Streams (one worktree each) | Stories | Depends on |
|---|---|---|---|
| 0 (lead) | contracts, stubs, the Outlook view in the menu, page lists, settings weight | - | v0.3.1 released |
| A | DATA4 | US-4.1.1, 4.1.2, 4.1.3 | Wave 0 |
| A | ENGINE4 | US-4.1.4 | Wave 0 (tests on its own mini-p4 fixture, so it does not wait for DATA4) |
| B | OUTLOOK | US-4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.3.1, 4.3.2, 4.4.2 | A merged |
| B | NBPT | US-4.4.1, 4.4.3, 4.5.1, 4.5.2, 4.5.3 | A merged |
| B | INSIGHTS4 | US-4.6.2 | A merged |
| B | PAGES4 | US-4.6.1, 4.6.3, 4.6.4 | A merged; reads OUTLOOK and NBPT report ids from section 19 |
| C (lead) | QA: verify --release, scripts/qa/run-all.sh, imperfect-data runs, Test Plan, release | - | B merged |

At most four agents at once (B). Never scripted QA and browser-driving agents together.

## Order inside each stream

Musts first, then Shoulds, then Coulds. Tests first (a failing `test(...)` commit), then `feat(...)`. One PR per story; a stream may stack its own PRs.

## Definition of done

As D30: every acceptance criterion has a recorded test case that ran and passed (automated in both browsers, or a manual case with a screenshot for the lead), the explanation exists for every new report, the denylist scan is clean, `verify.sh` passes in both browsers.
