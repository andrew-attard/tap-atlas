/*
 * File: js/insights/rules-shared.js
 * Purpose: Shared targets (US-2.5.3): sub-industries and partners named by several regions, so references, assets or
 *          partners can be shared; and partner capacity (US-2.5.4): a partner planned to bring much more per person
 *          than the average across partners; and partner load (D112): a region whose partners carry much more order
 *          intake per partner salesperson than the other regions'.
 * Provides: insight rules for the 'shared' family (via TAP.insights.defineRule): sharedSubIndustry, sharedPartner,
 *           partnerCapacity, partnerLoad
 * Depends on: js/insights/engine.js (ctx.util), config/insight-rules.js, js/engine/rows.js (TAP.rows: rows, cells and
 *             matchKey, so names match as on the lists), js/engine/measures-p2.js (pt.oiPerFte, rc.all.oi.<channel>),
 *             js/engine/measures-pt.js (pt.fteSales), js/core/data.js (the channel list)
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
        vars[nameVar] = String(g.rows[0].item[field]).trim().replace(/\s+/g, ' ');
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

  // Each partner's order intake per person, against the average across partners (total order intake over total
  // FTE, the organization's pt.oiPerFte, which counts partly provided partners too; their figure carries its note).
  // Not computed with fewer than minPartners partners with FTE.
  TAP.insights.defineRule('partnerCapacity', function (ctx) {
    var u = ctx.util, p = ctx.params, rows = TAP.rows.list('partners');
    var withFte = rows.filter(function (row) { return u.value(TAP.rows.cell('partners', 'fte', row)) > 0; });
    if (withFte.length < p.minPartners) return [];
    var staffed = withFte.map(function (row) { return { row: row, cell: TAP.rows.cell('partners', 'oiPerFte', row) }; })
      .filter(function (x) { return u.provided(x.cell); });
    var avg = u.org('pt.oiPerFte');
    if (!(u.value(avg) > 0)) return [];
    return staffed.map(function (x) {
      var multiple = x.cell.v / avg.v, r = x.row.regionId, name = String(x.row.item.name || '').trim().replace(/\s+/g, ' ');
      // A partner with no name is named by its row, as on the capacity chart
      if (!name) name = TAP.content.text('rowBubble.noName', { row: x.row.sourceRow });
      if (multiple < p.multiple - SLACK) return null;
      var fte = TAP.rows.cell('partners', 'fte', x.row), arr = TAP.rows.cell('partners', 'arr3', x.row);
      return { key: r + ':' + x.row.sourceRow, regionIds: [r], items: [item('partners', x.row)],
        vars: { partner: name, region: u.name(r), amount: u.money(x.cell.v), multiple: u.phrase('about', { n: Math.round(multiple) }),
          avg: u.money(avg.v) },
        figures: [u.figure(u.phrase('perPerson', { partner: name }), x.cell, 'money'),
          u.fig('pt.oiPerFte', u.phrase('allPartners'), avg), u.figure(u.phrase('partnerFte', { partner: name }), fte, 'count')],
        strength: u.ratioStrength(multiple, p.multiple), money: u.moneyShare(u.value(arr) || 0, 'arr') };
    }).filter(Boolean);
  });

  // Year-1 order intake through every partner channel (all but direct, from the recap) per partner salesperson, against
  // the other regions' summed order intake over their summed sales staff (D112). Every partner channel counts, since
  // the partner sheet's staff serve all of them.
  TAP.insights.defineRule('partnerLoad', function (ctx) {
    var u = ctx.util, p = ctx.params;
    var channels = ((TAP.data.lookups() || {}).channels || []).map(function (c) { return c.id; }).filter(function (c) { return c !== 'direct'; });
    var load = {};
    u.regions().forEach(function (r) {
      var cells = channels.map(function (c) { return u.m('rc.all.oi.' + c, r, { year: 1 }); }), fte = u.m('pt.fteSales', r);
      if (!cells.length || !cells.every(function (c) { return u.value(c) !== null; }) || !(u.value(fte) > 0)) return;
      var oi = cells.reduce(function (t, c) { return t + c.v; }, 0);
      if (oi > 0) load[r] = { cells: cells, fte: fte, oi: oi };
    });
    var ids = Object.keys(load);
    return ids.map(function (r) {
      var x = load[r], rest = ids.filter(function (o) { return o !== r; });
      var avg = rest.reduce(function (t, o) { return t + load[o].oi; }, 0) / rest.reduce(function (t, o) { return t + load[o].fte.v; }, 0);
      var mine = x.oi / x.fte.v, ratio = mine / avg;
      if (!(avg > 0) || ratio < p.ratio - SLACK) return null;
      var oiCell = { v: x.oi, state: 'value', kind: 'APP', src: x.cells[0].src };
      return { key: r, regionIds: [r], provided: ids.length,
        vars: { region: u.name(r), oi: u.money(x.oi), fte: u.num(x.fte.v, 0), perPerson: u.money(mine), ratio: u.ratio(ratio), avg: u.money(avg) },
        figures: [u.figure(u.phrase('cover.partnerOi', { where: u.name(r) }), oiCell, 'money'), u.fig('pt.fteSales', u.name(r), x.fte)]
          .concat(x.cells.map(function (c, i) { return u.fig('rc.all.oi.' + channels[i], u.name(r) + ', ' + u.phrase('year1'), c); })),
        strength: u.ratioStrength(ratio, p.ratio), money: u.moneyShare(x.oi, 'arr') };
    }).filter(Boolean);
  });
})(window.TAP);
