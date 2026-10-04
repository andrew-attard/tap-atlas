/*
 * File: config/reports-themes.js
 * Purpose: Report definitions for the New business (themes) view: which themes recur in leaders' words (US-2.5.1).
 * Provides: adds to window.TAP_REPORTS ('nb-themes')
 * Depends on: config/reports.js (schema); config/comment-themes.js, read when the explanation is shown
 * Used by: js/engine/registry.js, js/views/new-business.js (layout, NB stream)
 * Owner: INSIGHTS2 stream
 *
 * The explanation lists every theme's keywords, so a viewer can see why a comment was counted. It is read from the
 * theme configuration each time it is shown, which loads after this file.
 */
window.TAP_REPORTS = window.TAP_REPORTS || {};

window.TAP_REPORTS['nb-themes'] = {
  id: 'nb-themes', view: 'newBusiness',
  title: 'Which themes recur in leaders’ words?',
  explain: {
    shows: 'Themes that come up in the leaders’ success factors (New Business) and commentary (Market Coverage), ranked by how many regions mention them. Choose a theme to read what each region wrote, with the cell it came from.',
    get read() {
      var themes = ((window.TAP_COMMENT_THEMES || {}).themes || []).map(function (th) {
        return th.label + ': ' + (th.keywords || []).join(', ');
      });
      return 'Each bar counts the regions where at least one success factor or comment holds one of the theme’s keywords, as a whole word in any case. The app counts them from a keyword list in its configuration; nothing is tagged in the workbooks. The keywords are: ' +
        themes.join('; ') + '.';
    },
    lookFor: 'Themes most regions share, which may call for one answer across regions, and the words behind each count: a keyword can come up in a different sense, so read the quotes before drawing a conclusion.'
  },
  shape: 'compare', builder: 'themes', dimension: 'entity', measures: [],
  defaultType: 'bar', types: ['bar', 'table'],
  breakdowns: [], sources: ['IN', 'APP'], options: {}
};
