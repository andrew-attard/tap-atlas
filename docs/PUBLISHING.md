# Publishing the sample edition

How to put the portfolio edition on the web with GitHub Pages, and what to check afterwards.

> **GitHub Pages is not switched on (D59).** The portfolio edition is built and ready, but publishing it is the project owner's decision. Nothing in this repository switches it on. These are the steps for when that decision is made.

## What gets published

Only what is already in the public repository: the sample edition (`index-sample.html`) on fictional data, the landing page (`docs/index.html`), and the documents. The real data file and the organization layer are gitignored, so they are never in the repository and can never be published.

The sample edition is ready for a web host as it is:

- every script, stylesheet, font and the chart library load from the folder by relative paths, so nothing is requested from another site;
- file names are spelled exactly as they are on disk (a web host is strict about upper and lower case, Windows isn't);
- no code depends on being opened from `file://`;
- it loads no organization layer and shows the "Sample data" label on every screen.

`node tools/check-docs3.js` checks the first three on every run of `scripts/verify.sh`. `tests.html` checks the last one.

## Try it on a local web host first

From the repository folder, with Python 3:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index-sample.html` in Chrome or Edge and run the checks below. Stop the server with Ctrl+C.

## Switch on GitHub Pages

1. Make sure `main` is the build you want to show and `scripts/verify.sh` passes.
2. Add an empty file named `.nojekyll` at the top of the repository and commit it. Without it, GitHub runs every page through its Jekyll site builder, which changes how the Markdown files are served and adds a build step that can fail.
3. On GitHub, open the repository's **Settings**, then **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Set **Branch** to `main` and the folder to **/ (root)**, then **Save**.
   - Use the root, not the `/docs` folder: the landing page opens the sample edition one folder up, and the app's files sit at the top of the repository.
6. Wait for the **pages build and deployment** run on the **Actions** tab to finish. Pages then shows the site address, in the form `https://<owner>.github.io/<repository>/`.
7. Share these two addresses (the site's top address opens the internal edition, which has no data on the web, so don't share that one):
   - the landing page: `https://<owner>.github.io/<repository>/docs/`
   - the sample edition: `https://<owner>.github.io/<repository>/index-sample.html`

## What to check after

In Chrome and in Edge, with the developer tools open (F12):

1. **The address starts with `https://`** and the browser shows it as secure.
2. **The landing page** (`docs/index.html`) shows its text and every screenshot. Its button opens the sample edition.
3. **The Overview appears**, then open every view from the menu: Overview, Industry priorities, New business, Customer growth, Partners, Regions, Insights and Guide. Each one draws its charts.
4. **No console errors** on the **Console** tab while going through the views.
5. **No request outside the site.** On the **Network** tab, tick **Disable cache**, reload, and go through every view again. Every row's address starts with the site address above. Nothing goes to another domain: no fonts, no chart library, no analytics.
6. **The "Sample data" label** is visible at the top of every view.
7. **Fonts and charts** look the same as when the folder is opened by double-click: the Archivo font, and charts that draw without gaps.

If anything fails, switch Pages off (below), fix it on a branch and publish again.

## Keep it current

Pages republishes on every push to `main`. After a release, open both addresses and repeat the checks. The screenshots on the landing page are refreshed by the screenshot script once it lands (US-3.4.3).

## Switch it off again

**Settings**, then **Pages**, then **Unpublish site** (or set **Source** back to **None**). The site goes offline within a few minutes. Nothing in the repository changes.
