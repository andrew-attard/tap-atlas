/*
 * File: js/views/insights.js
 * Purpose: The Insights view: every insight in the comparison, ranked, grouped by family, filterable by region
 *          and family, each with its figures, rule and sources, "Show me" and "Copy" (US-1.7.3), and "Hide for this
 *          session" with an "N hidden · Show hidden" note (US-1.7.11). Each shows its line on why it matters; context
 *          insights (background facts) follow the ranked groups in one closed group (D111). Figures naming several
 *          regions read one line per region (D121). Insights and background facts are counted apart, and the region
 *          and family filters are two dropdowns (D126, js/views/insights-filters.js).
 * Provides: view 'insights' (registered with TAP.views; the spec also carries copyText(insight) for tests)
 * Depends on: js/engine/registry.js, js/ui/view-head.js (tip), js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/format.js,
 *             js/core/sources.js, js/ui/source-tip.js, js/core/store.js, js/core/data.js, js/engine/scope.js, js/engine/measures.js,
 *             js/insights/engine.js (ranked, all, hide, unhide, hidden), js/ui/layers.js (openDetails),
 *             config/settings.js (family weights), js/panel/panel-insights.js (figureLines, at call time),
 *             js/views/insights-filters.js and js/ui/multi-select.js (the counts and the two dropdowns)
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('insightsPage.' + key, vars); }
  function has(list, x) { return list.indexOf(x) >= 0; }

  // Families in the order of the settings, then any others the rules use.
  function familyOrder(list) {
    var w = (window.TAP_SETTINGS && window.TAP_SETTINGS.insights && window.TAP_SETTINGS.insights.familyWeights) || {};
    var out = Object.keys(w);
    list.forEach(function (x) { if (!has(out, x.family)) out.push(x.family); });
    return out;
  }

  /* ---------- figures and copy text ---------- */

  // A figure's unit: its own, then its measure's; a guess from the field is only a safety net.
  function unitOf(f) {
    if (f.unit) return f.unit;
    var m = f.measureId && TAP.measures.meta(f.measureId);
    if (m && m.unit) return m.unit;
    var c = f.cell || {}, field = String((c.src && c.src.field) || '');
    if (typeof c.v === 'string') return 'text';
    if (/^tier$/.test(field)) return 'tier';
    if (/^(growthPotential|criticality|competitiveIntensity|references|expertise|productFit)$/.test(field)) return 'rating';
    if (/^(ability|attractiveness)$/.test(field)) return 'score';
    if (/(hitRate|growth|Ratio|share)/i.test(field)) return 'pct';
    if (/(arr|pipeline|services|dealSize|orderIntake)/i.test(field)) return 'money';
    return null;
  }

  function figureValue(f) {
    var c = f.cell || {}, field = f.field || (c.src && c.src.field);
    return TAP.format.cell(c, { unit: unitOf(f), exact: true, field: field });
  }

  function addressOf(src) {
    try { var a = TAP.sources.address(src); return a ? a.text : ''; } catch (e) { return ''; }
  }

  // Plain text for an email or a slide: sentence, why it matters, label, figures, rule and sources.
  function copyText(x) {
    var lines = [x.sentence].concat(x.why ? [x.why] : [], ['(' + (x.label || t('label')) + ')', '']);
    (x.figures || []).forEach(function (f) { lines.push(f.label + ': ' + figureValue(f)); });
    lines.push('', t('copyRule', { text: x.description || '' }), t('copySources'));
    (x.sources || []).forEach(function (s) { var a = addressOf(s); if (a) lines.push('  ' + a); });
    return lines.join('\n');
  }

  // The clipboard API is often refused on file:// or without focus, so fall back to a hidden text area.
  function copy(text, done) {
    var settled = false;
    function once(ok) { if (!settled) { settled = true; done(ok); } }
    function legacy() {
      var area = el('textarea', { class: 'tap-sr', readonly: true });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.parentNode.removeChild(area);
      once(ok);
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) { legacy(); return; }
    setTimeout(function () { if (!settled) legacy(); }, 800);   // a request can stay unanswered
    navigator.clipboard.writeText(text).then(function () { once(true); }, legacy);
  }

  /* ---------- the page ---------- */

  function mount(root) {
    var ui = { regions: [], families: [], menu: null, open: {}, status: '', showHidden: false, contextOpen: false };
    var page = el('div', { class: 'tap-ins' });
    TAP.dom.clear(root);
    root.appendChild(page);

    function cmp() { return TAP.store.get().cmp; }
    function hidden() { try { return TAP.insights.hidden() || []; } catch (e) { return []; } }
    // The ranked list without hidden insights; with "Show hidden" on, the hidden ones in scope follow, by significance.
    // Context insights are in it too: the page lists them in their own group (D111).
    function visible() {
      var hid = hidden();
      var list = TAP.insights.ranked(cmp(), { context: true }).filter(function (x) { return !has(hid, x.id); });
      if (!ui.showHidden || !hid.length) return list;
      var scope = TAP.scope.regionIds(cmp());
      return list.concat(TAP.insights.all().filter(function (x) {
        return has(hid, x.id) && x.regionIds.some(function (r) { return has(scope, r); });
      }).sort(function (p, q) { return q.significance - p.significance; }));
    }
    function byRegion(x) { return !ui.regions.length || x.regionIds.some(function (r) { return has(ui.regions, r); }); }
    function byFamily(x) { return !ui.families.length || has(ui.families, x.family); }

    // A filter narrows only while some but not every option is ticked ("All" ticks every one, D126).
    function narrows(sel, all) { return sel.length > 0 && all.some(function (x) { return !has(sel, x); }); }
    function summary(shown, list, families) {
      var any = narrows(ui.regions, TAP.scope.regionIds(cmp())) || narrows(ui.families, families);
      return el('div', { class: 'tap-ins__summary' }, [
        el('span', { class: 'tap-ins__shown' }, TAP.insightsFilters.shown(shown, list, any)),
        any ? el('button', { type: 'button', class: 'tap-ins__clear', 'data-key': 'clear', onclick: clear }, t('clear')) : null,
        hiddenNote(),
        el('span', { class: 'tap-ins__status', role: 'status', 'aria-live': 'polite' }, ui.status)
      ]);
    }

    // "2 hidden · Show hidden", so nothing hidden is lost by accident (US-1.7.11).
    function hiddenNote() {
      var n = hidden().length;
      if (!n) return null;
      return el('span', { class: 'tap-ins__hiddennote' }, [
        el('span', { class: 'tap-ins__hidden' }, n === 1 ? t('hiddenCountOne') : t('hiddenCount', { n: n })), ' · ',
        el('button', { type: 'button', class: 'tap-ins__showhidden', 'data-key': 'showhidden', 'aria-pressed': String(!!ui.showHidden),
          onclick: function () { ui.showHidden = !ui.showHidden; draw(); } }, ui.showHidden ? t('hideHidden') : t('showHidden'))
      ]);
    }

    function clear() { ui.regions = []; ui.families = []; draw(); }

    function showMe(x) {
      if (x.reportId) TAP.bus.emit('showme', { insightId: x.id, target: x.highlight });
      else if (x.fallback === 'details') TAP.layers.openDetails(x.highlight);
    }

    // Each figure carries the data icon for where it comes from (D100); a source no figure shows stays listed:
    // by region with its icon, or in words when this app worked it out.
    function figVal(f) { var c = f.cell || {}; return el('span', { class: 'tap-ins__fig' }, [figureValue(f), TAP.sourceTip.icon(c.src, c.kind, { label: f.label })]); }
    function figRows(figs) {
      return el('dl', { class: 'tap-ins__figs' }, figs.map(function (f) { return [el('dt', null, f.label), el('dd', null, figVal(f))]; })
        .reduce(function (a, b) { return a.concat(b); }, []));
    }
    // Figures naming several regions read one line per region (D121); otherwise one row per figure.
    function figBlock(figs) { return TAP.panelInsights.figureBlock(figs, 'tap-ins__figline', figVal, figRows) || [figRows(figs)]; }

    function details(x) {
      var figs = x.figures || [], keys = figs.map(function (f) { return JSON.stringify((f.cell || {}).src || null); });
      var rest = (x.sources || []).filter(function (s) { return s && keys.indexOf(JSON.stringify(s)) < 0; });
      return el('div', { class: 'tap-ins__details', id: 'tap-ins-d-' + x.id.replace(/[^\w-]/g, '_') }, [
        el('h4', { class: 'tap-ins__dh' }, t('figures'))
      ].concat(figBlock(figs), [
        el('h4', { class: 'tap-ins__dh' }, t('rule')),
        el('p', { class: 'tap-ins__rule' }, x.description || ''),
        rest.length ? el('h4', { class: 'tap-ins__dh' }, t('sources')) : null,
        rest.length ? el('ul', { class: 'tap-ins__srcs' }, rest.map(function (s) {
          var tip = TAP.sourceTip.icon(s, s.kind), reg = s.regionId && TAP.data.region(s.regionId);
          return el('li', null, tip ? [reg ? TAP.content.regionName(reg) : '', tip] : [s.kind ? TAP.format.kind(s.kind).text + ' · ' : '', addressOf(s)]);
        })) : null
      ]));
    }

    function itemEl(x) {
      var open = !!ui.open[x.id], key = function (k) { return k + ':' + x.id; }, hid = has(hidden(), x.id);
      var regions = x.regionIds.map(function (id) {
        var sw = el('span', { class: 'tap-swatch', 'aria-hidden': 'true' });
        sw.style.background = TAP.scope.colorOf(id);
        return el('span', { class: 'tap-ins__region' }, [sw, TAP.content.regionName(TAP.data.region(id))]);
      });
      var actions = el('div', { class: 'tap-ins__actions' }, [
        el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-ins__showme', 'data-key': key('showme'),
          onclick: function () { showMe(x); } }, t('showMe')),
        el('button', { type: 'button', class: 'tap-btn tap-ins__toggle', 'data-key': key('toggle'), 'aria-expanded': String(open),
          onclick: function () { ui.open[x.id] = !open; draw(); } }, open ? t('detailsClose') : t('details')),
        el('button', { type: 'button', class: 'tap-btn tap-ins__copy', 'data-key': key('copy'),
          onclick: function () { copy(copyText(x), function (ok) { ui.status = t(ok ? 'copied' : 'copyFailed'); draw(); }); } },
          [TAP.icons.svg('copy', { size: 18 }), t('copy')]),
        el('button', { type: 'button', class: 'tap-btn tap-ins__hide', 'data-key': key('hide'),
          onclick: function () { if (hid) TAP.insights.unhide(x.id); else TAP.insights.hide(x.id); } },
          [TAP.icons.svg('hide', { size: 18 }), hid ? t('unhide') : t('hide')])
      ]);
      return el('article', { class: 'tap-ins__item' + (hid ? ' is-hidden' : ''), 'data-insight': x.id, 'data-family': x.family }, [
        el('div', { class: 'tap-ins__badges' }, [
          el('span', { class: 'tap-badge tap-ins__label' }, x.label || t('label')),
          hid ? el('span', { class: 'tap-badge tap-ins__hiddenbadge' }, t('hiddenBadge')) : null
        ]),
        TAP.dom.html(el('p', { class: 'tap-ins__sentence' }), TAP.content.mark(x.sentence, {})),
        x.why ? el('p', { class: 'tap-ins__why' }, x.why) : null,
        el('div', { class: 'tap-ins__regions' }, regions),
        actions,
        open ? details(x) : null
      ]);
    }

    function group(f, list) {
      return el('section', { class: 'tap-ins__group', 'data-family': f, 'aria-label': t('families.' + f + '.name') }, [
        el('div', { class: 'tap-ins__ghead' }, [
          el('h2', { class: 'tap-ins__gname' }, t('families.' + f + '.name')),
          el('span', { class: 'tap-ins__gcount' }, list.length === 1 ? t('countOne') : t('count', { n: list.length })),
          el('p', { class: 'tap-ins__gline' }, t('families.' + f + '.line'))
        ]),
        el('div', { class: 'tap-ins__list' }, list.map(itemEl))
      ]);
    }

    // Background facts that move no decision (D111): one group, closed until opened, kept open across redraws.
    function contextGroup(list) {
      return el('details', { class: 'tap-ins__context', 'data-part': 'context', open: ui.contextOpen,
        ontoggle: function (e) { ui.contextOpen = e.target.open; } }, [
        el('summary', { class: 'tap-ins__csum' }, [
          el('span', { class: 'tap-ins__gname' }, t('context.name')),
          el('span', { class: 'tap-ins__gcount' }, list.length === 1 ? t('factCountOne') : t('factCount', { n: list.length })),
          el('span', { class: 'tap-ins__gline' }, t('context.line'))
        ]),
        el('div', { class: 'tap-ins__list' }, list.map(itemEl))
      ]);
    }

    // Redraws everything and puts focus back on the control that was used.
    function draw() {
      var a = document.activeElement, focusKey = a && page.contains(a) ? a.getAttribute('data-key') : null;
      TAP.dom.clear(page);
      // Regions that left the comparison stop filtering before anything is worked out (their chips go too)
      var inScope = TAP.scope.regionIds(cmp());
      ui.regions = ui.regions.filter(function (r) { return has(inScope, r); });
      var list;
      try { list = visible(); } catch (e) {
        if (!/Not built yet/.test(e.message)) throw e;
        page.appendChild(el('p', { class: 'tap-stub' }, e.message));
        return;
      }
      var families = familyOrder(list), shown = list.filter(function (x) { return byRegion(x) && byFamily(x); });
      page.appendChild(el('header', { class: 'tap-ins__head' }, [
        el('p', { class: 'tap-ins__kicker' }, t('kicker')),
        el('h1', { class: 'tap-ins__h1', tabindex: '-1' }, t('heading')),
        el('p', { class: 'tap-ins__intro' }, TAP.insightsFilters.intro(list)),
        el('p', { class: 'tap-ins__scope' }, t('scope', { sentence: TAP.scope.sentence(cmp()) })),
        TAP.viewHead.tip('insights')
      ]));
      page.appendChild(TAP.insightsFilters.bar({ list: list, families: families, inScope: inScope, ui: ui,
        byRegion: byRegion, byFamily: byFamily, redraw: draw }));
      page.appendChild(summary(shown, list, families));
      families.forEach(function (f) {
        var inF = shown.filter(function (x) { return x.family === f && !x.context; });
        if (inF.length) page.appendChild(group(f, inF));
      });
      var ctx = shown.filter(function (x) { return x.context; });
      if (ctx.length) page.appendChild(contextGroup(ctx));
      if (!shown.length) {
        page.appendChild(el('div', { class: 'tap-ins__none' }, [
          el('p', null, list.length ? t('none') : t('empty')),
          list.length ? el('button', { type: 'button', class: 'tap-btn', 'data-key': 'clear', onclick: clear }, t('clear')) : null
        ]));
      }
      var back = focusKey ? page.querySelector('[data-key="' + focusKey.replace(/["\\]/g, '') + '"]') : null;
      // The control that was used may be gone (its insight was just hidden): fall back to the hidden count
      if (!back && focusKey) back = page.querySelector('.tap-ins__showhidden') || page.querySelector('.tap-ins__h1');
      if (back) back.focus();
    }

    var dead = false;
    // An outside click or Esc closes the open dropdown (D126)
    var offMenu = TAP.multiSelect.watch(page, function () { return ui.menu; }, function () { ui.menu = null; });
    var off = TAP.store.on(function (state, changed) {
      if (dead) return;   // destroyed; the store may still call this once from its listener copy
      if (!root.isConnected) { off(); offMenu(); return; }   // off the page (removed without destroy()): stop listening
      if (has(changed, 'cmp') || has(changed, 'hiddenInsights')) { ui.status = ''; draw(); }
    });
    draw();
    return { destroy: function () { dead = true; off(); offMenu(); TAP.dom.clear(root); } };
  }

  // The menu title comes from config/views.js
  TAP.views.register('insights', { mount: mount, copyText: copyText });
})(window.TAP);
