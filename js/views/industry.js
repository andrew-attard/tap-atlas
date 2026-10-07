/*
 * File: js/views/industry.js
 * Purpose: The Market coverage view in two parts (D105). All industries: the tier grid, then attractiveness vs
 *          ability, both at full width. One industry: the view's only industry picker and a line saying why that
 *          industry is shown, then its ratings and below them the leaders' commentary (US-1.5.7), both at full width
 *          so the grid keeps its full column headings. The industry in focus is
 *          the one picked (picker, grid row, bubble, details), else the one the regions shown disagree on most; the
 *          charts above mark it.
 * Provides: view 'industry' (registered with TAP.views), TAP.industryView (current)
 * Depends on: js/engine/registry.js, js/ui/view-head.js (tip), js/core/dom.js, js/core/store.js, js/core/content.js, js/core/format.js,
 *             js/ui/source-tip.js, js/core/data.js, js/theme.js, js/engine/scope.js, js/engine/measures.js,
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
    var ok = tier.state === 'value', name = TAP.content.regionName(TAP.data.region(r.id));
    return el('article', { class: 'tap-ind-comment', 'data-region': r.id }, [
      el('span', { class: 'tap-ind-comment__bar', style: 'background:' + r.color, 'aria-hidden': 'true' }),
      el('div', { class: 'tap-ind-comment__body' }, [
        el('div', { class: 'tap-ind-comment__head' }, [
          el('span', { class: 'tap-ind-comment__name' }, name),
          el('span', { class: 'tap-ind-comment__tier ' + (ok ? 'tap-ind-comment__tier--t' + tier.v : 'tap-ind-comment__tier--np') },
            ok ? TAP.format.tier(tier.v) : t('states.notProvided')),
          r.focus ? el('span', { class: 'tap-ind-comment__focus' }, t('commentary.focus')) : null,
          TAP.sourceTip.icon(cell.src, cell.kind, { label: name })   // where it was written (D100)
        ]),
        el('p', { class: 'tap-ind-comment__text' }, String(cell.v))
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

  /* ---------- the One industry header (D105) ---------- */

  // The only industry picker on the view, A to Z (the grid's default order puts group priorities first, which is no
  // help when looking a name up), and one line saying why that industry is shown.
  function drawPicker(sel, why) {
    var s = TAP.store.get(), id = current(s.cmp), ind = id ? TAP.data.industry(id) : null;
    var inds = TAP.data.industries({ rated: true }).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    TAP.dom.clear(sel);
    inds.forEach(function (d) { sel.appendChild(el('option', { value: d.id }, d.name)); });
    sel.value = id || '';
    TAP.dom.text(why, ind ? t(s.industry ? 'industryView.whyPicked' : 'industryView.whyDefault', { industry: ind.name }) : '');
  }

  /* ---------- the view ---------- */

  function part(name, children) {
    return el('section', { class: 'tap-ind__part tap-ind__part--' + name, 'data-part': name, 'aria-labelledby': 'tap-ind-part-' + name },
      children);
  }

  function mount(root) {
    TAP.dom.clear(root);
    var tiers = el('div', { class: 'tap-ind__slot tap-ind__slot--wide' }), quad = el('div', { class: 'tap-ind__slot tap-ind__slot--wide' });
    var ratings = el('div', { class: 'tap-ind__slot tap-ind__slot--wide' });
    var notes = el('section', { class: 'tap-ind-comments', 'aria-label': t('commentary.label') });
    var sel = el('select', { class: 'tap-field tap-ind__select', id: 'tap-ind-picker' }), why = el('p', { class: 'tap-ind__why', role: 'status' });
    sel.addEventListener('change', function () { TAP.bus.emit('industry:select', { industryId: sel.value }); });
    root.appendChild(el('div', { class: 'tap-ind' }, [
      el('header', { class: 'tap-ind__head' }, [
        el('span', { class: 'tap-ind__kicker' }, t('industryView.kicker')),
        el('h1', { class: 'tap-ind__title' }, t('industryView.title')),
        el('p', { class: 'tap-ind__lead' }, t('industryView.lead')),
        TAP.viewHead.tip('industry')
      ]),
      part('all', [el('h2', { class: 'tap-ind__part-title', id: 'tap-ind-part-all' }, t('industryView.partAll')), tiers, quad]),
      part('one', [
        el('header', { class: 'tap-ind__part-head' }, [
          el('h2', { class: 'tap-ind__part-title', id: 'tap-ind-part-one' }, t('industryView.partOne')),
          el('div', { class: 'tap-ind__picker' }, [el('label', { for: 'tap-ind-picker' }, t('industryView.pickLabel')), sel]),
          why
        ]),
        ratings, notes
      ])
    ]));
    // Every chart on the view marks or shows the industry in focus, and follows it as it changes (D105)
    var focus = { industryOf: function (cmp) { return current(cmp); } };
    var panels = [mountPanel(tiers, 'ind-tiers', focus), mountPanel(quad, 'ind-quad', focus), mountPanel(ratings, 'ind-ratings', focus)];
    drawPicker(sel, why);
    drawComments(notes);
    var handle;
    var dead = false;
    var offs = [
      TAP.bus.on('industry:select', function (p) {
        if (p && p.industryId && p.industryId !== TAP.store.get().industry) TAP.store.set({ industry: p.industryId });
      }),
      TAP.store.on(function (s, changed) {
        if (dead) return;   // destroyed; the store may still call this once from its listener copy
        if (!root.isConnected) { handle.destroy(); return; }   // off the page (removed without destroy()): stop listening
        // Details that name one industry select it too, so the commentary follows any click (ARCHITECTURE s10)
        var tg = changed.indexOf('layer') >= 0 && s.layer && s.layer.name === 'details' && s.layer.payload && s.layer.payload.target;
        if (tg && (tg.industryIds || []).length === 1 && tg.industryIds[0] !== s.industry) { TAP.store.set({ industry: tg.industryIds[0] }); return; }
        if (['industry', 'cmp', 'scopeEpoch'].some(function (k) { return changed.indexOf(k) >= 0; })) { drawPicker(sel, why); drawComments(notes); }
      })
    ];
    handle = { destroy: function () {
      dead = true;
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      offs.forEach(function (f) { if (typeof f === 'function') f(); });
    } };
    return handle;
  }

  TAP.industryView = { current: current };
  TAP.views.register('industry', { title: 'Market coverage', mount: mount });
})(window.TAP);
