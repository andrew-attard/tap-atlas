/*
 * File: js/views/overview.js
 * Purpose: The Overview view: the headline sentence and the top insights for the organization as a whole (US-1.5.3,
 *          D119), the region cards (US-1.5.1) and the ambition chart (US-1.5.2), always for every region: the
 *          comparison the other views use is left as it is and ignored here (D118). Nothing about one or two regions
 *          shows here: the block and the chart's list are broad only.
 * Provides: view 'overview' (registered with TAP.views)
 * Depends on: js/engine/registry.js, js/ui/view-head.js (tip), js/core/dom.js, js/core/icons.js, js/core/store.js, js/core/data.js,
 *             js/core/format.js, js/engine/measures.js, js/engine/scope.js, js/ui/layers.js,
 *             js/views/overview-cards.js, js/insights/engine.js, js/panel/panel.js, content/text-overview.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('overview.' + key, vars); };
  var H = function (key, vars) { return t('headline.' + key, vars); };

  function words(n) { return TAP.content.text(n === 1 ? 'combined.region' : 'combined.regions'); }
  function nameOf(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function label(id) { return TAP.measures.meta(id).label; }
  function cellOf(id, ent) { return TAP.measures.combined(id, ent, {}); }
  function isVal(c) { return !!c && c.state === 'value'; }
  function fig(spec) { return { fig: spec }; }

  /* ---------- headline (US-1.5.3) ---------- */

  // Placeholders that hold names from the workbooks: shown as written, never marked as glossary terms.
  var NAMES = ['name', 'industry', 'names'];

  // Fills a template from the content file: words are marked for the glossary (first use only), figures are plain
  // bold text and are collected in figs for the Sources panel.
  function fill(s, seen, figs) {
    var out = [];
    TAP.content.text('overview.headline.' + s.key).split(/(\{\w+\})/).forEach(function (part) {
      var m = /^\{(\w+)\}$/.exec(part), v = m && s.vars[m[1]] != null ? s.vars[m[1]] : part;
      if (v && v.fig) {
        var f = v.fig;
        figs.push(f);
        out.push(el('b', { class: 'tap-ov__num', 'data-state': f.cell.state }, TAP.format.cell(f.cell, { unit: f.unit })));
        return;
      }
      if (v === '') return;
      if (m && NAMES.indexOf(m[1]) >= 0) { out.push(el('span', null, String(v))); return; }
      var span = el('span');
      TAP.dom.html(span, TAP.content.mark(String(v), seen));
      out.push(span);
    });
    return out;
  }

  // "X plans €A of new ARR over three years: N% from new business and C% from existing customers."
  function ambition(ent, subject) {
    var amb = cellOf('amb.arr', ent), nb = cellOf('nb.arr', ent), cg = cellOf('cg.arr', ent);
    var pre = subject.name != null ? 'region' : 'group';
    if (!isVal(amb)) return { key: pre === 'region' ? 'regionNone' : 'none', vars: subject, none: true };
    var parts = [{ label: label('nb.arr'), cell: nb, unit: 'money' }, { label: label('cg.arr'), cell: cg, unit: 'money' }];
    var ambRow = { measure: 'amb.arr', cell: amb, unit: 'money', label: H('ambLabel') };
    ambRow.rows = [ambRow].concat(parts);
    var vars = Object.assign({ amb: fig(ambRow) }, subject);
    if (!isVal(nb) || !isVal(cg)) return { key: pre + (isVal(nb) ? 'NbOnly' : 'CgOnly'), vars: vars, saidCg: isVal(nb) ? ent.regionIds : [] };
    function share(part, key) {
      var c = { v: amb.v > 0 ? part.v / amb.v : 0, state: 'value', kind: 'APP', src: amb.src };
      var row = { cell: c, unit: 'pct', label: H(key) };
      row.rows = [row, { label: label(part === nb ? 'nb.arr' : 'cg.arr'), cell: part, unit: 'money' }, ambRow];
      return fig(row);
    }
    vars.nbShare = share(nb, 'nbShareLabel');
    vars.cgShare = share(cg, 'cgShareLabel');
    return { key: pre, vars: vars };
  }

  // The industry most often placed in Tier 2 among ids (ties: first in the lookup), if at least 2 regions chose it.
  function topTier2(ids) {
    var get = TAP.measures.get('ind.tier'), best = null;
    TAP.data.industries({ rated: true }).forEach(function (ind) {
      var cells = ids.map(function (r) { return { regionId: r, cell: get(r, { industryId: ind.id }) }; });
      var n = cells.filter(function (c) { return isVal(c.cell) && c.cell.v === 2; }).length;
      if (n >= 2 && (!best || n > best.n)) best = { ind: ind, n: n, cells: cells };
    });
    if (!best) return null;
    var count = { cell: { v: best.n, state: 'value', kind: 'APP', src: null }, unit: 'count',
      label: H('tier2Label', { industry: best.ind.name }) };
    count.rows = [count].concat(best.cells.map(function (c) { return { label: H('tierOf', { name: nameOf(c.regionId) }), cell: c.cell, unit: 'tier' }; }));
    return { industry: best.ind, n: best.n, fig: fig(count) };
  }

  // The sentences for every region (the Overview's only comparison since D118), in order: the regions together, or
  // the one region by name when the file has only one.
  function sentences(cmp) {
    var all = TAP.scope.regionIds(cmp), one = all.length === 1, out = [];
    if (!all.length) return [{ key: 'none', vars: {} }];
    out.push(ambition({ kind: one ? 'region' : 'combined', regionIds: all, how: 'total' },
      one ? { name: nameOf(all[0]) } : { n: all.length, regions: words(all.length) }));
    if (out[0].none) return [out[0]];
    // Regions with no customer growth figures, unless a sentence above already said so for them.
    var said = [].concat.apply([], out.map(function (s) { return s.saidCg || []; }));
    var gaps = all.filter(function (id) { return said.indexOf(id) < 0 && TAP.measures.get('cg.arr')(id, {}).state === 'notProvided'; });
    if (gaps.length) out.push({ key: 'cgMissing', vars: { names: TAP.format.list(gaps.map(nameOf)) } });
    var top = all.length >= 2 ? topTier2(all) : null;
    if (top) out.push({ key: 'tier2', vars: { n: top.fig, regions: words(top.n), industry: top.industry.name } });
    return out;
  }

  // Every figure in the sentence, each with the lines behind it: value, kind and file › sheet › cell.
  function openSources(figs) {
    TAP.layers.open('headline-sources', {
      title: H('sourcesTitle'),
      render: function (body) {
        figs.forEach(function (f) {
          var group = el('section', { class: 'tap-details__group' }, el('h3', null, f.label));
          (f.rows || [f]).forEach(function (r) { group.appendChild(TAP.overviewCards.sourceRow(r)); });
          body.appendChild(group);
        });
      }
    });
  }

  function drawHeadline(host, cmp, seen) {
    var p = el('p', { class: 'tap-ov__sentence' }), figs = [];
    sentences(cmp).forEach(function (s, i) {
      if (i) p.appendChild(document.createTextNode(' '));
      TAP.dom.append(p, fill(s, seen, figs));
    });
    var lead = el('div', { class: 'tap-ov__lead' }, [p, figs.length ? el('button', {
      type: 'button', class: 'tap-btn tap-btn--ghost tap-ov__sources', 'aria-label': H('sourcesLabel'),
      onclick: function () { openSources(figs); }
    }, [TAP.icons.svg('data', { size: 16 }), H('sources')]) : null]);
    var old = host.querySelector('.tap-ov__lead');
    if (old) host.replaceChild(lead, old); else host.appendChild(lead);
  }

  /* ---------- top insights for the organization (D119) ---------- */

  // "Show me" asks the chart to highlight; an insight with no chart opens the region's details instead.
  function showMe(x) {
    if (!x.reportId && x.fallback === 'details') TAP.layers.openDetails(x.highlight);
    else TAP.bus.emit('showme', { insightId: x.id, target: x.highlight });
  }

  function insightItem(x, seen) {
    var p = el('p', { class: 'tap-ov-insight__sentence' });
    TAP.dom.html(p, TAP.content.mark(x.sentence, seen));
    return el('article', { class: 'tap-ov-insight', 'data-insight': x.id }, [
      p,
      x.why ? el('p', { class: 'tap-ov-insight__why' }, x.why) : null,
      el('div', { class: 'tap-ov-insight__actions' }, [
        el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-ov-insight__show', onclick: function () { showMe(x); } },
          t('insights.showMe')),
        el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-ov-insight__hide',
          onclick: function () { TAP.insights.hide(x.id); } }, t('insights.hide'))
      ])
    ]);
  }

  // Ranked for all regions, whatever the comparison (D118), so a focus region never reorders or narrows the block.
  // None qualifies: no block at all. A failing engine reads as none (the reason goes to the console).
  function drawInsights(host, seen) {
    var list = [], max = ((window.TAP_SETTINGS || {}).insights || {}).overviewMax || 3;
    try {
      list = TAP.insights.ranked(Object.assign(TAP.store.defaults().cmp, { mode: 'all' }), { broadOnly: true }) || [];
    } catch (e) {
      console.warn('Overview: top insights unavailable:', e.message);
    }
    list = list.slice(0, max);
    TAP.dom.clear(host);
    host.hidden = !list.length;
    if (!list.length) return;
    host.appendChild(sectionHead(t('insights.title'), null));
    host.appendChild(el('p', { class: 'tap-ov__insights-intro' }, t('insights.intro')));
    host.appendChild(el('div', { class: 'tap-ov-insights' }, list.map(function (x) { return insightItem(x, seen); })));
  }

  /* ---------- the view ---------- */

  // Every region, whatever state.cmp holds (D118)
  function everyRegion() { return TAP.store.defaults().cmp; }

  // The ambition panel, listing broad insights only (D119), with no comparison menu (D118). A panel that isn't built
  // yet shows its own message, so the rest of the view still works.
  function mountPanel(host) {
    try {
      return TAP.panel.create(host, 'ov-ambition', { cmp: everyRegion(), noCompare: true, broadOnly: true });
    } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
      TAP.dom.clear(host);
      host.appendChild(el('p', { class: 'tap-stub' }, e.message));
      return null;
    }
  }

  function sectionHead(title, aside) {
    return el('div', { class: 'tap-ov__sechead' }, [el('h2', null, title), aside]);
  }

  function mount(root) {
    TAP.dom.clear(root);
    var headline = el('div', { class: 'tap-ov__headline', 'data-part': 'headline' },
      el('h1', { class: 'tap-ov__title' }, t('title')));
    var cardsHost = el('div', { class: 'tap-ov-cards' });
    var hint = el('span', { class: 'tap-ov__hint' });
    var cards = el('section', { class: 'tap-ov__cards', 'data-part': 'cards', 'aria-label': t('cards.title') },
      [sectionHead(t('cards.title'), hint), cardsHost]);
    var panelHost = el('div', { class: 'tap-ov__panel', 'data-part': 'panel', 'data-report': 'ov-ambition' });
    var insights = el('section', { class: 'tap-ov__insights', 'data-part': 'insights', 'aria-label': t('insights.title') });
    root.appendChild(el('div', { class: 'tap-ov' }, [headline, insights, cards, panelHost]));

    // Headline and insights share one set of marked terms, so a term is marked once at the top of the page.
    function drawText() {
      var seen = {};
      drawHeadline(headline, everyRegion(), seen);
      drawInsights(insights, seen);
    }
    function drawCards() {
      TAP.overviewCards.render(cardsHost, everyRegion());
      TAP.dom.text(hint, t('cards.hint'));
    }
    drawText();
    var tip = TAP.viewHead.tip('overview');   // after the headline, which drawText keeps in place
    if (tip) headline.appendChild(tip);
    drawCards();
    var panel = mountPanel(panelHost);

    var handle, dead = false;   // dead: destroyed; the store may still call this once from its listener copy
    var off = TAP.store.on(function (state, changed) {
      if (dead) return;
      if (!root.isConnected) { handle.destroy(); return; }   // off the page (removed without destroy()): stop listening
      if (changed.indexOf('hiddenInsights') >= 0) { drawText(); drawCards(); }   // the block and the cards' markers (D117)
    });
    // Keeps the card rows even when the window or zoom changes.
    var ro = window.ResizeObserver ? new window.ResizeObserver(function () { TAP.overviewCards.layout(cardsHost); }) : null;
    if (ro) ro.observe(cardsHost);

    handle = {
      destroy: function () {
        dead = true;
        off();
        if (ro) ro.disconnect();
        if (panel && panel.destroy) panel.destroy();
      }
    };
    return handle;
  }

  TAP.views.register('overview', { title: 'Overview', mount: mount });
})(window.TAP);
