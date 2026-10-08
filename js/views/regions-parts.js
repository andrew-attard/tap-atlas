/*
 * File: js/views/regions-parts.js
 * Purpose: The parts of a region profile besides its reports: the plan at a glance against the rest (the four card
 *          lines of US-1.5.1, US-2.4.2, and the strategic plan and revenue lines of US-4.6.3), the region's Top
 *          insights (D128) and the rest of its insights, and everything its leader wrote (US-2.4.4).
 * Provides: TAP.profileParts (glance, compare, drawGlance, insights, top, more, drawTop, drawInsights, words, drawWords)
 * Depends on: js/core/dom.js, js/core/content.js, js/core/format.js, js/core/sources.js, js/engine/measures.js,
 *             js/engine/scope.js, js/ui/source-tip.js, js/views/overview-cards.js (popover), js/views/regions.js
 *             (TAP.profile.cmp), js/views/overview.js (TAP.overviewInsights), js/insights/engine.js, js/core/data.js,
 *             js/core/store.js (all at call time)
 * Used by: js/views/regions.js
 * Owner: PROFILE stream (#215, #217); the full template's lines PAGES4 (#459)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('profile.' + key, vars); }
  function ot(key, vars) { return TAP.content.text('overview.cards.' + key, vars); }
  function meta(id) { return TAP.measures.meta(id) || { label: id, short: id }; }
  function pt(key, vars) { return t('glance.p4.' + key, vars); }

  /* ---------- the plan at a glance (US-2.4.2) ---------- */

  // The four lines of the Overview cards, with the figures each shows (label: the words the cards use).
  // A figure is [measure id, unit, label, measure context (optional)].
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
  // The full template's lines (US-4.6.3): three-year figures, and revenue by plan year. Each shows only when some
  // region in the file has that part (probe), so a file without it reads exactly as before (D57).
  var P4_LINES = [
    { key: 'strategic', probe: 'sp.oi', figures: [['sp.plan', 'money', function () { return pt('plan'); }],
      ['sp.oi', 'money', function () { return pt('strategicPlan'); }], ['sp.variance', 'money', function () { return pt('variance'); }]] },
    { key: 'revenue', probe: 'rv.all.oi', figures: [1, 2, 3].map(function (y) {
      return ['rv.all.oi', 'money', function () { return pt('year', { n: y }); }, { year: y }];
    }) }
  ];
  function lines() {
    var has = TAP.measures.available;
    return LINES.concat(P4_LINES.filter(function (l) { return typeof has === 'function' && has(l.probe); }));
  }
  function lineLabel(line) { return line.probe ? pt(line.key + 'Line') : ot(line.key); }

  function isValue(c) { return !!c && c.state === 'value' && typeof c.v === 'number'; }

  // Where the region's figure sits against the average of the rest, in neutral words (D20): never good or bad.
  function compare(region, rest) {
    if (!isValue(region) || !isValue(rest)) return { key: null, text: '' };
    var a = region.v, b = rest.v, tol = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    var key = Math.abs(a - b) <= tol ? 'same' : a > b ? 'above' : 'below';
    return { key: key, text: t('glance.' + key) };
  }

  // [{key, label, np, figures: [{measure, label, unit, region, rest, compare, target, restTarget}]}] for one region.
  // With no other region in the data there is no rest: rest and restTarget are null.
  function glance(regionId) {
    var ents = TAP.scope.entities(TAP.profile.cmp(regionId)), me = ents[0], rest = ents[1] || null;
    return lines().map(function (line) {
      var figures = line.figures.map(function (f) {
        var ctx = f[3] || {}, region = TAP.measures.combined(f[0], me, ctx), avg = rest ? TAP.measures.combined(f[0], rest, ctx) : null;
        return { measure: f[0], year: ctx.year || null, unit: f[1], label: f[2](f[0]), region: region, rest: avg, compare: compare(region, avg),
          target: { regionIds: [regionId] }, restTarget: rest ? { regionIds: rest.regionIds.slice() } : null };
      });
      return { key: line.key, label: lineLabel(line), p4: !!line.probe, figures: figures,
        np: figures.every(function (f) { return !isValue(f.region); }) };
    });
  }

  function where(cell) {
    try { return cell && cell.src ? TAP.sources.address(cell.src).text : ''; } catch (e) { return ''; }
  }

  // A clickable figure, the region's or the average: a popover beside it says where it comes from, and for the
  // average how it was combined (D129).
  function figure(f, which) {
    var c = f[which];
    return el('button', { type: 'button', class: 'tap-ov-fig tap-pf-glance__fig' + (isValue(c) ? '' : ' is-np'), 'data-part': which,
      title: t('glance.figureTitle', { label: f.label }),
      onclick: function (e) { TAP.overviewCards.popover(e.currentTarget, { label: f.label, cell: c, unit: f.unit }); } },
    TAP.format.cell(c, { unit: f.unit }));
  }

  // restLabel null: no other region, so the region column only.
  function row(f, restLabel) {
    return el('tr', { 'data-measure': f.measure, 'data-year': f.year ? String(f.year) : null, 'data-compare': f.compare.key || null }, [
      el('th', { scope: 'row' }, f.label),
      el('td', null, figure(f, 'region'))
    ].concat(restLabel == null ? [] : [
      el('td', null, figure(f, 'rest')),
      el('td', { 'data-part': 'compare', class: 'tap-pf-glance__cmp' }, f.compare.text)
    ]));
  }

  // A total with a part not provided says so, as the Overview card does.
  function partial(c) {
    return isValue(c) && c.partial && c.note ? el('p', { class: 'tap-pf-glance__partial' }, ot('partial', { note: c.note })) : null;
  }

  // Draws the lines into host for one region.
  function drawGlance(host, regionId) {
    var ents = TAP.scope.entities(TAP.profile.cmp(regionId)), name = ents[0].label, restLabel = ents[1] ? ents[1].label : null;
    var box = el('section', { class: 'tap-pf-glance', 'aria-label': t('glance.title') }, [
      el('h2', { class: 'tap-pf-glance__title' }, t('glance.title')),
      el('p', { class: 'tap-pf-glance__hint' }, t(restLabel == null ? 'glance.hintAlone' : 'glance.hint')),
      restLabel == null ? el('p', { class: 'tap-pf-glance__alone' }, t('glance.alone')) : null
    ]);
    var grid = el('div', { class: 'tap-pf-glance__grid' });
    glance(regionId).forEach(function (line) {
      grid.appendChild(el('div', { class: 'tap-pf-glance__line', 'data-line': line.key }, [
        el('h3', { class: 'tap-pf-glance__label' }, line.label),
        el('table', { class: 'tap-pf-glance__table' }, [
          el('thead', null, el('tr', null, [el('th', { scope: 'col' }, ''), el('th', { scope: 'col' }, name)].concat(restLabel == null ? []
            : [el('th', { scope: 'col' }, restLabel), el('th', { scope: 'col' }, t('glance.against'))]))),
          el('tbody', null, line.figures.map(function (f) { return row(f, restLabel); }))
        ]),
        // The full template's lines name a part left blank in any of their figures; the card lines in their total
        partial(line.p4 ? (line.figures.filter(function (f) { return isValue(f.region) && f.region.partial; })[0] || {}).region : line.figures[0].region)
      ]));
    });
    box.appendChild(grid);
    host.appendChild(box);
    return box;
  }

  /* ---------- this region's insights (US-2.4.4) ---------- */

  // Every insight naming the region, hidden and context ones left out (D111), most significant first.
  function insights(regionId) {
    var I = TAP.insights;
    if (!I || I.__stub) return [];
    return (I.ranked(TAP.profile.cmp(regionId), { regionId: regionId }) || []).slice().sort(function (x, y) {
      return y.significance - x.significance || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
    });
  }

  /* ---------- the region's Top insights (D128) ---------- */

  var TOP = 3;
  // The three most significant insights about the region, as the Overview card's line reads them (D130).
  function top(regionId) {
    var I = TAP.insights;
    return I && !I.__stub && I.forRegion ? I.forRegion(regionId).slice(0, TOP) : [];
  }
  // Every other insight naming the region, for the list beside the leader's words.
  function more(regionId) {
    var ids = top(regionId).map(function (x) { return x.id; });
    return insights(regionId).filter(function (x) { return ids.indexOf(x.id) < 0; });
  }

  // The block in the Overview's style (D119), or null when no insight qualifies (no title, no empty text).
  function drawTop(regionId) {
    var list = top(regionId), name = TAP.content.regionName(TAP.data.region(regionId)), seen = {};
    if (!list.length || !TAP.overviewInsights) return null;
    return el('section', { class: 'tap-pf-top', 'data-part': 'top-insights', 'aria-label': t('top.title', { name: name }) }, [
      el('div', { class: 'tap-ov__sechead' }, el('h2', null, t('top.title', { name: name }))),
      el('p', { class: 'tap-ov__insights-intro' }, t('top.intro')),
      el('div', { class: 'tap-ov-insights' }, list.map(function (x) { return TAP.overviewInsights.item(x, seen); }))
    ]);
  }

  // The rest of the region's insights; with no Top insights block above, every one, under the list's own title.
  function drawInsights(host, regionId) {
    var shown = top(regionId).length > 0, list = shown ? more(regionId) : insights(regionId);
    var name = TAP.content.regionName(TAP.data.region(regionId)), title = t(shown ? 'insights.more' : 'insights.title', { name: name });
    var intro = shown ? (list.length ? t(list.length === 1 ? 'insights.introMoreOne' : 'insights.introMore', { n: list.length }) : t('insights.noneMore', { name: name }))
      : (list.length ? t(list.length === 1 ? 'insights.introOne' : 'insights.intro', { n: list.length }) : t('insights.none', { name: name }));
    var box = el('section', { class: 'tap-pf-insights tap-pf-card', 'aria-label': title }, [
      el('h2', { class: 'tap-pf-card__title' }, title),
      el('p', { class: 'tap-pf-card__intro' }, intro)
    ]);
    var ol = el('ol', { class: 'tap-pf-card__list' });
    list.forEach(function (x) {
      ol.appendChild(el('li', { class: 'tap-pf-insight', 'data-insight': x.id }, [
        el('span', { class: 'tap-pf-insight__label' }, x.label || t('insights.label')),
        el('p', { class: 'tap-pf-insight__text' }, x.sentence),
        x.why ? el('p', { class: 'tap-pf-insight__why' }, x.why) : null,
        el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-pf-insight__showme', 'data-action': 'showme',
          onclick: function () { TAP.bus.emit('showme', { insightId: x.id, target: x.highlight }); } }, t('insights.showMe'))
      ]));
    });
    if (list.length) box.appendChild(ol);
    host.appendChild(box);
    return box;
  }

  /* ---------- everything the region's leader wrote (US-2.4.4) ---------- */

  function blank(v) { return v == null || String(v).trim() === ''; }

  function entry(kind, industryId, text, src, extra) {
    var w = where({ src: src });
    return Object.assign({ kind: kind, industryId: industryId, text: String(text).trim(), src: src, where: w }, extra || {});
  }

  // [{industryId, name, entries: [{kind: 'commentary'|'successFactors', text, src, where, subVertical, market}]}],
  // in the industry order of the data. Blank cells are simply not listed.
  function words(regionId) {
    var reg = TAP.data.region(regionId) || {}, by = {};
    function add(e) { (by[e.industryId] = by[e.industryId] || []).push(e); }
    (reg.marketCoverage || []).forEach(function (r) {
      if (blank(r.commentary)) return;
      add(entry('commentary', r.industryId, r.commentary,
        { regionId: regionId, section: 'marketCoverage', field: 'commentary', row: r.sourceRow, year: null, cell: null, kind: 'IN' }));
    });
    (reg.newBusiness || []).forEach(function (r) {
      if (blank(r.successFactors)) return;
      add(entry('successFactors', r.industryId, r.successFactors,
        { regionId: regionId, section: 'newBusiness', field: 'successFactors', row: r.sourceRow, year: null, cell: null, kind: 'IN' },
        { subVertical: r.subVertical || null, market: r.market || null }));
    });
    var order = TAP.data.industries({}).map(function (d) { return d.id; });
    Object.keys(by).forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    return order.filter(function (id) { return by[id]; }).map(function (id) {
      var ind = TAP.data.industry(id);
      return { industryId: id, name: ind ? ind.name : id, entries: by[id] };
    });
  }

  function drawWords(host, regionId) {
    var groups = words(regionId), name = TAP.content.regionName(TAP.data.region(regionId));
    if (!groups.length) return null;   // nothing written: no panel, and no "no comment" label
    var box = el('section', { class: 'tap-pf-words tap-pf-card', 'aria-label': t('words.title', { name: name }) }, [
      el('h2', { class: 'tap-pf-card__title' }, t('words.title', { name: name })),
      el('p', { class: 'tap-pf-card__intro' }, t('words.intro'))
    ]);
    var body = el('div', { class: 'tap-pf-card__list', tabindex: '0', 'aria-label': t('words.title', { name: name }) });
    groups.forEach(function (g) {
      body.appendChild(el('section', { class: 'tap-pf-words__group', 'data-industry': g.industryId }, [el('h3', null, g.name)]
        .concat(g.entries.map(function (e) {
          var label = e.kind === 'commentary' ? t('words.commentary') : [t('words.successFactors'), e.subVertical, e.market].filter(Boolean).join(' · ');
          return el('div', { class: 'tap-pf-word', 'data-word': e.kind }, [
            el('div', { class: 'tap-pf-word__head' }, [el('span', { class: 'tap-pf-word__kind' }, label),
              TAP.sourceTip.icon(e.src, 'IN', { where: e.where, label: label })]),
            el('p', { class: 'tap-pf-word__text' }, e.text)
          ]);
        }))));
    });
    box.appendChild(body);
    host.appendChild(box);
    return box;
  }

  TAP.profileParts = { glance: glance, compare: compare, drawGlance: drawGlance, insights: insights, top: top, more: more,
    drawTop: drawTop, drawInsights: drawInsights, words: words, drawWords: drawWords };
})(window.TAP);
