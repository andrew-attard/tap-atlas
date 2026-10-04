/*
 * File: js/views/industry.js
 * Purpose: The Industry priorities view: the tier grid at full width, then attractiveness vs ability and the
 *          ratings side by side, then the leaders' commentary for the selected industry (US-1.5.7). Selecting an
 *          industry anywhere on the view (grid row, quadrant point, ratings picker, details) updates the rest.
 * Provides: view 'industry' (registered with TAP.views), TAP.industryView (current)
 * Depends on: js/engine/registry.js, js/core/dom.js, js/core/store.js, js/core/content.js, js/core/format.js,
 *             js/core/sources.js, js/core/data.js, js/theme.js, js/engine/scope.js, js/engine/measures.js,
 *             js/reports/tier-grid.js (TAP.tierStats), js/panel/panel.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text(key, vars); }

  // The industry the view is about: the one selected, else the one regions in scope disagree on most.
  function current(cmp) {
    var s = TAP.store.get(), id = s.industry;
    if (id && TAP.data.industry(id)) return id;
    return TAP.tierStats.mostSplit(TAP.scope.regionIds(cmp || s.cmp));
  }

  // A report panel. If the panel can't be drawn, the slot says so instead of breaking the view.
  function mountPanel(slot, reportId, opts) {
    try { return TAP.panel.create(slot, reportId, opts || {}); } catch (e) {
      TAP.dom.clear(slot);
      slot.appendChild(el('p', { class: 'tap-stub' }, e.message));
      return null;
    }
  }

  /* ---------- commentary ---------- */

  // Regions in scope, the focus region first. Against the rest, the others take the grey of the charts.
  function regionsInScope(cmp) {
    var ents = TAP.scope.entities(cmp), focus = ents[0] && ents[0].role === 'focus' ? ents[0].regionIds[0] : null;
    var muted = !!focus && ents.some(function (e) { return e.role === 'muted' || e.role === 'combined'; });
    var ids = TAP.scope.regionIds(cmp);
    if (focus) ids = [focus].concat(ids.filter(function (id) { return id !== focus; }));
    return ids.map(function (id) {
      return { id: id, focus: id === focus, color: muted && id !== focus ? window.TAP_THEME.focusGrey : TAP.scope.colorOf(id) };
    });
  }

  function commentFor(r, industryId) {
    var cell = TAP.measures.get('ind.commentary')(r.id, { industryId: industryId });
    if (cell.state !== 'value' || cell.v == null || String(cell.v).trim() === '') return null;   // blanks are simply not listed
    var tier = TAP.measures.get('ind.tier')(r.id, { industryId: industryId });
    var ok = tier.state === 'value', where = TAP.sources.address(cell.src);
    return el('article', { class: 'tap-ind-comment', 'data-region': r.id }, [
      el('span', { class: 'tap-ind-comment__bar', style: 'background:' + r.color, 'aria-hidden': 'true' }),
      el('div', { class: 'tap-ind-comment__body' }, [
        el('div', { class: 'tap-ind-comment__head' }, [
          el('span', { class: 'tap-ind-comment__name' }, TAP.content.regionName(TAP.data.region(r.id))),
          el('span', { class: 'tap-ind-comment__tier ' + (ok ? 'tap-ind-comment__tier--t' + tier.v : 'tap-ind-comment__tier--np') },
            ok ? TAP.format.tier(tier.v) : t('states.notProvided')),
          r.focus ? el('span', { class: 'tap-ind-comment__focus' }, t('commentary.focus')) : null
        ]),
        el('p', { class: 'tap-ind-comment__text' }, String(cell.v)),
        el('span', { class: 'tap-ind-comment__src' }, TAP.format.kind(cell.kind).text + (where ? ' · ' + where.text : ''))
      ])
    ]);
  }

  function drawComments(box) {
    var cmp = TAP.store.get().cmp, id = current(cmp), ind = id ? TAP.data.industry(id) : null;
    TAP.dom.clear(box);
    var list = el('div', { class: 'tap-ind-comments__list', tabindex: '0', 'aria-label': t('commentary.listLabel') });
    if (ind) regionsInScope(cmp).forEach(function (r) { var c = commentFor(r, id); if (c) list.appendChild(c); });
    // One plain line when nobody shown wrote about it, so the box never looks broken; no region is singled out
    if (!list.children.length) list.appendChild(el('p', { class: 'tap-ind-comments__none' }, t('commentary.none', { industry: ind ? ind.name : '' })));
    TAP.dom.append(box, [
      el('header', { class: 'tap-ind-comments__head' }, [
        el('h2', { class: 'tap-ind-comments__title' }, t('commentary.title', { industry: ind ? ind.name : '' })),
        el('p', { class: 'tap-ind-comments__intro' }, t('commentary.intro'))
      ]),
      list,
      el('footer', { class: 'tap-ind-comments__foot' }, TAP.format.kind('IN').text + ' ' + t('commentary.foot'))
    ]);
  }

  /* ---------- the view ---------- */

  function mount(root) {
    TAP.dom.clear(root);
    var tiers = el('div', { class: 'tap-ind__slot tap-ind__slot--wide' }), quad = el('div', { class: 'tap-ind__slot' });
    var ratings = el('div', { class: 'tap-ind__slot' });
    var notes = el('section', { class: 'tap-ind-comments', 'aria-label': t('commentary.label') });
    root.appendChild(el('div', { class: 'tap-ind' }, [
      el('header', { class: 'tap-ind__head' }, [
        el('span', { class: 'tap-ind__kicker' }, t('industryView.kicker')),
        el('h1', { class: 'tap-ind__title' }, t('industryView.title')),
        el('p', { class: 'tap-ind__lead' }, t('industryView.lead'))
      ]),
      tiers, el('div', { class: 'tap-ind__pair' }, [quad, ratings]), notes
    ]));
    var shown = current(), panels = [mountPanel(tiers, 'ind-tiers'), mountPanel(quad, 'ind-quad'), mountPanel(ratings, 'ind-ratings', { industryId: shown })];
    // While nothing is selected, the ratings follow the most split industry for the scope (US-1.5.6)
    function followDefault() {
      var next = current();
      if (TAP.store.get().industry || next === shown) return;
      shown = next;
      if (panels[2] && panels[2].destroy) panels[2].destroy();
      panels[2] = mountPanel(ratings, 'ind-ratings', { industryId: shown });
    }
    drawComments(notes);
    var handle;
    var offs = [
      TAP.bus.on('industry:select', function (p) {
        if (p && p.industryId && p.industryId !== TAP.store.get().industry) TAP.store.set({ industry: p.industryId });
      }),
      TAP.store.on(function (s, changed) {
        if (!root.isConnected) { handle.destroy(); return; }   // off the page (removed without destroy()): stop listening
        // Details that name one industry select it too, so the commentary follows any click (ARCHITECTURE s10)
        var tg = changed.indexOf('layer') >= 0 && s.layer && s.layer.name === 'details' && s.layer.payload && s.layer.payload.target;
        if (tg && (tg.industryIds || []).length === 1 && tg.industryIds[0] !== s.industry) { TAP.store.set({ industry: tg.industryIds[0] }); return; }
        if (changed.indexOf('industry') >= 0) shown = s.industry || shown;
        if (changed.indexOf('cmp') >= 0) followDefault();
        if (['industry', 'cmp', 'scopeEpoch'].some(function (k) { return changed.indexOf(k) >= 0; })) drawComments(notes);
      })
    ];
    handle = { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      offs.forEach(function (f) { if (typeof f === 'function') f(); });
    } };
    return handle;
  }

  TAP.industryView = { current: current };
  TAP.views.register('industry', { title: 'Industry priorities', mount: mount });
})(window.TAP);
