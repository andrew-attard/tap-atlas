/*
 * File: js/views/other.js
 * Purpose: The Other sections view: one list per extra template section in the data, shown only when there are any (US-3.2.2).
 * Provides: view 'other' (registered with TAP.views, with available()), TAP.otherSections (definitions, definition)
 * Depends on: js/core/extra.js, js/engine/rows.js, js/ui/view-head.js, js/panel/panel.js, js/core/dom.js,
 *             js/core/content.js (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu), js/ui/keys.js (number keys follow the menu)
 * Owner: EXTRA stream (#238)
 *
 * The data file describes the sections (meta.extraSections), so the list definitions are built here at mount
 * time rather than written in config/: each is a plain list report (ARCHITECTURE 17.4) over the row source
 * "extra:<section id>", sorted by any column and following the comparison like every other list.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('otherView.' + key, vars); }

  // A list report definition for one section: its title, its intro and every column in the order given.
  function definition(s) {
    var source = TAP.extra.sourceOf(s.id), cols = TAP.rows.columns(source), kinds = [];
    cols.forEach(function (c) { if (c.key !== 'region' && kinds.indexOf(c.kind) < 0) kinds.push(c.kind); });
    return {
      id: 'other-' + s.id, view: 'other', title: s.title, intro: s.intro,
      explain: { shows: s.intro || t('shows'), read: t('read'), lookFor: t('lookFor') },
      shape: 'list', builder: 'list', dimension: 'entity', rows: source,
      columns: cols.map(function (c) { return { key: c.key }; }),
      defaultType: 'list', types: ['list'], breakdowns: [], sources: kinds, options: {}
    };
  }

  function definitions() { return TAP.extra.sections().map(definition); }

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-other', 'data-view': 'other' });
    root.appendChild(page);
    var head = TAP.viewHead.render(page, { viewId: 'other', kicker: t('kicker'), title: t('title'), lead: t('lead') });
    var panels = [];
    definitions().forEach(function (def) {
      var slot = el('div', { class: 'tap-vh-slot', 'data-slot': def.id });
      // The intro sits above its list: the panel draws only the title
      page.appendChild(el('section', { class: 'tap-other__section', 'aria-label': def.title }, [
        def.intro ? el('p', { class: 'tap-other__intro' }, def.intro) : null, slot
      ]));
      panels.push(TAP.viewHead.mountPanel(slot, def));
    });
    return { destroy: function () {
      panels.forEach(function (p) { if (p && p.destroy) p.destroy(); });
      head.destroy();
    } };
  }

  TAP.otherSections = { definitions: definitions, definition: definition };
  // Only in the menu (and on a number key) when the data has an extra section
  TAP.views.register('other', { title: 'Other sections', mount: mount, available: function () { return !!TAP.extra && TAP.extra.any(); } });
})(window.TAP);
