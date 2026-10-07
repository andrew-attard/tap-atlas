/*
 * File: content/ui-text.js
 * Purpose: General on-screen wording (app name, the term popover, organization file problems), so wording changes need no code.
 *          Each stream keeps its own wording in content/text-<area>.js; all of it lands in TAP_CONTENT.text.
 * Provides: window.TAP_CONTENT.text
 * Depends on: nothing
 * Used by: js/core/content.js (TAP.content.text) and through it every module that shows words
 *
 * Placeholders in {braces} are filled in by the code, e.g. {focus} or {n}.
 * The organization layer (content/organization.js) can replace any of these by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = Object.assign(window.TAP_CONTENT.text || {}, {
  app: { name: 'TAP Atlas' },

  // The term popover (US-1.6.4). There is no A to Z glossary list (D98)
  glossary: {
    why: 'Why it matters:',
    close: 'Close the definition'
  },

  // Problems with content/organization.js, shown in the data sources panel (US-1.6.6).
  // org.error wraps the list of problems; the other keys are the problems themselves.
  org: {
    error: 'The organization file (content/organization.js) was not used. {problems} The app is showing the general wording only. Compare the file with content/organization.example.js, then reload the page.',
    script: 'It has a script error: {detail}.',
    notObject: 'It must set window.TAP_ORG to an object in braces { }, as the example file does.',
    badPart: '"{part}" must be an object in braces { }.',
    badList: '"{part}" must be a list in square brackets [ ], and every item needs an id.',
    badTerm: 'The glossary entry "{id}" needs a term and a short definition.',
    badRegion: 'The short name for region "{id}" must be text in quotes.',
    unknownPart: '"{part}" is not a part the app knows. The parts are text, glossary, guide, regions and settings.'
  }
});
