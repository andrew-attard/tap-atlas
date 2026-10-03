# Agent brief: how every build stream works

Read this first, then `docs/ARCHITECTURE.md`. Your own prompt adds your stories, your files and your order of work.

## The setting

TAP Atlas is a static web app opened from `file://`: plain HTML, CSS and JavaScript, classic scripts, no server and no build step. The repository is **public**, so it holds fictional data only.

You work in your own git worktree on one branch per story, named `feat/<issue>-<slug>` (or `fix/` or `chore/`), created from `origin/main`. The lead merges; you never merge.

## Rules that never bend

1. **Own only your files.** Your prompt lists the files you own and the ones you must not touch. If you need a change in a file you don't own (a contract, a page's script list, `css/base.css`, settings), describe it in your PR under "Contract changes" and stop or work around it locally. Never edit the file.
2. **Contracts are fixed.** Code against `docs/ARCHITECTURE.md`. If a contract doesn't fit, **stop and report** with a concrete proposal. Never quietly change a shape another stream relies on.
3. **Tests first.**
   - Each story starts with a `test(...)` commit that adds its automated test cases. They fail, or are pending until the code lands.
   - The `feat(...)` commit follows.
   - Label tests with their Test Plan ID, for example `T.test('TPV-TC-068', ...)`. Use `X-<area>-<slug>` for extra checks with no Test Plan ID.
   - Check numbers against hand calculations (`tests/fixtures/mini-expected.js`) or planted values (`docs/PLANTED-CASES.md`), **never against what your own code produced**.
4. **Nothing company-specific, ever.**
   - Use generic wording, fictional names and illustrative figures.
   - The pre-commit hook scans every added line against a private denylist. If it blocks you, change the content. **Never use `--no-verify`.**
5. **Platform limits:**
   - no `type="module"`, `import`/`export`, `fetch`, `XMLHttpRequest`, `eval` or `new Function`;
   - no web URLs in code;
   - no `console.log` (warnings and errors are fine);
   - `localStorage` only through `TAP.storage`.
6. **Theme only.**
   - No colour literals outside `js/theme.js`. Use `TAP_THEME` in JS and `var(--tap-*)` in CSS.
   - No `px` font sizes outside `js/theme.js` and `css/base.css`.
7. **Safe HTML.**
   - Build elements with `TAP.dom.el`.
   - Raw HTML goes only through `TAP.dom.html(el, str)`, with `str` built from `TAP.dom.esc()` output or fixed templates.
   - Any other `.innerHTML` line needs an `html-ok` comment saying why it's safe.
   - Builder `html` and ECharts tooltip or label formatters that return HTML pass **every** data value through `TAP.dom.esc()`. Names, commentary and success factors come from the workbooks.
8. **Small files.**
   - Aim for 300 lines or fewer. Lint fails at 350.
   - Split by job, not by size alone.
9. **Every file starts with the header** (`File`, `Purpose`, `Provides`, `Depends on`, `Used by`).
   - Comments are plain and short. They say why, not what.
10. **Shared-screen rules (D24)** for anything visible:
    - body text 16 px or more, chart labels 13 px or more;
    - nothing that only shows on hover;
    - no animation;
    - works at 1280 and 1920 px wide and at 125% and 150% zoom;
    - never colour alone: always a label or legend too.

## Your test file

Your test file (`tests/test-<area>.js`) and any fixture you own are already listed in `tests.html`. The header says which stream owns each one. Add your tests there; you never need to edit `tests.html`.

## Stubs

Every module already exists, either as a stub or as a real module. To build one:
1. Replace the stub call in the file you own with the real module.
2. Keep every function the contract lists.
3. Remove the stub line.

`tests/test-contracts.js` checks the shape, and `X-meta-no-stubs` fails at release if a stub is left.

## Running the checks

```sh
scripts/verify.sh                  # lint, denylist scan, all tests headless in Edge and Chrome
scripts/verify.sh --browser chrome # faster, one browser, while iterating
node tools/lint.js                 # lint only
scripts/test-headless.sh tests.html chrome
```

You can also open `tests.html` in a browser: `?only=TPV-TC-068` runs one case and `?suite=combine` runs one suite.

## Commits

Conventional Commits, with a body that ends in the issue reference and the co-author trailer:

```
feat(engine): combine regions by the US-1.2.5 rules

Totals sum, the rest averages, rates weight by settings, ratings carry their range.

Refs: #17
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `build`, `ci`, `style`. Scope is the area, for example `engine`, `panel`, `data`, `insights`, `shell`, `content`, `views`.

## Pull requests

- Open with `scripts/open-pr.sh "<title>" <body-file>`. It scans the title and body against the denylist and pushes.
- One PR per story, in story order. The body follows the template:
  - **What this changes**: two to four lines.
  - `Closes #N`.
  - **Tests run**: every test case ID for the story, each with pass or fail, plus the `verify.sh` summary for both browsers.
  - **Acceptance criteria**: each one, with the test case or manual check that covers it.
  - **Contract changes**: none, or the request.
  - **Files outside ownership**: none.
  - **Screenshots** for anything visible, from `scripts/screenshot.sh` (attach the file path; the lead views them).
- Before opening, rebase onto `origin/main` and rerun `scripts/verify.sh`.

## Definition of done (per story)

- Every acceptance criterion is covered by a test case, automated where the behaviour is logic.
- All automated cases for the story pass in Chrome and Edge. `verify.sh` is green.
- No console errors when the page is opened from the file system.
- Shared-screen rules met for anything visible.
- Headers are up to date; nothing company-specific; no stub left in your files.

## Stop and report

Stop and report to the lead, with what you tried and a proposal, when:
- a contract doesn't fit;
- you need a file you don't own;
- a test can't be made to pass without changing expected values;
- a permission prompt blocks you;
- you'd have to guess at a requirement that matters to the CRO-facing result.

Keep your final report short: PR links, test results, deviations and open questions.
