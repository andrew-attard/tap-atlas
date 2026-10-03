/*
 * File: js/views/overview.js
 * Purpose: The Overview view: the headline sentence and top insights (US-1.5.3), the region cards (US-1.5.1) and
 *          the ambition chart (US-1.5.2), redrawn as soon as the comparison changes.
 * Provides: view 'overview' (registered with TAP.views)
 * Depends on: js/engine/registry.js, js/core/dom.js, js/core/store.js, js/engine/measures.js, js/engine/scope.js,
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

  // Fills a template from the content file: words are marked for the glossary, figures become source buttons.
  function fill(s, seen) {
    var out = [];
    TAP.content.text('overview.headline.' + s.key).split(/(\{\w+\})/).forEach(function (part) {
      var m = /^\{(\w+)\}$/.exec(part), v = m && s.vars[m[1]] != null ? s.vars[m[1]] : part;
      if (v && v.fig) { out.push(TAP.overviewCards.figure(v.fig)); return; }
      if (v === '') return;
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

  function focusTier2(focusId, others) {
    var top = others.length >= 2 ? topTier2(others) : null;
    if (!top) return null;
    var own = TAP.measures.get('ind.tier')(focusId, { industryId: top.industry.id }), m = others.length;
    var vars = { focus: nameOf(focusId), industry: top.industry.name, n: top.fig, m: m, regions: words(m) };
    if (isVal(own) && own.v === 2) return { key: top.n === m ? 'tier2FocusAll' : 'tier2FocusToo', vars: vars };
    if (!isVal(own)) return { key: 'tier2FocusBlank', vars: vars };
    vars.tier = TAP.format.tier(own.v);
    return { key: 'tier2FocusNot', vars: vars };
  }

  // The sentences for the comparison on screen, in order.
  function sentences(cmp) {
    var ents = TAP.scope.entities(cmp), all = TAP.scope.regionIds(cmp), out = [];
    var focus = ents[0] && ents[0].role === 'focus' ? ents[0] : null, pair = !!(ents[1] && ents[1].role === 'second');
    if (!all.length) return [{ key: 'none', vars: {} }];
    if (focus) {
      var fid = focus.regionIds[0], others = all.filter(function (id) { return id !== fid; });
      out.push(ambition(focus, { name: focus.label }));
      if (pair) out.push(ambition(ents[1], { name: ents[1].label }));
      else if (others.length && !out[0].none) {
        var rest = ents[1] && ents[1].kind === 'combined' ? ents[1]
          : { kind: 'combined', regionIds: others, how: 'average', label: TAP.content.text('combined.restAverage', { n: others.length, regions: words(others.length) }) };
        var r = cellOf('amb.arr', rest);
        if (isVal(r)) {
          out.push({ key: rest.how === 'total' ? 'restTotal' : 'restAverage', vars: { n: others.length, regions: words(others.length),
            rest: fig({ measure: 'amb.arr', cell: r, unit: 'money', label: H('restLabel', { who: rest.label }) }) } });
        }
      }
    } else {
      var one = all.length === 1;
      out.push(ambition({ kind: one ? 'region' : 'combined', regionIds: all, how: 'total' },
        one ? { name: nameOf(all[0]) } : { n: all.length, regions: words(all.length) }));
    }
    if (out[0].none) return [out[0]];
    // Regions with no customer growth figures, unless a sentence above already said so for them.
    var said = [].concat.apply([], out.map(function (s) { return s.saidCg || []; }));
    var gaps = all.filter(function (id) { return said.indexOf(id) < 0 && TAP.measures.get('cg.arr')(id, {}).state === 'notProvided'; });
    if (gaps.length) out.push({ key: 'cgMissing', vars: { names: TAP.format.list(gaps.map(nameOf)) } });
    var tier = null;
    if (focus && !pair) tier = focusTier2(focus.regionIds[0], all.filter(function (id) { return id !== focus.regionIds[0]; }));
    else if (!focus && all.length >= 2) {
      var top = topTier2(all);
      if (top) tier = { key: 'tier2', vars: { n: top.fig, regions: words(top.n), industry: top.industry.name } };
    }
    if (tier) out.push(tier);
    return out;
  }

  function drawHeadline(host, cmp, seen) {
    var p = el('p', { class: 'tap-ov__sentence' });
    sentences(cmp).forEach(function (s, i) {
      if (i) p.appendChild(document.createTextNode(' '));
      TAP.dom.append(p, fill(s, seen));
    });
    var old = host.querySelector('.tap-ov__sentence');
    if (old) host.replaceChild(p, old); else host.appendChild(p);
  }

  /* ---------- top insights (US-1.5.3) ---------- */

  // "Show me" asks the chart to highlight; an insight with no Phase 1 chart opens the region's details instead.
  function showMe(x) {
    if (!x.reportId && x.fallback === 'details') TAP.layers.openDetails(x.highlight);
    else TAP.bus.emit('showme', { insightId: x.id, target: x.highlight });
  }

  function insightItem(x, seen, redraw) {
    var p = el('p', { class: 'tap-ov-insight__sentence' });
    TAP.dom.html(p, TAP.content.mark(x.sentence, seen));
    var regions = (x.regionIds || []).map(function (id) {
      var sw = el('span', { class: 'tap-swatch', 'aria-hidden': 'true' });
      sw.style.backgroundColor = TAP.scope.colorOf(id);
      return el('span', { class: 'tap-ov-insight__region' }, [sw, ' ', nameOf(id)]);
    });
    return el('article', { class: 'tap-ov-insight', 'data-insight': x.id }, [
      x.label ? el('span', { class: 'tap-ov-insight__label' }, x.label) : null,
      p,
      regions.length ? el('div', { class: 'tap-ov-insight__regions' }, regions) : null,
      el('div', { class: 'tap-ov-insight__actions' }, [
        el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-ov-insight__show', onclick: function () { showMe(x); } },
          t('insights.showMe')),
        el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-ov-insight__hide',
          onclick: function () { TAP.insights.hide(x.id); redraw(); } }, t('insights.hide'))
      ])
    ]);
  }

  function drawInsights(host, cmp, seen, redraw) {
    TAP.dom.clear(host);
    var link = el('a', { class: 'tap-ov__all-insights', href: '#insights',
      onclick: function (e) { e.preventDefault(); TAP.store.set({ view: 'insights' }); } }, t('insights.all'));
    host.appendChild(sectionHead(t('insights.title'), link));
    var list;
    try {
      list = TAP.insights.top(cmp, null, 3) || [];
    } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
      host.appendChild(el('p', { class: 'tap-stub' }, e.message));
      return;
    }
    if (!list.length) host.appendChild(el('p', { class: 'tap-muted' }, t('insights.none')));
    else host.appendChild(el('div', { class: 'tap-ov-insights' }, list.map(function (x) { return insightItem(x, seen, redraw); })));
  }

  /* ---------- the view ---------- */

  // The ambition panel. A panel that isn't built yet shows its own message, so the rest of the view still works.
  function mountPanel(host) {
    try {
      return TAP.panel.create(host, 'ov-ambition', {});
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
    var insights = el('section', { class: 'tap-ov__insights', 'data-part': 'insights', 'aria-label': t('insights.title') });
    var cardsHost = el('div', { class: 'tap-ov-cards' });
    var hint = el('span', { class: 'tap-ov__hint' });
    var cards = el('section', { class: 'tap-ov__cards', 'data-part': 'cards', 'aria-label': t('cards.title') },
      [sectionHead(t('cards.title'), hint), cardsHost]);
    var panelHost = el('div', { class: 'tap-ov__panel', 'data-part': 'panel', 'data-report': 'ov-ambition' });
    root.appendChild(el('div', { class: 'tap-ov' }, [headline, insights, cards, panelHost]));

    // Headline and insights share one set of marked terms, so a term is marked once at the top of the page.
    function drawText() {
      var cmp = TAP.store.get().cmp, seen = {};
      drawHeadline(headline, cmp, seen);
      drawInsights(insights, cmp, seen, drawText);
    }
    function drawCards() {
      TAP.overviewCards.render(cardsHost);
      var combinedOnly = TAP.scope.entities(TAP.store.get().cmp).every(function (e) { return e.kind === 'combined'; });
      TAP.dom.text(hint, t(combinedOnly ? 'cards.hintCombined' : 'cards.hint'));
    }
    drawText();
    drawCards();
    var panel = mountPanel(panelHost);

    var off = TAP.store.on(function (state, changed) {
      if (changed.indexOf('cmp') >= 0) { drawText(); drawCards(); }
      else if (changed.indexOf('hiddenInsights') >= 0) drawText();
    });
    // Keeps the card rows even when the window or zoom changes.
    var ro = window.ResizeObserver ? new window.ResizeObserver(function () { TAP.overviewCards.layout(cardsHost); }) : null;
    if (ro) ro.observe(cardsHost);

    return {
      destroy: function () {
        off();
        if (ro) ro.disconnect();
        if (panel && panel.destroy) panel.destroy();
      }
    };
  }

  TAP.views.register('overview', { title: 'Overview', mount: mount });
})(window.TAP);
