/*
 * File: js/views/new-business.js
 * Purpose: The New business view (US-2.1.1): the shared header with its headline, then the industry grid and the
 *          channels side by side, the levers at full width, the sub-industry list next to the success factors panel
 *          (US-2.1.6), and the recurring themes. A report not defined yet takes no slot, so the view grows as the
 *          reports land. Selecting an industry (a grid row or cell, the list's industry filter, details) updates
 *          the success factors panel.
 * Provides: view 'newBusiness' (registered with TAP.views), TAP.newBusinessView (layout, factors)
 * Depends on: js/ui/view-head.js, js/panel/panel.js, js/engine/registry.js, js/engine/scope.js, js/core/dom.js,
 *             js/core/content.js, js/core/store.js, js/core/data.js, js/core/sources.js, js/core/format.js,
 *             js/theme.js (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: NB stream (#197, #202)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text(key, vars); }
  var VIEW = 'newBusiness', FACTORS = 'factors';

  // Rows of the page: two items side by side at most (D24); one item takes the full width.
  var LAYOUT = [['nb-industries', 'nb-channels'], ['nb-levers'], ['nb-rows', FACTORS], ['nb-themes']];

  function reports() { return ((window.TAP_VIEWS || {})[VIEW] || {}).reports || []; }
  function shown(id) { return id === FACTORS || (reports().indexOf(id) >= 0 && !!TAP.reports.get(id)); }

  // Reports the view lists that are not in the layout go at the end, one per row, so none is ever lost.
  function rows() {
    var placed = [].concat.apply([], LAYOUT), out = LAYOUT.map(function (r) { return r.slice(); });
    reports().forEach(function (id) { if (placed.indexOf(id) < 0) out.push([id]); });
    return out.map(function (r) { return r.filter(shown); }).filter(function (r) { return r.length; });
  }

  /* ---------- success factors (US-2.1.6) ---------- */

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

  // What each region in scope wrote for the industry, one entry per new business row. Blanks are simply not listed.
  function factors(industryId, cmp) {
    var out = [];
    if (!industryId) return out;
    regionsInScope(cmp || TAP.store.get().cmp).forEach(function (r) {
      ((TAP.data.region(r.id) || {}).newBusiness || []).forEach(function (row) {
        var v = row.successFactors;
        if (row.industryId !== industryId || v == null || String(v).trim() === '') return;
        out.push({ regionId: r.id, focus: r.focus, color: r.color, subVertical: row.subVertical, market: row.market, text: String(v),
          src: { regionId: r.id, section: 'newBusiness', field: 'successFactors', row: row.sourceRow, rows: [row.sourceRow], year: null, cell: null, kind: 'IN' } });
      });
    });
    return out;
  }

  function entry(f) {
    var where = TAP.sources.address(f.src), label = [f.subVertical, f.market].filter(Boolean).join(' · ');
    return el('article', { class: 'tap-nbf__entry', 'data-region': f.regionId }, [
      el('span', { class: 'tap-nbf__bar', style: 'background:' + f.color, 'aria-hidden': 'true' }),
      el('div', { class: 'tap-nbf__body' }, [
        el('div', { class: 'tap-nbf__head' }, [
          el('span', { class: 'tap-nbf__name' }, TAP.content.regionName(TAP.data.region(f.regionId))),
          label ? el('span', { class: 'tap-nbf__where' }, label) : null,
          f.focus ? el('span', { class: 'tap-nbf__focus' }, t('nbFactors.focus')) : null
        ]),
        el('p', { class: 'tap-nbf__text' }, f.text),
        el('span', { class: 'tap-nbf__src' }, TAP.format.kind('IN').text + (where ? ' · ' + where.text : ''))
      ])
    ]);
  }

  function drawFactors(box) {
    var s = TAP.store.get(), ind = s.industry ? TAP.data.industry(s.industry) : null, list = ind ? factors(ind.id, s.cmp) : [];
    TAP.dom.clear(box);
    var body = el('div', { class: 'tap-nbf__list', tabindex: '0', 'aria-label': t('nbFactors.listLabel') });
    if (!ind) body.appendChild(el('p', { class: 'tap-nbf__ask' }, t('nbFactors.ask')));
    else if (!list.length) body.appendChild(el('p', { class: 'tap-nbf__none' }, t('nbFactors.none', { industry: ind.name })));
    list.forEach(function (f) { body.appendChild(entry(f)); });
    TAP.dom.append(box, [
      el('header', { class: 'tap-nbf__header' }, [
        el('h2', { class: 'tap-nbf__title' }, ind ? t('nbFactors.title', { industry: ind.name }) : t('nbFactors.titleNone')),
        el('p', { class: 'tap-nbf__intro' }, t('nbFactors.intro'))
      ]),
      body,
      el('footer', { class: 'tap-nbf__foot' }, TAP.format.kind('IN').text + ' ' + t('nbFactors.foot'))
    ]);
  }

  /* ---------- the view ---------- */

  function slotFor(id) {
    if (id === FACTORS) return el('section', { class: 'tap-vh-slot tap-nbf', 'data-slot': FACTORS, 'aria-label': t('nbFactors.label') });
    return el('div', { class: 'tap-vh-slot', 'data-slot': id });
  }

  // The list's industry filter (a builder control) selects the industry too. "All" names no industry and is ignored.
  function onFilter(e) {
    var s = e.target;
    if (!s || s.getAttribute('data-control') !== 'filter:industry') return;
    if (TAP.data.industry(s.value) && s.value !== TAP.store.get().industry) TAP.store.set({ industry: s.value });
  }

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-nb' }), panels = [], box = null;
    root.appendChild(page);
    var head = TAP.viewHead.render(page, { viewId: VIEW, kicker: t('nbView.kicker'), title: t('nbView.title'), lead: t('nbView.lead') });
    rows().forEach(function (r) {
      var slots = r.map(slotFor);
      page.appendChild(slots.length > 1 ? TAP.viewHead.pair(slots) : el('div', { class: 'tap-nb__wide' }, slots));
      r.forEach(function (id, i) {
        if (id === FACTORS) box = slots[i];
        else panels.push(TAP.viewHead.mountPanel(slots[i], id));
        if (id === 'nb-rows') slots[i].addEventListener('change', onFilter);
      });
    });
    if (box) drawFactors(box);
    var dead = false, handle;
    var offs = [
      TAP.bus.on('industry:select', function (p) {
        if (!dead && p && p.industryId && p.industryId !== TAP.store.get().industry) TAP.store.set({ industry: p.industryId });
      }),
      TAP.store.on(function (s, changed) {
        if (dead) return;
        if (!root.isConnected) { handle.destroy(); return; }   // off the page (removed without destroy()): stop listening
        // Details that name one industry select it too, so the panel follows any click (ARCHITECTURE s10)
        var tg = changed.indexOf('layer') >= 0 && s.layer && s.layer.name === 'details' && s.layer.payload && s.layer.payload.target;
        if (tg && (tg.industryIds || []).length === 1 && tg.industryIds[0] !== s.industry) { TAP.store.set({ industry: tg.industryIds[0] }); return; }
        if (box && ['industry', 'cmp', 'scopeEpoch'].some(function (k) { return changed.indexOf(k) >= 0; })) drawFactors(box);
      })
    ];
    handle = { destroy: function () {
      if (dead) return;
      dead = true;
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      offs.forEach(function (f) { if (typeof f === 'function') f(); });
      head.destroy();
    } };
    return handle;
  }

  TAP.newBusinessView = { layout: function () { return LAYOUT.map(function (r) { return r.slice(); }); }, factors: factors };
  TAP.views.register(VIEW, { title: 'New business', mount: mount });
})(window.TAP);
