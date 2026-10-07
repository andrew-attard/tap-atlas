/*
 * File: js/engine/scope.js
 * Purpose: Turns the comparison setting into the regions and combined figures a chart should draw, with the
 *          colour each one takes by its role (US-1.1.6) and the plain sentence describing it (US-1.1.3).
 * Provides: TAP.scope (entities, sentence, regionIds, colorOf, upgrade)
 * Depends on: js/core/data.js, js/theme.js, js/core/content.js, js/core/format.js, js/core/store.js, config/settings.js
 * Used by: prepare, the tier grid and quadrant, cards, the comparison bar, panels, details, explanations, the data
 *          sources panel, insights and every view
 */
(function (TAP) {
  'use strict';

  function theme() { return window.TAP_THEME; }
  function ids() { return TAP.data.regions().map(function (r) { return r.id; }); }
  function known(id) { return id != null && TAP.data.regionIndex(id) >= 0; }
  function name(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function regionsWord(n) { return TAP.content.text(n === 1 ? 'combined.region' : 'combined.regions'); }
  function counted(n) { return { n: n, regions: regionsWord(n) }; }
  // A wording key, or its singular form ("...One") when the count is 1: "the other region", not "the other 1 region"
  function one(key, n) { return n === 1 ? key + 'One' : key; }

  // Distinct colours available: the palette, or fewer if the settings say colours repeat sooner.
  function paletteSize() {
    var p = theme().regions.length, s = window.TAP_SETTINGS && window.TAP_SETTINGS.regionColours;
    return s > 0 ? Math.min(p, s) : p;
  }

  // Past the palette, colours repeat. Labels still name every region; the note goes to the data sources panel.
  function noteIfRepeating() {
    var n = TAP.data.regions().length, k = paletteSize();
    if (n > k) TAP.notes.add({ source: 'colours', message: TAP.content.text('scope.coloursRepeat', { n: n, k: k }) });
  }

  // A region's fixed colour, by its position in the data file.
  function colorOf(regionId) {
    var i = TAP.data.regionIndex(regionId);
    if (i < 0) return theme().muted;
    noteIfRepeating();
    return theme().regionColor(i % paletteSize());
  }

  function regionEntity(id, role) {
    return { id: id, kind: 'region', regionIds: [id], how: null, role: role,
      color: role === 'muted' ? theme().focusGrey : colorOf(id), label: name(id) };
  }

  function combinedEntity(id, regionIds, how, label) {
    return { id: id, kind: 'combined', regionIds: regionIds, how: how, role: 'combined', color: theme().combined, label: label };
  }

  // Works out what is actually drawn: the mode after any fallback, and the entities in display order
  // (ARCHITECTURE section 8). An incomplete setting (unknown focus, empty set) falls back to all regions, so a
  // chart is never empty because of the comparison bar, and the sentence then says "all regions" too.
  function resolve(cmp) {
    cmp = cmp || TAP.store.get().cmp;
    var all = ids();
    noteIfRepeating();

    if ((cmp.mode === 'one' || cmp.mode === 'pair') && known(cmp.focus)) {
      var focus = [regionEntity(cmp.focus, 'focus')];
      var others = all.filter(function (id) { return id !== cmp.focus; });
      if (cmp.mode === 'pair') {
        if (!known(cmp.second) || cmp.second === cmp.focus) return { mode: 'focusOnly', list: focus };
        return { mode: 'pair', list: focus.concat([regionEntity(cmp.second, 'second')]) };
      }
      if (!others.length) return { mode: 'focusOnly', list: focus };
      if (cmp.restAs === 'individual') {
        return { mode: 'oneIndividual', list: focus.concat(others.map(function (id) { return regionEntity(id, 'muted'); })) };
      }
      var how = cmp.restAgg === 'total' ? 'total' : 'average';
      var label = TAP.content.text(one(how === 'total' ? 'combined.restTotal' : 'combined.restAverage', others.length), counted(others.length));
      return { mode: how === 'total' ? 'oneTotal' : 'oneAverage', list: focus.concat([combinedEntity('rest', others, how, label)]) };
    }
    if (cmp.mode === 'set') {
      var chosen = all.filter(function (id) { return (cmp.set || []).indexOf(id) >= 0; });
      if (chosen.length) return { mode: 'set', list: chosen.map(function (id) { return regionEntity(id, 'region'); }) };
    }
    if (cmp.mode === 'org' && all.length) {
      return { mode: 'org', list: [combinedEntity('org', all, 'total', TAP.content.text(one('combined.org', all.length), counted(all.length)))] };
    }
    return { mode: 'all', list: all.map(function (id) { return regionEntity(id, 'region'); }) };
  }

  function entities(cmp) { return resolve(cmp).list; }

  // The plain sentence for the comparison, built from what is actually drawn.
  function sentence(cmp) {
    var r = resolve(cmp), es = r.list, t = TAP.content.text;
    var focus = es[0] && es[0].role === 'focus' ? es[0] : null;
    switch (r.mode) {
      case 'org': return t(one('scope.org', es[0].regionIds.length), counted(es[0].regionIds.length));
      case 'oneAverage': case 'oneTotal':
        return t(one('scope.' + r.mode, es[1].regionIds.length), Object.assign({ focus: focus.label }, counted(es[1].regionIds.length)));
      case 'oneIndividual': return t(one('scope.oneIndividual', es.length - 1), Object.assign({ focus: focus.label }, counted(es.length - 1)));
      case 'pair': return t('scope.pair', { focus: focus.label, second: es[1].label });
      case 'focusOnly': return t('scope.focusOnly', { focus: focus.label });
      case 'set':
        if (es.length === 1) return t('scope.setOne', { name: es[0].label });
        return t('scope.set', Object.assign({ names: TAP.format.list(es.map(function (e) { return e.label; })) }, counted(es.length)));
      default: return t(one('scope.all', es.length), counted(es.length));
    }
  }

  // Every region in scope, in file order.
  function regionIds(cmp) {
    var inScope = {};
    entities(cmp).forEach(function (e) { e.regionIds.forEach(function (id) { inScope[id] = true; }); });
    return ids().filter(function (id) { return inScope[id]; });
  }

  // "One vs one" ('pair') left the screen (D99). An old setting that names it (an address, a presentation step, a
  // recorded step) is read as a selection of its regions, in file order; without a valid second region, the focus
  // alone. Any other comparison is returned as it is.
  function upgrade(cmp) {
    if (!cmp || cmp.mode !== 'pair') return cmp;
    var named = [cmp.focus].concat(cmp.second !== cmp.focus ? [cmp.second] : []);
    var set = ids().filter(function (id) { return named.indexOf(id) >= 0; });
    return Object.assign({}, cmp, { mode: 'set', set: set, second: null });
  }

  TAP.scope = { entities: entities, sentence: sentence, regionIds: regionIds, colorOf: colorOf, upgrade: upgrade };
})(window.TAP);
