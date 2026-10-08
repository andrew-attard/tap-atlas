/*
 * File: js/views/insights-filters.js
 * Purpose: The Insights page's counts and filters (D126): insights to discuss counted apart from background facts
 *          (D111) in the intro, the shown line and every filter option, and the region and family filters as two
 *          dropdown multi-selects on one line.
 * Provides: TAP.insightsFilters (intro, shown, bar)
 * Depends on: js/ui/multi-select.js, js/core/dom.js, js/core/content.js, js/core/data.js, js/engine/scope.js
 * Used by: js/views/insights.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('insightsPage.' + key, vars); }

  // How many of a list are insights to discuss and how many background facts.
  function split(list) {
    var bg = list.filter(function (x) { return x.context; }).length;
    return { ins: list.length - bg, bg: bg };
  }
  function insightWords(n) { return n === 1 ? t('countOne') : t('count', { n: n }); }
  function factWords(n) { return n === 1 ? t('factCountOne') : t('factCount', { n: n }); }

  // "41 insights to discuss, plus 18 background facts, found by fixed rules..."
  function intro(list) {
    var c = split(list);
    return c.bg ? t('intro', { insights: insightWords(c.ins), facts: factWords(c.bg) }) : t('introNoFacts', { insights: insightWords(c.ins) });
  }

  // "Showing 41 insights and 18 background facts", or "Showing 12 of 41 insights and 3 of 18 background facts".
  function shown(part, list, filtered) {
    var p = split(part), all = split(list);
    function of(n, total, words) { return filtered ? t('shownOf', { n: n, total: words(total) }) : words(total); }
    var ins = of(p.ins, all.ins, insightWords);
    return all.bg ? t('shownBoth', { insights: ins, facts: of(p.bg, all.bg, factWords) }) : t('shownInsights', { insights: ins });
  }

  // An option's count: the insights first, then "+N background", smaller and muted; a family with only
  // background facts reads "+5 background".
  function countEl(list) {
    var c = split(list), showIns = c.ins > 0 || !c.bg;
    return el('span', { class: 'tap-ins__cnt', 'data-insights': String(c.ins), 'data-background': String(c.bg) }, [
      showIns ? el('span', { class: 'tap-ins__n' }, String(c.ins)) : null,
      showIns && c.bg ? ' ' : null,
      c.bg ? el('span', { class: 'tap-ins__bg' }, (showIns ? '· ' : '') + t('countBackground', { n: c.bg })) : null
    ]);
  }

  /*
   * The two dropdowns on one line. s: {list, families, inScope, ui: {regions, families, menu}, byRegion, byFamily,
   * redraw}. Each option counts what choosing it would list, within the other filter, as the buttons did.
   */
  function bar(s) {
    var ui = s.ui;
    function menu(id, label, options, key) {
      return TAP.multiSelect.render({ id: id, label: label, options: options, selected: ui[key], open: ui.menu === id,
        onOpen: function (open) { ui.menu = open ? id : null; s.redraw(); },
        onChange: function (sel) { ui[key] = sel; s.redraw(); } });
    }
    var regions = s.inScope.map(function (id) {
      return { value: id, label: TAP.content.regionName(TAP.data.region(id)), color: TAP.scope.colorOf(id),
        count: countEl(s.list.filter(function (x) { return s.byFamily(x) && x.regionIds.indexOf(id) >= 0; })) };
    });
    var families = s.families.map(function (f) {
      return { value: f, label: t('families.' + f + '.name'),
        count: countEl(s.list.filter(function (x) { return s.byRegion(x) && x.family === f; })) };
    });
    return el('div', { class: 'tap-ins__filters' }, el('div', { class: 'tap-ins__menus' }, [
      menu('regions', t('regionsLabel'), regions, 'regions'),
      menu('families', t('familiesLabel'), families, 'families'),
      el('p', { class: 'tap-ins__hint' }, t('filterHint'))
    ]));
  }

  TAP.insightsFilters = { intro: intro, shown: shown, bar: bar };
})(window.TAP);
