/*
 * File: js/views/insights.js
 * Purpose: The Insights view: every insight in the comparison, ranked, grouped by family, filterable by region
 *          and family, each with its figures, rule and sources, "Show me" and "Copy" (US-1.7.3), and "Hide for this
 *          session" with an "N hidden · Show hidden" note (US-1.7.11).
 * Provides: view 'insights' (registered with TAP.views; the spec also carries copyText(insight) for tests)
 * Depends on: js/engine/registry.js, js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/format.js,
 *             js/core/sources.js, js/core/store.js, js/core/data.js, js/engine/scope.js, js/engine/measures.js,
 *             js/insights/engine.js (ranked, all, hide, unhide, hidden), js/ui/layers.js (openDetails),
 *             config/settings.js (family weights)
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('insightsPage.' + key, vars); }
  function has(list, x) { return list.indexOf(x) >= 0; }
  function toggle(list, x) { return has(list, x) ? list.filter(function (y) { return y !== x; }) : list.concat(x); }

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

  // Plain text for an email or a slide: sentence, label, figures, rule and sources.
  function copyText(x) {
    var lines = [x.sentence, '(' + (x.label || t('label')) + ')', ''];
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
    var ui = { regions: [], families: [], open: {}, status: '', showHidden: false };
    var page = el('div', { class: 'tap-ins' });
    TAP.dom.clear(root);
    root.appendChild(page);

    function cmp() { return TAP.store.get().cmp; }
    function hidden() { try { return TAP.insights.hidden() || []; } catch (e) { return []; } }
    // The ranked list without hidden insights; with "Show hidden" on, the hidden ones in scope follow, by significance.
    function visible() {
      var hid = hidden();
      var list = TAP.insights.ranked(cmp(), {}).filter(function (x) { return !has(hid, x.id); });
      if (!ui.showHidden || !hid.length) return list;
      var scope = TAP.scope.regionIds(cmp());
      return list.concat(TAP.insights.all().filter(function (x) {
        return has(hid, x.id) && x.regionIds.some(function (r) { return has(scope, r); });
      }).sort(function (p, q) { return q.significance - p.significance; }));
    }
    function byRegion(x) { return !ui.regions.length || x.regionIds.some(function (r) { return has(ui.regions, r); }); }
    function byFamily(x) { return !ui.families.length || has(ui.families, x.family); }

    function chip(attr, id, label, n, on, color, onclick) {
      var b = el('button', { type: 'button', class: 'tap-ins__chip', 'aria-pressed': String(on), onclick: onclick },
        [color ? el('span', { class: 'tap-swatch tap-ins__sw', 'aria-hidden': 'true' }) : null, label,
          el('span', { class: 'tap-ins__n' }, String(n))]);
      b.setAttribute(attr, id);
      b.setAttribute('data-key', attr + ':' + id);
      if (color) b.firstChild.style.background = color;
      return b;
    }

    function filters(list, families) {
      var inScope = TAP.scope.regionIds(cmp());
      ui.regions = ui.regions.filter(function (r) { return has(inScope, r); });
      var regionRow = el('div', { class: 'tap-ins__row', role: 'group', 'aria-label': t('regionsLabel') },
        [el('span', { class: 'tap-ins__rowlabel' }, t('regionsLabel'))].concat(inScope.map(function (id) {
          var n = list.filter(function (x) { return byFamily(x) && has(x.regionIds, id); }).length;
          return chip('data-region', id, TAP.content.regionName(TAP.data.region(id)), n, has(ui.regions, id), TAP.scope.colorOf(id),
            function () { ui.regions = toggle(ui.regions, id); draw(); });
        })));
      var famRow = el('div', { class: 'tap-ins__row', role: 'group', 'aria-label': t('familiesLabel') },
        [el('span', { class: 'tap-ins__rowlabel' }, t('familiesLabel'))].concat(families.map(function (f) {
          var n = list.filter(function (x) { return byRegion(x) && x.family === f; }).length;
          return chip('data-family', f, t('families.' + f + '.name'), n, has(ui.families, f), null,
            function () { ui.families = toggle(ui.families, f); draw(); });
        })));
      return el('div', { class: 'tap-ins__filters' }, [el('p', { class: 'tap-ins__hint' }, t('filterHint')), regionRow, famRow]);
    }

    function summary(shown, total) {
      var any = ui.regions.length || ui.families.length;
      return el('div', { class: 'tap-ins__summary' }, [
        el('span', { class: 'tap-ins__shown' }, t('shown', { n: shown, total: total })),
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

    function details(x) {
      return el('div', { class: 'tap-ins__details', id: 'tap-ins-d-' + x.id.replace(/[^\w-]/g, '_') }, [
        el('h4', { class: 'tap-ins__dh' }, t('figures')),
        el('dl', { class: 'tap-ins__figs' }, (x.figures || []).map(function (f) {
          return [el('dt', null, f.label), el('dd', null, figureValue(f))];
        }).reduce(function (a, b) { return a.concat(b); }, [])),
        el('h4', { class: 'tap-ins__dh' }, t('rule')),
        el('p', { class: 'tap-ins__rule' }, x.description || ''),
        el('h4', { class: 'tap-ins__dh' }, t('sources')),
        el('ul', { class: 'tap-ins__srcs' }, (x.sources || []).map(function (s) {
          return el('li', null, [s.kind ? TAP.format.kind(s.kind).text + ' · ' : '', addressOf(s)]);
        }))
      ]);
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
      return el('article', { class: 'tap-ins__item' + (hid ? ' is-hidden' : ''), 'data-insight': x.id }, [
        el('div', { class: 'tap-ins__badges' }, [
          el('span', { class: 'tap-badge tap-ins__label' }, x.label || t('label')),
          hid ? el('span', { class: 'tap-badge tap-ins__hiddenbadge' }, t('hiddenBadge')) : null
        ]),
        TAP.dom.html(el('p', { class: 'tap-ins__sentence' }), TAP.content.mark(x.sentence, {})),
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

    // Redraws everything and puts focus back on the control that was used.
    function draw() {
      var a = document.activeElement, focusKey = a && page.contains(a) ? a.getAttribute('data-key') : null;
      TAP.dom.clear(page);
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
        el('p', { class: 'tap-ins__intro' }, list.length === 1 ? t('introOne') : t('intro', { n: list.length })),
        el('p', { class: 'tap-ins__scope' }, t('scope', { sentence: TAP.scope.sentence(cmp()) }))
      ]));
      page.appendChild(filters(list, families));
      page.appendChild(summary(shown.length, list.length));
      families.forEach(function (f) {
        var inF = shown.filter(function (x) { return x.family === f; });
        if (inF.length) page.appendChild(group(f, inF));
      });
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

    var off = TAP.store.on(function (state, changed) {
      if (!root.isConnected) { off(); return; }   // off the page (removed without destroy()): stop listening
      if (has(changed, 'cmp') || has(changed, 'hiddenInsights')) { ui.status = ''; draw(); }
    });
    draw();
    return { destroy: function () { off(); TAP.dom.clear(root); } };
  }

  // The menu title comes from config/views.js
  TAP.views.register('insights', { mount: mount, copyText: copyText });
})(window.TAP);
