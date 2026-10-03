/*
 * File: content/ui-text.js
 * Purpose: General on-screen wording (app name, tour, guide and glossary screens), so wording changes need no code.
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
  app: { name: 'TAP Atlas', subtitle: 'Territory Account Plan Atlas' }
});
