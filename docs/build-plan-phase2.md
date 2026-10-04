# Build plan: Phase 2 (broader demo)

Phase 2 adds the New business, Customer growth and Partners views, a region profile, list reports, more breakdowns, drill-down, new insights and self-serve polish. Stories US-2.1.1 to US-2.7.5 (37), test cases TPV-TC-271 to TPV-TC-515. Contracts: `docs/ARCHITECTURE.md` section 17. Release: `v0.2.0`.

## Waves

**Wave 0 (lead, #212):** contracts (section 17), the shared view header, the `list` shape in the registry, the profile route, row targets in details, every new file as a stub, script lists rebuilt.

**Wave A (5 streams, each in its own worktree, one branch and PR per story):**

| Stream | Stories, in order |
|---|---|
| ENGINE2 | 2.7.4 measures (and the miniP2 fixture), 2.7.5 breakdowns, 2.7.2 rows and list builder, 2.7.3 dot plot, `options.refLines` |
| PANEL2 | 2.7.2 list panel (generic option clicks, sticky header, row clicks), 2.6.4 value kinds on lists and tables, 2.7.1 drill-down |
| NB | 2.1.1 view, 2.1.2 industries, 2.1.3 channels, 2.1.4 levers, 2.1.5 sub-industries, 2.1.6 success factors |
| CGP | 2.2.1, 2.2.2, 2.2.3, 2.2.5, 2.3.1, 2.3.2, then 2.2.4, 2.2.6, 2.3.3, 2.3.4 and row details |
| INSIGHTS2 | planted cases and theme keywords in the sample data (part of 2.7.4), 2.5.2, 2.5.5, 2.5.1, 2.5.3, 2.5.4 |

Merge order: ENGINE2 measures first, then the list builder and list panel, then the views and rules as they come.

**Wave B (after Wave A):** PROFILE (2.4.1 to 2.4.5), PAGES2 (2.6.1, 2.6.2, 2.6.3, 2.6.5), INSIGHTS2 (2.5.6), and QA (screenshot matrix, console, D24 sizes, offline) with an integrator for the defects.

**Release:** `scripts/verify.sh --release` green in both browsers, Test Plan ticked from the dumps, tag and release `v0.2.0` (D58). `v0.1.0` stays the build for the 6 Oct demo and the Copilot handover (D57).

## Rules that carry over

Tests first; numbers checked against hand calculations or planted cases; one owner per file; stop and report when a contract doesn't fit; nothing company-specific; Musts never slip without asking. If time runs short, Should and Could stories move to Phase 3.
