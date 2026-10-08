/*
 * File: js/views/overview-cards.js
 * Purpose: One card per region (or combined figure): its 3-year ambition against the strategic plan, the split
 *          with a swatch and share per part, and "Will it land?" (US-1.5.1, D117); and the clickable figure that
 *          shows where a value comes from, shared with the headline.
 * Provides: TAP.overviewCards (render, layout, columns, figure, openSource, sourceRow)
 * Depends on: js/engine/measures.js, js/engine/scope.js, js/engine/aggregate.js (describe), js/core/dom.js,
 *             js/core/format.js, js/core/sources.js, js/ui/layers.js, js/core/store.js, js/theme.js,
 *             content/text-overview.js, js/views/overview-land.js (TAP.overviewLand, at call time),
 *             js/views/regions.js (TAP.profile.link, at call time)
 * Used by: js/views/overview.js
 */
(function (TAP) {
  'use strict';

  var MIN_W = 140, MAX_W = 320, GAP = 8;   // px: narrowest readable card, widest useful card, gap between cards
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

  // One line of the source panel: label, exact value and the data icon with its kind and file › sheet › cell (D100);
  // for a combined figure, which has no file, how it was combined and which regions it covers.
  function sourceRow(r) {
    var c = r.cell || {}, a = address(c), tip = TAP.sourceTip.icon(c.src, c.kind, { label: r.label });
    var src = a && a.combined ? [kindText(c), a.text].filter(Boolean).join(' · ') : '';
    var out = [
      el('span', { class: 'tap-details__label' }, r.label),
      el('span', { class: 'tap-details__value' }, r.text != null && !r.cell ? r.text : fmt(c, r.unit, true)),
      tip,
      src ? el('span', { class: 'tap-details__src' }, src) : null
    ];
    if (a && a.combined) {
      out.push(el('span', { class: 'tap-details__src' }, t('source.combinedHow') + ': ' + TAP.agg.describe(c)));
      if (a.regions.length) out.push(el('span', { class: 'tap-details__src' }, t('source.regions') + ': ' + TAP.format.list(a.regions)));
    }
    if (c.partial && c.note) out.push(el('span', { class: 'tap-details__src' }, t('source.note') + ': ' + c.note));
    return el('div', { class: 'tap-details__row' + (tip ? ' tap-details__row--tip' : '') }, out);
  }

  function openSource(title, rows) {
    TAP.layers.open('overview-source', {
      title: title || t('source.title'),
      render: function (body) { rows.forEach(function (r) { body.appendChild(sourceRow(r)); }); }
    });
  }

  // A figure: a button showing the value, its kind in the title, opening the source panel (the address is behind
  // the panel's data icon, D100). spec: {measure, cell, unit, label, text?, exact?, rows?}: text replaces the formatted
  // value (exact is then the title's precise value); rows are the lines the panel lists.
  function figure(spec, cls) {
    var c = spec.cell || {};
    var title = t('cards.figureTitle', { label: spec.label, value: spec.exact || fmt(c, spec.unit, true), kind: kindText(c) });
    return el('button', {
      type: 'button', class: 'tap-ov-fig' + (c.state === 'notProvided' ? ' is-np' : '') + (cls ? ' ' + cls : ''),
      'data-measure': spec.measure || null, 'data-state': c.state || null, 'data-v': c.state === 'value' ? String(c.v) : '',
      title: title,
      onclick: function (e) { e.stopPropagation(); openSource(spec.label, spec.rows || [spec]); }
    }, spec.text != null ? spec.text : fmt(c, spec.unit));
  }

  /* ---------- the figures a card needs ---------- */

  function label(id) { var m = TAP.measures.meta(id); return m ? m.label : id; }
  function isNp(c) { return !c || c.state !== 'value'; }
  function cellsFor(ent) {
    var out = {};
    ['amb.arr', 'nb.arr', 'cg.arr', 'amb.services'].forEach(function (id) { out[id] = TAP.measures.combined(id, ent, {}); });
    return TAP.overviewLand.cells(ent, out);
  }

  /* ---------- the card's parts ---------- */

  // The split's two colours: the region's colour and its lighter shade; on a dark combined card, paper and grey.
  function colours(ent) {
    var th = window.TAP_THEME, dark = ent.kind === 'combined';
    return { nb: dark ? th.paper : ent.color, cg: dark ? th.rule : th.shade(ent.color, 1) };
  }

  // Two-part bar for the ambition split. The swatched lines below name both parts, so colour is never alone.
  function split(w, col) {
    var a = el('span', { class: 'tap-ov-card__split-nb' }), b = el('span', { class: 'tap-ov-card__split-cg' });
    a.style.width = w + '%';
    a.style.backgroundColor = col.nb;
    b.style.width = (100 - w) + '%';
    b.style.backgroundColor = col.cg;
    return el('span', { class: 'tap-ov-card__split', 'aria-hidden': 'true' }, [a, b]);
  }

  // "■ New business €11.2M 65%": the swatch matches its bar segment; the words name the part.
  function part(words, fig, colour, share, cls) {
    var sw = null;
    if (colour) { sw = el('span', { class: 'tap-ov-card__swatch', 'aria-hidden': 'true' }); sw.style.backgroundColor = colour; }
    return el('div', { class: 'tap-ov-card__row ' + (cls || 'tap-ov-card__part') }, [
      el('span', { class: 'tap-ov-card__partname' }, [sw, words]), ' ',
      el('span', { class: 'tap-ov-card__partvalue' }, [fig, share ? ' ' : null,
        share ? el('span', { class: 'tap-ov-card__share' }, share) : null])
    ]);
  }

  function mix(c, ent, spec) {
    var nb = c['nb.arr'], cg = c['cg.arr'], col = colours(ent), whole = !isNp(nb) && !isNp(cg) && nb.v + cg.v > 0;
    // Whole percentages that add up to 100: customer growth takes what new business leaves
    var w = whole ? Math.max(0, Math.min(100, Math.round(nb.v / (nb.v + cg.v) * 100))) : null;
    return el('div', { class: 'tap-ov-card__mix', 'data-part': 'mix' }, [
      whole ? split(nb.v / (nb.v + cg.v) * 100, col) : null,
      part(t('cards.nb'), figure(spec('nb.arr', 'money')), whole && col.nb, whole && TAP.format.pct(w / 100)),
      part(t('cards.cg'), figure(spec('cg.arr', 'money')), whole && col.cg, whole && TAP.format.pct((100 - w) / 100)),
      part(t('cards.services'), figure(spec('amb.services', 'money')), null, null, 'tap-ov-card__row--minor')
    ]);
  }

  /* ---------- cards ---------- */

  function kicker(ent) {
    if (ent.role === 'focus') return t('cards.kickerFocus');
    if (ent.role === 'second') return t('cards.kickerSecond');
    if (ent.kind === 'combined') return t('cards.kickerCombined');
    return '';
  }

  // "Open profile" for a region's card (US-2.4.1, PROFILE stream): the link and its words come from the Regions view.
  // A combined card keeps an empty slot, so its parts line up with the region cards beside it.
  function profileLink(ent) {
    var link = ent.kind !== 'combined' && TAP.profile && TAP.profile.link ? TAP.profile.link(ent.regionIds[0], {
      class: 'tap-ov-card__profile', 'data-action': 'open-profile',
      'aria-label': TAP.content.text('profile.openProfileFor', { name: ent.label }) }, TAP.content.text('profile.openProfile')) : null;
    var node = link || el('span', { class: 'tap-ov-card__noprofile' });
    node.setAttribute('data-part', 'profile');
    return node;
  }

  function buildCard(ent, withKicker) {
    var c = cellsFor(ent), combined = ent.kind === 'combined';
    var spec = function (id, unit) { return { measure: id, cell: c[id], unit: unit, label: label(id) }; };
    var amb = spec('amb.arr', 'money');
    amb.rows = [amb, spec('nb.arr', 'money'), spec('cg.arr', 'money')];
    var sp = TAP.overviewLand.available() ? TAP.overviewLand.SP : [];
    var all = amb.rows.concat([spec('amb.services', 'money'), spec('nb.wins', 'count'), spec('cg.top3Share', 'pct')],
      sp.map(function (id) { return spec(id, id === 'sp.variancePct' ? 'pct' : 'money'); }));
    var k = kicker(ent), partial = c['amb.arr'].state === 'value' && c['amb.arr'].partial;
    var bar = el('span', { class: 'tap-ov-card__bar', 'data-part': 'bar' });
    if (!combined) bar.style.backgroundColor = ent.color;

    var node = el('div', { class: 'tap-ov-card ' + (combined ? 'is-combined' : 'is-' + ent.role), 'data-entity': ent.id }, [
      bar,
      el('div', { class: 'tap-ov-card__head', 'data-part': 'head' }, [
        k || withKicker ? el('span', { class: 'tap-ov-card__kicker' }, k) : null,
        el('button', { type: 'button', class: 'tap-ov-card__open tap-ov-card__name',
          'aria-label': t(combined ? 'cards.openSources' : 'cards.openDetails', { name: ent.label }) }, ent.label),
        combined ? el('p', { class: 'tap-ov-card__how' }, TAP.agg.describe(c['amb.arr'])) : null
      ]),
      el('div', { class: 'tap-ov-card__line tap-ov-card__ambition', 'data-part': 'ambition' }, [
        el('span', { class: 'tap-ov-card__label' }, t('cards.ambition')),
        figure(amb, 'tap-ov-fig--big'),
        partial ? el('p', { class: 'tap-ov-card__partial' }, t('cards.partial', { note: c['amb.arr'].note })) : null,
        TAP.overviewLand.strategic(c, ent, spec)
      ]),
      mix(c, ent, spec)
    ].concat(TAP.overviewLand.checks(c, ent, spec), [profileLink(ent)]));
    // The whole card opens the region's details; a combined card lists where its figures come from. A glossary term
    // on the card opens its definition instead.
    node.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.tap-term')) return;
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
