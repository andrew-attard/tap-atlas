/*
 * File: js/views/overview-cards.js
 * Purpose: One card per region (or combined figure) summarising its plan in four lines (US-1.5.1), and the
 *          clickable figure that shows where a value comes from, shared with the headline.
 * Provides: TAP.overviewCards (render, layout, columns, figure, openSource, sourceRow)
 * Depends on: js/engine/measures.js, js/engine/scope.js, js/engine/aggregate.js (describe), js/core/dom.js,
 *             js/core/format.js, js/core/sources.js, js/ui/layers.js, js/core/store.js, js/theme.js,
 *             content/text-overview.js
 * Used by: js/views/overview.js
 */
(function (TAP) {
  'use strict';

  var MIN_W = 140, MAX_W = 320, GAP = 8;   // px: narrowest readable card, widest useful card, gap between cards
  var SEGS = ['strategic', 'growth', 'core', 'scaled'];
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('overview.' + key, vars); };

  /* ---------- layout: one row if the cards fit, else two (or more) even rows ---------- */

  function columns(n, width) {
    if (!(n > 0)) return 1;
    if (!(width > 0)) return n;
    for (var rows = 1; rows <= n; rows++) {
      var c = Math.ceil(n / rows);
      if (c * MIN_W + (c - 1) * GAP <= width) return c;
    }
    return 1;
  }

  function layout(host) {
    var grid = host && host.querySelector('.tap-ov-cards__grid');
    if (!grid) return;
    grid.style.gridTemplateColumns = 'repeat(' + columns(grid.children.length, grid.clientWidth) + ', minmax(0, ' + MAX_W + 'px))';
  }

  /* ---------- figures and their sources ---------- */

  function address(cell) {
    try { return cell && cell.src ? TAP.sources.address(cell.src) : null; } catch (e) { return null; }
  }
  function fmt(cell, unit, exact) { return TAP.format.cell(cell, { unit: unit, exact: exact }); }
  function kindText(cell) { return cell && cell.kind ? TAP.format.kind(cell.kind).text : ''; }

  // One line of the source panel: label, exact value, kind and file › sheet › cell; for a combined figure,
  // how it was combined and which regions it covers.
  function sourceRow(r) {
    var c = r.cell || {}, a = address(c), src = [kindText(c), a && a.text].filter(Boolean).join(' · ');
    var out = [
      el('span', { class: 'tap-details__label' }, r.label),
      el('span', { class: 'tap-details__value' }, r.text != null && !r.cell ? r.text : fmt(c, r.unit, true)),
      src ? el('span', { class: 'tap-details__src' }, src) : null
    ];
    if (a && a.combined) {
      out.push(el('span', { class: 'tap-details__src' }, t('source.combinedHow') + ': ' + TAP.agg.describe(c)));
      if (a.regions.length) out.push(el('span', { class: 'tap-details__src' }, t('source.regions') + ': ' + TAP.format.list(a.regions)));
    }
    if (c.partial && c.note) out.push(el('span', { class: 'tap-details__src' }, t('source.note') + ': ' + c.note));
    return el('div', { class: 'tap-details__row' }, out);
  }

  function openSource(title, rows) {
    TAP.layers.open('overview-source', {
      title: title || t('source.title'),
      render: function (body) { rows.forEach(function (r) { body.appendChild(sourceRow(r)); }); }
    });
  }

  // A figure: a button showing the value, naming its source in the title and opening the source panel.
  // spec: {measure, cell, unit, label, text?, rows?}; rows are the lines the panel lists (default: this figure).
  function figure(spec, cls) {
    var c = spec.cell || {}, a = address(c);
    var title = t('cards.figureTitle', { label: spec.label, value: fmt(c, spec.unit, true), kind: kindText(c),
      where: a ? a.text : '' });
    return el('button', {
      type: 'button', class: 'tap-ov-fig' + (c.state === 'notProvided' ? ' is-np' : '') + (cls ? ' ' + cls : ''),
      'data-measure': spec.measure || null, 'data-state': c.state || null, 'data-v': c.state === 'value' ? String(c.v) : '',
      title: title,
      onclick: function (e) { e.stopPropagation(); openSource(spec.label, spec.rows || [spec]); }
    }, spec.text != null ? spec.text : fmt(c, spec.unit));
  }

  /* ---------- cards ---------- */

  function label(id) { var m = TAP.measures.meta(id); return m ? m.label : id; }
  function short(id) { var m = TAP.measures.meta(id); return m ? m.short : id; }
  function isNp(c) { return !c || c.state !== 'value'; }

  function cellsFor(ent) {
    var ids = ['amb.arr', 'nb.arr', 'cg.arr', 'amb.services', 'focus.tier1', 'focus.tier2', 'nb.targetAccounts']
      .concat(SEGS.map(function (s) { return 'cg.segment.' + s; }));
    var out = {};
    ids.forEach(function (id) { out[id] = TAP.measures.combined(id, ent, {}); });
    return out;
  }

  function line(cls, title, body) {
    return el('div', { class: 'tap-ov-card__line ' + cls }, [el('span', { class: 'tap-ov-card__label' }, title)].concat(body));
  }
  // "€12.4M New business": the figure first, so figures line up down the card and the words wrap after them.
  function row(text, fig, cls) {
    return el('div', { class: 'tap-ov-card__row' + (cls ? ' ' + cls : '') }, [fig, ' ', el('span', null, text)]);
  }
  // "3 Tier 1", "4 Strategic": the number first, then the word, wrapping as the card narrows.
  function chips(cls, specs, word) {
    if (specs.every(function (s) { return isNp(s.cell); })) {
      var all = { measure: specs[0].measure, cell: specs[0].cell, unit: 'count', label: specs[0].label, rows: specs };
      return el('div', { class: 'tap-ov-card__chips ' + cls }, figure(all));
    }
    return el('div', { class: 'tap-ov-card__chips ' + cls }, specs.map(function (s) {
      return el('span', { class: 'tap-ov-card__chip' }, [figure(s), ' ', word(s)]);
    }));
  }

  // Two-part bar for the ambition split. Words in the rows below name both parts, so colour is never alone.
  function split(c, ent) {
    var nb = c['nb.arr'], cg = c['cg.arr'], th = window.TAP_THEME;
    if (isNp(nb) || isNp(cg) || !(nb.v + cg.v > 0)) return null;
    var dark = ent.kind === 'combined', w = Math.max(0, Math.min(100, nb.v / (nb.v + cg.v) * 100));
    var a = el('span', { class: 'tap-ov-card__split-nb' }), b = el('span', { class: 'tap-ov-card__split-cg' });
    a.style.width = w + '%';
    a.style.backgroundColor = dark ? th.paper : ent.color;
    b.style.width = (100 - w) + '%';
    b.style.backgroundColor = dark ? th.rule : th.shade(ent.color, 1);
    return el('span', { class: 'tap-ov-card__split', 'aria-hidden': 'true' }, [a, b]);
  }

  function kicker(ent) {
    if (ent.role === 'focus') return t('cards.kickerFocus');
    if (ent.role === 'second') return t('cards.kickerSecond');
    if (ent.kind === 'combined') return t('cards.kickerCombined');
    return '';
  }

  function buildCard(ent, withKicker) {
    var c = cellsFor(ent), combined = ent.kind === 'combined';
    var spec = function (id, unit) { return { measure: id, cell: c[id], unit: unit, label: label(id) }; };
    var amb = spec('amb.arr', 'money');
    amb.rows = [amb, spec('nb.arr', 'money'), spec('cg.arr', 'money')];
    var all = amb.rows.concat([spec('amb.services', 'money'), spec('focus.tier1', 'count'), spec('focus.tier2', 'count'),
      spec('nb.targetAccounts', 'count')], SEGS.map(function (s) { return spec('cg.segment.' + s, 'count'); }));
    var k = kicker(ent), partial = c['amb.arr'].state === 'value' && c['amb.arr'].partial;
    var role = combined ? 'is-combined' : 'is-' + ent.role;
    var bar = el('span', { class: 'tap-ov-card__bar' });
    if (!combined) bar.style.backgroundColor = ent.color;

    var node = el('div', { class: 'tap-ov-card ' + role, 'data-entity': ent.id }, [
      bar,
      el('div', { class: 'tap-ov-card__head' }, [
        k || withKicker ? el('span', { class: 'tap-ov-card__kicker' }, k) : null,
        el('button', { type: 'button', class: 'tap-ov-card__open tap-ov-card__name',
          'aria-label': t(combined ? 'cards.openSources' : 'cards.openDetails', { name: ent.label }) }, ent.label),
        combined ? el('p', { class: 'tap-ov-card__how' }, TAP.agg.describe(c['amb.arr'])) : null
      ]),
      line('tap-ov-card__ambition', t('cards.ambition'), [
        figure(amb, 'tap-ov-fig--big'),
        partial ? el('p', { class: 'tap-ov-card__partial' }, t('cards.partial', { note: c['amb.arr'].note })) : null,
        split(c, ent),
        el('div', { class: 'tap-ov-card__rows' }, [
          row(t('cards.nb'), figure(spec('nb.arr', 'money'))),
          row(t('cards.cg'), figure(spec('cg.arr', 'money'))),
          row(t('cards.services'), figure(spec('amb.services', 'money')), 'tap-ov-card__row--minor')
        ])
      ]),
      line('tap-ov-card__focus', t('cards.focus'), chips('tap-ov-card__tiers', [spec('focus.tier1', 'count'), spec('focus.tier2', 'count')],
        function (s) { return t('cards.tier', { n: s.measure.slice(-1) }); })),
      line('tap-ov-card__pool', t('cards.pool'), el('div', { class: 'tap-ov-card__chips' },
        el('span', { class: 'tap-ov-card__chip' }, [figure(spec('nb.targetAccounts', 'count')), ' ', t('cards.targetAccounts')]))),
      line('tap-ov-card__customers', t('cards.customers'), chips('tap-ov-card__segments',
        SEGS.map(function (s) { return spec('cg.segment.' + s, 'count'); }), function (s) { return short(s.measure); }))
    ]);
    // The whole card opens the region's details; a combined card lists where its figures come from.
    node.addEventListener('click', function () {
      if (combined) openSource(ent.label, all);
      else TAP.layers.openDetails({ regionIds: [ent.regionIds[0]] });
    });
    return node;
  }

  function render(host) {
    var ents = TAP.scope.entities(TAP.store.get().cmp);
    var withKicker = ents.some(function (e) { return e.role !== 'region'; });
    TAP.dom.clear(host);
    host.appendChild(el('div', { class: 'tap-ov-cards__grid' }, ents.map(function (e) { return buildCard(e, withKicker); })));
    layout(host);
    return host;
  }

  TAP.overviewCards = { render: render, layout: layout, columns: columns, figure: figure, openSource: openSource,
    sourceRow: sourceRow };
})(window.TAP);
