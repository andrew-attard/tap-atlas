/*
 * File: content/text-extra.js
 * Purpose: Wording for extra template sections: the contract check's warnings about them, source addresses and
 *          the Other sections view.
 * Provides: adds to window.TAP_CONTENT.text
 * Depends on: content/ui-text.js
 * Used by: js/core/extra.js, js/core/sources.js, js/views/other.js
 * Owner: EXTRA stream. Placeholders in {braces} are filled in by the code.
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.text = window.TAP_CONTENT.text || {};
Object.assign(window.TAP_CONTENT.text, {
  extra: {
    region: 'Region',
    // The cell of an extra-section value whose column letter the data file doesn't give
    sourceRow: 'row {row}',
    // The contract check's warnings (US-3.2.1). Technical on purpose: they are pasted into Copilot.
    check: {
      message: '{path} (section "{section}"): expected {expected}, found {found}',
      list: 'a list of extra sections',
      section: 'a section object with id, title, intro and columns',
      id: 'a section id (text) that no other section uses',
      title: 'the section title, as text',
      intro: 'an introduction, as text',
      columns: 'a list of at least one column',
      column: 'a column object with key, label, unit and kind',
      key: 'a column key (text) not used by another column, and not "region" or "sourceRow"',
      label: 'the column heading, as text',
      unit: 'a unit: {list}',
      kind: 'a kind: {list}',
      letter: 'a worksheet column letter such as "D", or nothing',
      extra: 'an object with one list of rows per extra section id',
      known: 'a section id listed in meta.extraSections',
      rows: 'a list of rows',
      row: 'a row object',
      rowKey: 'only column keys of this section',
      number: 'a number, or null for a blank',
      text: 'text, or null for a blank'
    }
  }
});
