/*
 * File: js/views/insights-filters.js
 * Purpose: The Insights page's counts and filter (D126): insights to discuss counted apart from background facts
 *          (D111) in the intro, the shown line and every filter option, and the family filter as a dropdown
 *          multi-select. The regions are chosen in the comparison bar alone (D146: the page's own Regions
 *          dropdown repeated that choice and was dropped).
 * Provides: TAP.insightsFilters (intro, shown, bar)
 * Depends on: js/ui/multi-select.js, js/core/dom.js, js/core/content.js
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
   * The family dropdown and its hint on one line. s: {list, families, ui: {families, menu}, redraw}. Each option
   * counts what choosing it would list: every insight of that family within the comparison, as the buttons did.
   */
  function bar(s) {
    var ui = s.ui;
    var families = s.families.map(function (f) {
      return { value: f, label: t('families.' + f + '.name'),
        count: countEl(s.list.filter(function (x) { return x.family === f; })) };
    });
    var menu = TAP.multiSelect.render({ id: 'families', label: t('familiesLabel'), options: families, selected: ui.families,
      open: ui.menu === 'families',
      onOpen: function (open) { ui.menu = open ? 'families' : null; s.redraw(); },
      onChange: function (sel) { ui.families = sel; s.redraw(); } });
    return el('div', { class: 'tap-ins__filters' }, el('div', { class: 'tap-ins__menus' }, [
      menu,
      el('p', { class: 'tap-ins__hint' }, t('filterHint'))
    ]));
  }

  TAP.insightsFilters = { intro: intro, shown: shown, bar: bar };
})(window.TAP);
