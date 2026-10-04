/*
 * File: js/insights/rules-themes.js
 * Purpose: Recurring themes in leaders' words (US-2.5.1): a theme whose keywords come up in the success factors or
 *          commentary of at least TAP_COMMENT_THEMES.minRegions regions (3 by default) becomes an insight.
 * Provides: insight rules for the 'themes' family (via TAP.insights.defineRule): recurringTheme
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/reports/themes.js (TAP.themes),
 *             config/comment-themes.js
 * Used by: js/insights/engine.js
 *
 * The count is the app's own (D63), so it is shown as calculated by this app; each region's first quote is shown
 * as the leader wrote it, with its cell.
 */
(function (TAP) {
  'use strict';

  TAP.insights.defineRule('recurringTheme', function (ctx) {
    var u = ctx.util, min = TAP.themes.config().minRegions, total = u.regions().length;
    return TAP.themes.all().filter(function (th) { return th.regions.length >= min; }).map(function (th) {
      var ids = th.regions.map(function (g) { return g.regionId; }), n = ids.length, fields = {};
      th.regions.forEach(function (g) { g.quotes.forEach(function (q) { fields[q.field] = true; }); });
      var where = fields.successFactors && fields.commentary ? 'both' : fields.successFactors ? 'successFactors' : 'commentary';
      var count = { v: n, state: 'value', kind: 'APP',
        src: { combined: true, how: 'count', regionIds: ids, excluded: [], notApplicable: [] } };
      return { key: th.id, theme: th.id, regionIds: ids,
        vars: { theme: th.label, verb: u.phrase('themeVerb.' + (th.plural ? 'plural' : 'one')), where: u.phrase('themeWhere.' + where), n: n },
        figures: [u.figure(u.phrase('themeRegions', { theme: th.label }), count, 'count')].concat(th.regions.map(function (g) {
          var q = g.quotes[0];
          return u.figure(u.phrase('themeQuote', { region: u.name(g.regionId) }), { v: q.text, state: 'value', kind: 'IN', src: q.src }, 'text');
        })),
        sources: [count.src].concat(th.regions.map(function (g) { return g.quotes[0].src; })),
        // Strength grows from the threshold to every region, kept below the rules that compare figures
        strength: 0.2 * (n - min + 1) / Math.max(1, total - min + 1), money: 0 };
    });
  });
})(window.TAP);
