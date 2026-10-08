/*
 * File: js/views/overview-land.js
 * Purpose: The parts of a region card that ask whether the plan will land (D117): the plan against the strategic
 *          plan, and three checks (pipeline cover in year 1, new customers needed, growth in the top 3 accounts),
 *          each with the other regions' figure and a "discuss" marker where an insight on the same figure exists.
 * Provides: TAP.overviewLand (cells, strategic, checks, available)
 * Depends on: js/engine/measures.js, js/engine/measures-p4.js (available), js/core/data.js, js/core/dom.js,
 *             js/core/format.js, js/core/icons.js, js/ui/layers.js, content/text-overview.js,
 *             js/views/overview-cards.js (TAP.overviewCards.figure, at call time), js/insights/engine.js (at call time)
 * Used by: js/views/overview-cards.js
 *
 * Every figure is the catalogue's own cell, read as the matching insight rule reads it, so a card never shows a
 * second calculation of what an insight says.
 */
(function (TAP) {
  'use strict';

  // The insight rule behind each line: a marker shows when that rule found something for the region
  var RULE = { sp: 'spGap', cover: 'pipelineCover', wins: 'winsVsPeers', top3: 'concentration' };
  var SP = ['sp.variancePct', 'sp.plan', 'sp.oi', 'sp.variance'];
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('overview.cards.' + key, vars); };
  var figure = function (spec, cls) { return TAP.overviewCards.figure(spec, cls); };

  function isNp(c) { return !c || c.state !== 'value'; }
  function label(id) { var m = TAP.measures.meta(id); return m ? m.label : id; }
  // The strategic plan is an optional part of the template: a file without it shows no strategic plan line (D57)
  function available() { return typeof TAP.measures.available === 'function' && TAP.measures.available('sp.oi'); }

  function cells(ent, out) {
    ['nb.wins', 'cg.top3Share', 'base.pipeline12m'].concat(available() ? SP : []).forEach(function (id) {
      out[id] = TAP.measures.combined(id, ent, {});
    });
    out.goal = TAP.measures.combined('nb.arr', ent, { year: 1 });
    return out;
  }

  /* ---------- figures ---------- */

  // Pipeline cover, year 1: pipeline created in the last 12 months over the year-1 new business ARR goal. These are
  // the pipelineCover rule's two inputs, read the other way up, so a larger cover means more recent pipeline.
  function cover(pipe, goal) {
    if (isNp(pipe) || isNp(goal)) return { state: 'notProvided' };
    return goal.v > 0 ? { state: 'value', v: pipe.v / goal.v, kind: 'APP' } : { state: 'notApplicable' };
  }
  function times(c, exact) {
    if (c.state === 'notApplicable') return t('land.noGoal');
    if (isNp(c)) return TAP.format.cell(c, {});
    // One decimal, kept when it is 0 so the cards line up ("4.0×"); 12 significant digits first, so 0.25 that division
    // left as 0.2499999… still rounds up
    var d = exact || (c.v > 0 && c.v < 0.05) ? 2 : 1, p = Math.pow(10, d);
    return (Math.round(Number(c.v.toPrecision(12)) * p) / p).toFixed(d) + '×';
  }
  function whole(c) { return isNp(c) ? null : TAP.format.num(c.v, { decimals: 0 }); }

  // The other regions in the file, as the insight rules set a region against "the others" (TAP.insights.util.others):
  // a count is their simple average, a share the ratio of their summed parts.
  function others(id, regionId, how, ctx, keep) {
    var ids = TAP.data.regions().map(function (r) { return r.id; }).filter(function (r) { return r !== regionId && (!keep || keep(r)); });
    return TAP.measures.combined(id, { kind: 'combined', regionIds: ids, how: how }, Object.assign({ year: null }, ctx || {}));
  }
  // The others' pipeline against their goals, together, among the regions that give both (a ratio of their sums).
  function othersCover(regionId) {
    var both = function (r) {
      var g = TAP.measures.get('nb.arr')(r, { year: 1 }), p = TAP.measures.get('base.pipeline12m')(r, {});
      return !isNp(p) && !isNp(g) && g.v > 0;
    };
    var pipe = others('base.pipeline12m', regionId, 'total', null, both), goal = others('nb.arr', regionId, 'total', { year: 1 }, both);
    return { pipe: pipe, goal: goal, cell: cover(pipe, goal) };
  }

  /* ---------- markers ---------- */

  function insightFor(rule, ent) {
    var I = TAP.insights;
    if (ent.kind === 'combined' || !I || I.__stub || typeof I.all !== 'function') return null;
    try {
      var off = typeof I.hidden === 'function' ? I.hidden() : [], id = ent.regionIds[0];
      return I.all().filter(function (x) {
        return x.ruleId === rule && !x.context && x.regionIds.length === 1 && x.regionIds[0] === id && off.indexOf(x.id) < 0;
      })[0] || null;
    } catch (e) { return null; }
  }

  // A glyph and the word "discuss" (never colour alone, D24; no verdict, D20). It opens the insight's Show me.
  function marker(key, ent) {
    var x = insightFor(RULE[key], ent);
    if (!x) return null;
    return el('button', { type: 'button', class: 'tap-ov-card__discuss', 'data-rule': RULE[key],
      'aria-label': t('land.discussLabel', { sentence: x.sentence }),
      onclick: function (e) {
        e.stopPropagation();
        if (x.reportId) TAP.bus.emit('showme', { insightId: x.id, target: x.highlight });
        else TAP.layers.openDetails(x.highlight);
      } }, [TAP.icons.svg('insight', { size: 16 }), t('land.discuss')]);
  }

  /* ---------- the parts ---------- */

  // "6% below strategic plan", in the spGap rule's own figures; "No strategic plan" when the region has none.
  function strategic(c, ent, spec) {
    if (!available()) return null;
    var pct = c['sp.variancePct'];
    if (isNp(pct)) return el('p', { class: 'tap-ov-card__sp' }, t('sp.none'));
    var way = Math.abs(pct.v) < 0.0005 ? 'inLine' : pct.v < 0 ? 'below' : 'above';   // "in line" when it would read 0%
    var s = spec('sp.variancePct', 'pct');
    s.text = t('sp.' + way, { pct: TAP.format.pct(Math.abs(pct.v)) });
    s.rows = SP.map(function (id) { return spec(id, id === 'sp.variancePct' ? 'pct' : 'money'); });
    return el('p', { class: 'tap-ov-card__sp' }, [figure(s, 'tap-ov-fig--words'), ' ', marker('sp', ent)]);
  }

  // The term opens the glossary popover (js/ui/glossary.js listens page-wide); the card leaves its clicks alone.
  function coverLabel() {
    return [el('button', { type: 'button', class: 'tap-term', 'data-term': 'pipelineCoverY1' }, t('land.coverTerm')), t('land.coverAfter')];
  }

  // One check: its label, the value with its marker, and the other regions' figure beneath (none on a combined card).
  function check(key, ent, value, rest) {
    return el('div', { class: 'tap-ov-card__check', 'data-part': key, 'data-check': key }, [
      el('span', { class: 'tap-ov-card__label' }, key === 'cover' ? coverLabel() : t('land.' + key)),
      el('span', { class: 'tap-ov-card__checkvalue' }, [figure(value), ' ', marker(key, ent)]),
      rest ? el('span', { class: 'tap-ov-card__others' }, [t('land.others'), ' ', figure(rest)]) : null
    ]);
  }

  function coverSpec(cell, pipe, goal, name) {
    return { measure: 'cover.y1', cell: cell, label: name, text: times(cell), exact: times(cell, true),
      rows: [{ label: name, text: times(cell, true) }, pipe, goal] };
  }

  // The heading and the three checks, each its own part so the cards in a row line them up.
  function checks(c, ent, spec) {
    var mine = ent.kind !== 'combined', r = ent.regionIds[0], name = t('land.coverTerm') + t('land.coverAfter');
    var rest = function (what, id, unit, cell, ctx) {
      return { measure: id, cell: cell || others(id, r, 'average', ctx), unit: unit, label: t('land.othersLabel', { what: what }) };
    };
    var goal = Object.assign(spec('nb.arr', 'money'), { cell: c.goal, label: t('land.goal') });
    var cv = coverSpec(cover(c['base.pipeline12m'], c.goal), spec('base.pipeline12m', 'money'), goal, name), restCv = null;
    if (mine) {
      var oc = othersCover(r);
      restCv = coverSpec(oc.cell, rest(label('base.pipeline12m'), 'base.pipeline12m', 'money', oc.pipe),
        rest(goal.label, 'nb.arr', 'money', oc.goal), t('land.othersLabel', { what: name }));
    }
    var wins = Object.assign(spec('nb.wins', 'count'), { text: whole(c['nb.wins']) });
    var restWins = mine ? rest(label('nb.wins'), 'nb.wins', 'count') : null;
    if (restWins) restWins.text = whole(restWins.cell);
    return [
      el('p', { class: 'tap-ov-card__landtitle', 'data-part': 'land' }, t('land.title')),
      check('cover', ent, cv, restCv),
      check('wins', ent, wins, restWins),
      check('top3', ent, spec('cg.top3Share', 'pct'), mine ? rest(label('cg.top3Share'), 'cg.top3Share', 'pct') : null)
    ];
  }

  TAP.overviewLand = { cells: cells, strategic: strategic, checks: checks, available: available, SP: SP };
})(window.TAP);
