/*
 * File: js/ui/custom-controls.js
 * Purpose: The controls of Build a chart (D140): "What do you want to see?" (Compare regions, Break one region down,
 *          See the plan years), the Region dropdown and By choice of one region, the measure picker (D122) filtered
 *          by the choice, and "Show as" (Bar or Table). Also fits a choice to what the data offers.
 * Provides: TAP.customControls (render, fit, choices, listFor, presetRegion, START)
 * Depends on: js/engine/custom.js, js/ui/custom-measure-picker.js, js/panel/panel-menus.js (seg, select), js/core/dom.js,
 *             content.js, format.js, js/core/data.js, js/core/store.js, js/engine/scope.js, js/engine/shapes.js (kit.lower) (all at call time)
 * Used by: js/ui/custom-builder.js
 * Owner: CUSTOM stream
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('custom.' + key, vars); }
  function lower(s) { return TAP.shapes.kit.lower(s); }   // mid-sentence lower case, acronyms kept (one copy, in the kit)

  var START = { ask: 'regions', measure: 'nb.hitRate', by: 'entity', type: 'bar' };   // a first chart that reads at once: hit rate by region

  // What a figure can be shown by, in words: its dimensions, or "region" when it has none.
  function byWords(list) {
    var dims = list.filter(function (b) { return b !== 'entity'; });
    return TAP.format.list((dims.length ? dims : ['entity']).map(function (b) { return lower(TAP.custom.byLabel(b)); }));
  }

  /*
   * The measures to pick from: every option that can be shown by something. A per-industry copy of a figure that
   * adds nothing (same name, fewer choices, e.g. "Current ARR" per industry) is left out; two different figures
   * that share a name are told apart by what they can be shown by. Figures with more choices are looked at first,
   * so the result doesn't depend on the catalogue's order; the list keeps the catalogue's order.
   */
  function choices() {
    var out = [], opts = TAP.custom.options(), pos = {};
    opts.forEach(function (o, i) { pos[o.measureId] = i; });
    opts.slice().sort(function (a, b) { return b.by.length - a.by.length || pos[a.measureId] - pos[b.measureId]; }).forEach(function (o) {
      if (!o.by.length) return;
      var same = out.filter(function (x) { return x.label === o.label; });
      if (same.some(function (x) { return o.by.every(function (b) { return x.by.indexOf(b) >= 0; }); })) return;
      var c = { id: o.measureId, label: o.label, by: o.by, group: o.valueKind, clash: same.length > 0 };
      same.forEach(function (x) { x.clash = true; });
      out.push(c);
    });
    out.forEach(function (c) { c.text = c.clash ? t('measureBy', { measure: c.label, by: byWords(c.by) }) : c.label; });
    return out.sort(function (a, b) { return pos[a.id] - pos[b.id]; });
  }

  // The measures that fit a question: with a region total, with a dimension to break down by, or with plan years.
  function listFor(all, ask) { return all.filter(function (c) { return TAP.custom.fits(c.by, ask); }); }

  // The region "Break one region down" starts from: the one region the comparison bar shows, else the first in the data.
  function presetRegion() {
    var es = TAP.scope.entities(TAP.store.get().cmp), first = TAP.data.regions()[0];
    var one = es.length === 1 && es[0].kind === 'region' ? es[0].regionIds[0] : null;
    return one || (first ? first.id : null);
  }

  // The first measure of a topic within a list: its first key measure, else its first measure.
  function firstOf(list, topic) {
    var tp = TAP.customPicker.topics(list).filter(function (x) { return x.id === topic; })[0];
    return tp ? (tp.key[0] || tp.items[0]) : null;
  }

  /*
   * The nearest choice the data allows: the question (an older spec's dimension implies it), the measure if it fits
   * the question, else the first of the topic on screen, else the story's example; the dimension if the measure
   * still has it; Bar or Table; and a region, kept in memory for every question so switching back finds it again.
   * Returns null when nothing can be charted.
   */
  function fit(spec, all, topic) {
    spec = spec || START;
    var ask = TAP.custom.askOf(spec), list = listFor(all, ask);
    var m = list.filter(function (x) { return x.id === spec.measure; })[0] ||
      firstOf(list, topic || TAP.customPicker.topicOf(spec.measure || START.measure)) ||
      list.filter(function (x) { return x.id === START.measure; })[0] || list[0];
    if (!m) return null;
    var bys = TAP.custom.byFor(m.by, ask), by = bys.indexOf(spec.by) >= 0 ? spec.by : bys[0];
    var region = spec.region && TAP.data.region(spec.region) ? spec.region : presetRegion();
    return { ask: ask, measure: m.id, by: by, type: spec.type === 'table' ? 'table' : 'bar', region: region };
  }

  function field(label, control, note) {
    return el('div', { class: 'tap-custom__field' }, [el('span', { class: 'tap-custom__label' }, label), control, note || null]);
  }

  // Step 1: the three questions, each a button with its name and a line of help (never hover-only, D24).
  function asks(cur, on) {
    return el('div', { class: 'tap-custom__asks', role: 'group', 'aria-label': t('ask.label'), 'data-control': 'custom-ask' },
      TAP.custom.ASKS.map(function (ask) {
        return el('button', { type: 'button', class: 'tap-custom__ask', 'data-value': ask, 'aria-pressed': String(ask === cur.ask),
          onclick: function () { on({ ask: ask }); } }, [
          el('span', { class: 'tap-custom__ask-label' }, t('ask.' + ask + '.label')),
          el('span', { class: 'tap-custom__ask-help' }, t('ask.' + ask + '.help'))
        ]);
      }));
  }

  // The Region dropdown of "Break one region down", with the note that the comparison bar is ignored.
  function region(cur, on) {
    var opts = TAP.data.regions().map(function (r) { return { value: r.id, label: TAP.content.regionName(r) }; });
    var sel = TAP.panelMenus.select('custom-region', t('region.label'), cur.region, opts, function (v) { on({ region: v }); });
    sel.setAttribute('data-custom', 'region');
    return field(t('region.label'), sel, el('span', { class: 'tap-custom__region-note' }, t('region.note')));
  }

  /*
   * Draws the controls into box for the fitted choice cur: the question, for one region its Region and By, the
   * measure picker (its state pick: topic, "Show all", search) narrowed to the question, then Show as.
   * on(patch) is called with the change.
   */
  function render(box, cur, all, pick, on) {
    var m = all.filter(function (c) { return c.id === cur.measure; })[0], seg = TAP.panelMenus.seg, parts = [];
    parts.push(field(t('ask.label'), asks(cur, on)));
    if (cur.ask === 'one') {
      parts.push(region(cur, on));
      parts.push(field(t('byPicker'), seg('custom-by', t('byPicker'), cur.by, TAP.custom.byFor(m.by, cur.ask).map(function (b) {
        return { value: b, label: TAP.custom.byLabel(b) };
      }), function (v) { on({ by: v }); })));
    }
    parts.push(TAP.customPicker.render(listFor(all, cur.ask), cur.measure, pick, function (id) { on({ measure: id }); }));
    parts.push(field(t('showAs'), seg('custom-type', t('showAs'), cur.type, [
      { value: 'bar', label: t('showAsBar') }, { value: 'table', label: t('showAsTable') }
    ], function (v) { on({ type: v }); })));
    TAP.dom.append(box, parts);
  }

  TAP.customControls = { render: render, fit: fit, choices: choices, listFor: listFor, presetRegion: presetRegion, START: START };
})(window.TAP);
