/*
 * File: js/views/regions-parts.js
 * Purpose: The parts of a region profile besides its reports: the plan at a glance against the rest (the four card
 *          lines of US-1.5.1, US-2.4.2), the region's insights, and everything its leader wrote (US-2.4.4).
 * Provides: TAP.profileParts (glance, compare, drawGlance, insights, words)
 * Depends on: js/core/dom.js, js/core/content.js, js/core/format.js, js/core/sources.js, js/engine/measures.js,
 *             js/engine/scope.js, js/ui/layers.js, js/views/overview-cards.js (openSource), js/views/regions.js
 *             (TAP.profile.cmp), js/insights/engine.js (all at call time)
 * Used by: js/views/regions.js
 * Owner: PROFILE stream (#215, #217)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('profile.' + key, vars); }
  function ot(key, vars) { return TAP.content.text('overview.cards.' + key, vars); }
  function meta(id) { return TAP.measures.meta(id) || { label: id, short: id }; }

  /* ---------- the plan at a glance (US-2.4.2) ---------- */

  // The four lines of the Overview cards, with the figures each shows (label: the words the cards use).
  var LINES = [
    { key: 'ambition', figures: [['amb.arr', 'money', function () { return t('glance.total'); }], ['nb.arr', 'money', function () { return ot('nb'); }],
      ['cg.arr', 'money', function () { return ot('cg'); }], ['amb.services', 'money', function () { return ot('services'); }]] },
    { key: 'focus', figures: [['focus.tier1', 'count', function () { return ot('tier', { n: 1 }); }],
      ['focus.tier2', 'count', function () { return ot('tier', { n: 2 }); }]] },
    { key: 'pool', figures: [['nb.targetAccounts', 'count', function (id) { return meta(id).label; }]] },
    { key: 'customers', figures: ['strategic', 'growth', 'core', 'scaled'].map(function (s) {
      return ['cg.segment.' + s, 'count', function (id) { return meta(id).short || meta(id).label; }];
    }) }
  ];

  function isValue(c) { return !!c && c.state === 'value' && typeof c.v === 'number'; }

  // Where the region's figure sits against the average of the rest, in neutral words (D20): never good or bad.
  function compare(region, rest) {
    if (!isValue(region) || !isValue(rest)) return { key: null, text: '' };
    var a = region.v, b = rest.v, tol = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    var key = Math.abs(a - b) <= tol ? 'same' : a > b ? 'above' : 'below';
    return { key: key, text: t('glance.' + key) };
  }

  // [{key, label, np, figures: [{measure, label, unit, region, rest, compare, target, restTarget}]}] for one region.
  function glance(regionId) {
    var ents = TAP.scope.entities(TAP.profile.cmp(regionId)), me = ents[0], rest = ents[1];
    return LINES.map(function (line) {
      var figures = line.figures.map(function (f) {
        var region = TAP.measures.combined(f[0], me, {}), avg = TAP.measures.combined(f[0], rest, {});
        return { measure: f[0], unit: f[1], label: f[2](f[0]), region: region, rest: avg, compare: compare(region, avg),
          target: { regionIds: [regionId] }, restTarget: { regionIds: rest.regionIds.slice() } };
      });
      return { key: line.key, label: ot(line.key), figures: figures,
        np: figures.every(function (f) { return !isValue(f.region); }) };
    });
  }

  function where(cell) {
    try { return cell && cell.src ? TAP.sources.address(cell.src).text : ''; } catch (e) { return ''; }
  }

  // A clickable figure: the region's opens its details; the average opens where it comes from and how it was combined.
  function figure(f, which, open) {
    var c = f[which];
    return el('button', { type: 'button', class: 'tap-ov-fig tap-pf-glance__fig' + (isValue(c) ? '' : ' is-np'), 'data-part': which,
      title: t('glance.figureTitle', { label: f.label, where: where(c) }), onclick: open },
    TAP.format.cell(c, { unit: f.unit }));
  }

  function row(f, restLabel) {
    return el('tr', { 'data-measure': f.measure, 'data-compare': f.compare.key || null }, [
      el('th', { scope: 'row' }, f.label),
      el('td', null, figure(f, 'region', function () { TAP.layers.openDetails(f.target); })),
      el('td', null, figure(f, 'rest', function () {
        TAP.overviewCards.openSource(restLabel, [{ label: f.label, cell: f.rest, unit: f.unit }]);
      })),
      el('td', { 'data-part': 'compare', class: 'tap-pf-glance__cmp' }, f.compare.text)
    ]);
  }

  // A total with a part not provided says so, as the Overview card does.
  function partial(c) {
    return isValue(c) && c.partial && c.note ? el('p', { class: 'tap-pf-glance__partial' }, ot('partial', { note: c.note })) : null;
  }

  // Draws the four lines into host for one region.
  function drawGlance(host, regionId) {
    var ents = TAP.scope.entities(TAP.profile.cmp(regionId)), name = ents[0].label, restLabel = ents[1].label;
    var box = el('section', { class: 'tap-pf-glance', 'aria-label': t('glance.title') }, [
      el('h2', { class: 'tap-pf-glance__title' }, t('glance.title')),
      el('p', { class: 'tap-pf-glance__hint' }, t('glance.hint'))
    ]);
    var grid = el('div', { class: 'tap-pf-glance__grid' });
    glance(regionId).forEach(function (line) {
      grid.appendChild(el('div', { class: 'tap-pf-glance__line', 'data-line': line.key }, [
        el('h3', { class: 'tap-pf-glance__label' }, line.label),
        el('table', { class: 'tap-pf-glance__table' }, [
          el('thead', null, el('tr', null, [el('th', { scope: 'col' }, ''), el('th', { scope: 'col' }, name),
            el('th', { scope: 'col' }, restLabel), el('th', { scope: 'col' }, t('glance.against'))])),
          el('tbody', null, line.figures.map(function (f) { return row(f, restLabel); }))
        ]),
        partial(line.figures[0].region)
      ]));
    });
    box.appendChild(grid);
    host.appendChild(box);
    return box;
  }

  function notYet(fn) { return function () { throw new Error('Not built yet (#' + 217 + '): TAP.profileParts.' + fn); }; }

  TAP.profileParts = { glance: glance, compare: compare, drawGlance: drawGlance, insights: notYet('insights'), words: notYet('words') };
})(window.TAP);
