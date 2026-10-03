/*
 * File: js/engine/scope.js
 * Purpose: Turns the comparison setting into the regions and combined figures a chart should draw, with the
 *          colour each one takes by its role (US-1.1.6) and the plain sentence describing it (US-1.1.3).
 * Provides: TAP.scope (entities, sentence, regionIds, colorOf)
 * Depends on: js/core/data.js, js/theme.js, js/core/content.js, js/core/format.js, js/core/store.js, config/settings.js
 * Used by: prepare, builders, cards, the comparison bar, insights
 */
(function (TAP) {
  'use strict';

  function theme() { return window.TAP_THEME; }
  function ids() { return TAP.data.regions().map(function (r) { return r.id; }); }
  function known(id) { return id != null && TAP.data.regionIndex(id) >= 0; }
  function name(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function regionsWord(n) { return TAP.content.text(n === 1 ? 'combined.region' : 'combined.regions'); }
  function counted(n) { return { n: n, regions: regionsWord(n) }; }

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

  // The things a chart draws, in display order (ARCHITECTURE section 8). An incomplete setting (unknown focus,
  // empty set) falls back to all regions, so a chart is never empty because of the comparison bar.
  function entities(cmp) {
    cmp = cmp || TAP.store.get().cmp;
    var all = ids();
    noteIfRepeating();

    if (cmp.mode === 'one' && known(cmp.focus)) {
      var others = all.filter(function (id) { return id !== cmp.focus; });
      var out = [regionEntity(cmp.focus, 'focus')];
      if (!others.length) return out;
      if (cmp.restAs === 'individual') return out.concat(others.map(function (id) { return regionEntity(id, 'muted'); }));
      var how = cmp.restAgg === 'total' ? 'total' : 'average';
      var label = TAP.content.text(how === 'total' ? 'combined.restTotal' : 'combined.restAverage', counted(others.length));
      return out.concat([combinedEntity('rest', others, how, label)]);
    }
    if (cmp.mode === 'pair' && known(cmp.focus)) {
      var pair = [regionEntity(cmp.focus, 'focus')];
      if (known(cmp.second) && cmp.second !== cmp.focus) pair.push(regionEntity(cmp.second, 'second'));
      return pair;
    }
    if (cmp.mode === 'set') {
      var chosen = all.filter(function (id) { return (cmp.set || []).indexOf(id) >= 0; });
      if (chosen.length) return chosen.map(function (id) { return regionEntity(id, 'region'); });
    }
    if (cmp.mode === 'org' && all.length) {
      return [combinedEntity('org', all, 'total', TAP.content.text('combined.org', counted(all.length)))];
    }
    return all.map(function (id) { return regionEntity(id, 'region'); });
  }

  // The plain sentence for the comparison, built from what is actually drawn.
  function sentence(cmp) {
    cmp = cmp || TAP.store.get().cmp;
    var es = entities(cmp), n = TAP.data.regions().length, t = TAP.content.text;
    var role = function (r) { return es.filter(function (e) { return e.role === r; })[0]; };
    var focus = role('focus'), second = role('second'), rest = role('combined');
    if (rest && rest.id === 'org') return t('scope.org', counted(n));
    if (focus && rest) {
      return t(rest.how === 'total' ? 'scope.oneTotal' : 'scope.oneAverage',
        { focus: focus.label, n: rest.regionIds.length, regions: regionsWord(rest.regionIds.length) });
    }
    if (focus && second) return t('scope.pair', { focus: focus.label, second: second.label });
    if (focus && es.length > 1) return t('scope.oneIndividual', { focus: focus.label, n: es.length - 1, regions: regionsWord(es.length - 1) });
    if (focus) return t('scope.focusOnly', { focus: focus.label });
    if (cmp.mode === 'set' && es.length) {
      return t('scope.set', { n: es.length, regions: regionsWord(es.length),
        names: TAP.format.list(es.map(function (e) { return e.label; })) });
    }
    return t('scope.all', counted(n));
  }

  // Every region in scope, in file order.
  function regionIds(cmp) {
    var inScope = {};
    entities(cmp).forEach(function (e) { e.regionIds.forEach(function (id) { inScope[id] = true; }); });
    return ids().filter(function (id) { return inScope[id]; });
  }

  TAP.scope = { entities: entities, sentence: sentence, regionIds: regionIds, colorOf: colorOf };
})(window.TAP);
