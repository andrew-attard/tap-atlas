# Build plan: Phase 3 (final)

Phase 3 adds presentation mode, custom charts, extra template sections for Copilot, the final handover pack and the portfolio edition. Stories US-3.1.1 to US-3.5.3 (18), test cases TPV-TC-516 to TPV-TC-633. Contracts: `docs/ARCHITECTURE.md` section 18. Decisions D65 to D68 and D70. Release: `v0.3.0` (D58). The portfolio edition is built but GitHub Pages is not switched on (D59).

## Waves

**Wave 0 (lead, #310):** section 18, conditional views (`available()`), Guide extras, panel definition objects and starting choices, stubs for every new file, script lists rebuilt.

**Wave A (4 streams, each in its own worktree, one branch and PR per story):**

| Stream | Stories, in order |
|---|---|
| PRESENT | 3.1.1 running order, 3.1.2 present, 3.1.4 insight steps, 3.1.3 record from the screen |
| CUSTOM | 3.5.2 combination rules, 3.5.1 build a chart, 3.5.3 session list |
| EXTRA | 3.2.1 extra sections in the contract and sample data, 3.2.2 Other sections view, 3.2.3 extension guide and Copilot prompts |
| DOCS3 | 3.4.2 sample edition for the web, 3.4.1 landing page, 3.3.1 handover guide, 3.3.2 final contract history (after EXTRA's 3.2.1), 3.3.3 prompts and README, 3.3.4 package script, 3.4.3 screenshots, 3.4.4 case study |

**Close-out:** QA (screenshot matrix, console, D24, offline, smoke), release gate, Test Plan ticked, tag and release `v0.3.0`.

## Rules that carry over

Tests first; numbers checked against hand calculations or planted cases; one owner per file; stop and report when a contract doesn't fit; nothing company-specific; Musts never slip without asking; unfinished Should and Could stories become known limits in the handover guide.
