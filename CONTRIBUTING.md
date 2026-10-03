# Contributing

How work is done in this repository. Short on purpose.

## Work is tracked as issues

Every epic and user story is a GitHub issue. Stories are sub-issues of their epic, carry their acceptance criteria and the IDs of the test cases that verify them, and belong to a phase milestone. Progress is visible on the project board.

## Branches

One branch per story or chore, named after its issue:

```
feat/12-switch-chart-type
fix/31-tooltip-format
chore/81-repo-conventions
```

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(panel): add chart-type menu limited to the report's data shape

Explain what changed and why, in plain words. Wrap at about 72
characters.

Refs: #12
```

- **Types:** `feat`, `fix`, `test`, `docs`, `refactor`, `style`, `chore`
- **Subject:** imperative ("add", not "added"), under about 72 characters, no full stop
- **Footer:** `Refs: #N` on each commit; the pull request uses `Closes #N`
- One logical change per commit

## Pull requests

- Open one per branch, using the template: what changed, `Closes #N`, the tests run
- Merged with **rebase and merge** once tests pass, so `main` stays linear and every commit keeps its issue reference
- Branches are deleted after merging

## Code comments

Plain words that most people can follow, kept short. Explain why a block exists or what it is for, not what each line does. Every file starts with a short header: its purpose, what it depends on, and what depends on it.

## Data rules (this repository is public)

- **Fictional sample data only.** The live data file (`data/plan-data.js`) is ignored by Git and never committed.
- **No spreadsheets or exports** (`.xlsx`, `.csv` and similar).
- **No organization-specific names or terms.** A pre-commit hook checks every added line and every commit message against a private denylist kept outside the repository.
- Enable the hooks once after cloning: `git config core.hooksPath .githooks`

## Running the checks

Open `tests.html` from the folder to run every automated test in the browser. **Copy results** puts a plain-text summary on the clipboard for the execution log. `tests/selftest.html` checks the test harness itself.

From a terminal (WSL or Linux, with Node 18+ and Chrome or Edge):

```
scripts/verify.sh                    # lint, denylist scan, data-file guard, headless tests in Chrome and Edge
scripts/verify.sh --browser chrome   # one browser only
scripts/verify.sh --release          # stricter: warnings fail, tests with no test yet fail
node tools/lint.js                   # lint only (add --self-test to check the linter)
scripts/test-headless.sh tests.html chrome
scripts/screenshot.sh tests.html "" 1280 800 1.25 /tmp/shot.png
scripts/open-pr.sh "<title>" <body-file>
```

Test filters: `tests.html?only=TPV-TC-077` runs one case, `tests.html?suite=format` runs one suite, and `?release=1` makes missing tests fail. Run `scripts/verify.sh` before opening a pull request; CI runs lint and the Chrome tests on every pull request.
