/*
 * File: js/insights/rules-shared.js
 * Purpose: Shared targets (US-2.5.3): sub-industries and partners named by several regions, so references, assets or
 *          partners can be shared; and partner capacity (US-2.5.4): a partner planned to bring much more per person
 *          than the average across partners.
 * Provides: insight rules for the 'shared' family (via TAP.insights.defineRule): sharedSubIndustry, sharedPartner,
 *           partnerCapacity
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/engine/rows.js (TAP.rows: rows, cells and
 *             matchKey, so names match as on the lists), js/engine/measures-p2.js (pt.oiPerFte)
 * Used by: js/insights/engine.js
 *
 * Each finding names the list rows it is about (items, 17.4), so "Show me" can point the list or the bubbles at them.
 */
(function (TAP) {
  'use strict';

  var SLACK = 1e-9;   // a multiple of exactly the threshold counts, whatever the floating-point rounding

  function item(source, row) { return { section: TAP.rows.section(source), regionId: row.regionId, row: row.sourceRow }; }

  // Rows grouped by the name they are matched on (US-2.1.5, US-2.3.4), keeping groups named by at least min regions.
  function shared(source, field, min) {
    var groups = {}, order = [];
    TAP.rows.list(source).forEach(function (row) {
      var k = TAP.rows.matchKey(row.item[field]);
      if (!k) return;
      if (!groups[k]) { groups[k] = { key: k, rows: [], regionIds: [] }; order.push(k); }
      groups[k].rows.push(row);
      if (groups[k].regionIds.indexOf(row.regionId) < 0) groups[k].regionIds.push(row.regionId);
    });
    return order.map(function (k) { return groups[k]; }).filter(function (g) { return g.regionIds.length >= min; });
  }

  // One finding per shared name: the regions, the name as the first region wrote it, and each row's own cell.
  function sharedRule(source, field, nameVar) {
    return function (ctx) {
      var u = ctx.util, p = ctx.params, total = u.regions().length;
      return shared(source, field, p.minRegions || 2).map(function (g) {
        var vars = { n: g.regionIds.length, regions: u.list(g.regionIds.map(u.name)) };
        vars[nameVar] = String(g.rows[0].item[field]).trim();
        var amounts = g.rows.map(function (row) { return TAP.rows.cell(source, 'arr3', row); }).filter(u.provided);
        return { key: g.key, regionIds: g.regionIds, vars: vars,
          industryIds: g.rows.map(function (row) { return row.item.industryId; }).filter(function (id, i, all) { return id && all.indexOf(id) === i; }),
          items: g.rows.map(function (row) { return item(source, row); }),
          figures: g.rows.map(function (row) {
            return u.figure(u.phrase('namedBy', { region: u.name(row.regionId) }), TAP.rows.cell(source, field, row), 'text');
          }),
          strength: u.shareStrength(g.regionIds.length / total, (p.minRegions || 2) / total),
          money: u.moneyShare(amounts.reduce(function (s, c) { return s + c.v; }, 0), 'arr') };
      });
    };
  }

  TAP.insights.defineRule('sharedSubIndustry', sharedRule('newBusiness', 'subVertical', 'subIndustry'));
  TAP.insights.defineRule('sharedPartner', sharedRule('partners', 'name', 'partner'));

  // Partners with a whole order intake per person, against the average across partners (total order intake over
  // total FTE, the organization's pt.oiPerFte). Not computed with fewer than minPartners partners with FTE.
  TAP.insights.defineRule('partnerCapacity', function (ctx) {
    var u = ctx.util, p = ctx.params;
    var staffed = TAP.rows.list('partners').map(function (row) { return { row: row, cell: TAP.rows.cell('partners', 'oiPerFte', row) }; })
      .filter(function (x) { return u.provided(x.cell) && !x.cell.partial; });
    if (staffed.length < p.minPartners) return [];
    var avg = u.org('pt.oiPerFte');
    if (!(u.value(avg) > 0)) return [];
    return staffed.map(function (x) {
      var multiple = x.cell.v / avg.v, r = x.row.regionId, name = String(x.row.item.name || '').trim();
      if (multiple < p.multiple - SLACK) return null;
      var fte = TAP.rows.cell('partners', 'fte', x.row);
      return { key: r + ':' + x.row.sourceRow, regionIds: [r], items: [item('partners', x.row)],
        vars: { partner: name, region: u.name(r), amount: u.money(x.cell.v), multiple: u.phrase('about', { n: Math.round(multiple) }),
          avg: u.money(avg.v) },
        figures: [u.figure(u.phrase('perPerson', { partner: name }), x.cell, 'money'),
          u.fig('pt.oiPerFte', u.phrase('allPartners'), avg), u.figure(u.phrase('partnerFte', { partner: name }), fte, 'count')],
        strength: u.ratioStrength(multiple, p.multiple), money: u.moneyShare(x.cell.v * (fte.v || 0), 'arr') };
    }).filter(Boolean);
  });
})(window.TAP);
