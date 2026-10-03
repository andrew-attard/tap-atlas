/*
 * File: content/text-data.js
 * Purpose: Wording for source addresses and the contract check: separators, "calculated" labels, combined-figure sources.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/core/sources.js, js/core/check.js through TAP.content.text
 * Owner: the DATA stream. Placeholders in {braces} are filled in by the code; the organization layer can
 *        replace any phrase by using the same key.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  sources: {
    sep: ' › ',
    calculated: 'calculated in the workbook',
    combined: {
      sum: 'Combined by this app: total of {n} regions',
      mean: 'Combined by this app: average of {n} regions',
      wmean: 'Combined by this app: weighted average of {n} regions',
      rating: 'Combined by this app: average rating of {n} regions',
      count: 'Combined by this app: counted across {n} regions',
      list: 'Combined by this app: listed for {n} regions'
    },
    excluded: '{names} not included: not provided',
    unknownFile: 'unknown file'
  }
});
