/*
 * File: js/views/overview-cards.js
 * Purpose: One card per region (or combined figure), a quick snapshot of its plan (US-1.5.1, D127): the 3-year
 *          ambition, the split with a swatch and share per part (D117), Services, focus tiers, the new business pool
 *          and customers by segment, and one insight to discuss (D130); and the clickable figure that shows where a value
 *          comes from, shared with the headline.
 * Provides: TAP.overviewCards (render, layout, columns, figure, popover, openSource, sourceRow)
 * Depends on: js/engine/measures.js, js/engine/scope.js, js/engine/aggregate.js (describe), js/core/dom.js,
 *             js/core/format.js, js/core/sources.js, js/ui/layers.js, js/ui/source-tip.js (figure), js/core/store.js, js/theme.js,
 *             content/text-overview.js, js/insights/engine.js (forRegion), js/views/regions.js (TAP.profile.link) and
 *             js/views/overview.js (TAP.overviewInsights), all three at call time
 * Used by: js/views/overview.js; js/views/regions-parts.js (popover, the profile's glance figures)
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

  // One figure in a small popover beside it (D129): its label, exact value, how it was combined, a partial note, and
  // the data icon with the kind and file › sheet › cell. spec: {cell, unit, label, text?, exact?}.
  function popover(anchor, spec) {
    var c = spec.cell || {}, a = address(c), where = TAP.sourceTip.where(c.src), kind = kindText(c);
    var line = function (cls, text) { return el('p', { class: 'tap-figpop__line' + (cls ? ' ' + cls : '') }, text); };
    var body = [line('tap-figpop__value', spec.exact || (spec.text != null && !spec.cell ? spec.text : fmt(c, spec.unit, true)))];
    if (a && a.combined) {
      body.push(line(null, t('source.combinedHow') + ': ' + TAP.agg.describe(c)));
      if (a.regions.length) body.push(line(null, t('source.regions') + ': ' + TAP.format.list(a.regions)));
    }
    if (c.partial && c.note) body.push(line(null, t('source.note') + ': ' + c.note));
    if (kind || where) {
      body.push(el('p', { class: 'tap-figpop__line tap-figpop__src' }, [TAP.icons.svg('data', { size: 18 }),
        el('span', null, [kind, kind && where ? ' · ' : '', where].join(''))]));
    }
    return TAP.sourceTip.figure(anchor, spec.label, body);
  }

  // A figure: a button showing the value, its kind in the title. Selecting it opens a popover beside it (D129); a figure
  // that stands for several (rows) lists them in the source panel. spec: {measure, cell, unit, label, text?, exact?,
  // rows?}: text replaces the formatted value (exact is then the precise value); rows are the lines the panel lists.
  function figure(spec, cls) {
    var c = spec.cell || {};
    var title = t('cards.figureTitle', { label: spec.label, value: spec.exact || fmt(c, spec.unit, true), kind: kindText(c) });
    return el('button', {
      type: 'button', class: 'tap-ov-fig' + (c.state === 'notProvided' ? ' is-np' : '') + (cls ? ' ' + cls : ''),
      'data-measure': spec.measure || null, 'data-state': c.state || null, 'data-v': c.state === 'value' ? String(c.v) : '',
      title: title,
      onclick: function (e) {
        e.stopPropagation();
        if (spec.rows && spec.rows.length > 1) openSource(spec.label, spec.rows);
        else popover(e.currentTarget, spec);
      }
    }, spec.text != null ? spec.text : fmt(c, spec.unit));
  }

  /* ---------- the figures a card needs ---------- */

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

  // A labelled line of the card; part names it, so the cards in a row line it up (subgrid).
  function line(part, title, body) {
    return el('div', { class: 'tap-ov-card__line tap-ov-card__' + part, 'data-part': part },
      [el('span', { class: 'tap-ov-card__label' }, title), ' '].concat(body));
  }
  // "3 Tier 1 · 7 Tier 2", "4 Strategic · 4 Growth": the number first, then the word, wrapping as the card narrows.
  // With none of them provided, one "not provided" figure lists them all.
  function chips(cls, specs, word) {
    if (specs.every(function (s) { return isNp(s.cell); })) {
      var all = { measure: specs[0].measure, cell: specs[0].cell, unit: 'count', label: specs[0].label, rows: specs };
      return el('div', { class: 'tap-ov-card__chips ' + cls }, figure(all));
    }
    var out = [];
    specs.forEach(function (s, i) {
      if (i) out.push(el('span', { class: 'tap-ov-card__sep', 'aria-hidden': 'true' }, ' · '));
      out.push(el('span', { class: 'tap-ov-card__chip' }, [figure(s), ' ', word(s)]));
    });
    return el('div', { class: 'tap-ov-card__chips ' + cls }, out);
  }

  /* ---------- cards ---------- */

  function kicker(ent) {
    if (ent.role === 'focus') return t('cards.kickerFocus');
    if (ent.role === 'second') return t('cards.kickerSecond');
    if (ent.kind === 'combined') return t('cards.kickerCombined');
    return '';
  }

  // The insight's popover: its sentence, the line on why it matters, and Show me, which closes it and goes to the chart.
  function discussPop(anchor, x) {
    var show = el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-figpop__show', onclick: function () {
      TAP.sourceTip.close();
      TAP.overviewInsights.showMe(x);
    } }, t('insights.showMe'));
    return TAP.sourceTip.figure(anchor, x.label || t('cards.toDiscuss'), [
      el('p', { class: 'tap-figpop__line tap-figpop__sentence' }, x.sentence),
      x.why ? el('p', { class: 'tap-figpop__line tap-figpop__why' }, x.why) : null,
      el('p', { class: 'tap-figpop__line tap-figpop__actions' }, show)
    ]);
  }

  // "To discuss: 78 new customers needed, 3× peers" (D130): the region's most significant insight, the one that leads
  // its profile's Top insights (TAP.insights.forRegion), in its rule's short form. The only region finding on the
  // Overview. A combined card, or a region with none, keeps an empty slot so the cards in a row still line up.
  function discuss(ent) {
    var I = TAP.insights, x = null;
    try { x = ent.kind !== 'combined' && I && I.forRegion ? I.forRegion(ent.regionIds[0])[0] || null : null; } catch (e) { x = null; }
    if (!x || !TAP.overviewInsights) return el('span', { class: 'tap-ov-card__nodiscuss', 'data-part': 'discuss' });
    return el('button', { type: 'button', class: 'tap-ov-card__todiscuss', 'data-part': 'discuss', 'data-discuss': x.id,
      onclick: function (e) { e.stopPropagation(); discussPop(e.currentTarget, x); } },
    [el('span', { class: 'tap-ov-card__label' }, t('cards.toDiscuss')), ' ', el('span', { class: 'tap-ov-card__short' }, x.short || t('cards.oneFinding'))]);
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
    var all = amb.rows.concat([spec('amb.services', 'money'), spec('focus.tier1', 'count'), spec('focus.tier2', 'count'),
      spec('nb.targetAccounts', 'count')], SEGS.map(function (s) { return spec('cg.segment.' + s, 'count'); }));
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
        partial ? el('p', { class: 'tap-ov-card__partial' }, t('cards.partial', { note: c['amb.arr'].note })) : null
      ]),
      mix(c, ent, spec),
      line('focus', t('cards.focus'), chips('tap-ov-card__tiers', [spec('focus.tier1', 'count'), spec('focus.tier2', 'count')],
        function (s) { return t('cards.tier', { n: s.measure.slice(-1) }); })),
      line('pool', t('cards.pool'), el('div', { class: 'tap-ov-card__chips' },
        el('span', { class: 'tap-ov-card__chip' }, [figure(spec('nb.targetAccounts', 'count')), ' ', t('cards.targetAccounts')]))),
      line('customers', t('cards.customers'), chips('tap-ov-card__segments',
        SEGS.map(function (s) { return spec('cg.segment.' + s, 'count'); }), function (s) { return short(s.measure); })),
      discuss(ent),
      profileLink(ent)
    ]);
    // The whole card opens the region's details; a combined card lists where its figures come from.
    node.addEventListener('click', function () {
      if (combined) openSource(ent.label, all);
      else TAP.layers.openDetails({ regionIds: [ent.regionIds[0]] });
    });
    return node;
  }

  // cmp: the comparison to draw (the Overview passes all regions, D118); the shared one when left out.
  function render(host, cmp) {
    var ents = TAP.scope.entities(cmp || TAP.store.get().cmp);
    var withKicker = ents.some(function (e) { return e.role !== 'region'; });
    TAP.dom.clear(host);
    host.appendChild(el('div', { class: 'tap-ov-cards__grid' }, ents.map(function (e) { return buildCard(e, withKicker); })));
    layout(host);
    return host;
  }

  TAP.overviewCards = { render: render, layout: layout, columns: columns, figure: figure, popover: popover, openSource: openSource,
    sourceRow: sourceRow };
})(window.TAP);
