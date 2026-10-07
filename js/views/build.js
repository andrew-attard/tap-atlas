/*
 * File: js/views/build.js
 * Purpose: The Build a chart view (US-3.5.1, D96): the standard view header, then the custom chart builder with its
 *          pickers, panel and session list (US-3.5.3). In the menu just before the Guide, at the right end of the bar.
 * Provides: view 'build' (registered with TAP.views)
 * Depends on: js/engine/registry.js, js/ui/view-head.js, js/ui/custom-builder.js, js/core/dom.js, js/core/content.js
 *             (all at call time)
 * Used by: js/ui/app.js, js/ui/shell.js (menu), js/ui/keys.js (number keys follow the menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key) { return TAP.content.text('custom.' + key); }

  function mount(root) {
    TAP.dom.clear(root);
    var page = el('div', { class: 'tap-vh-page tap-build', 'data-view': 'build' });
    // On the page before the builder draws, so its panel is drawn at once
    root.appendChild(page);
    // The builder's own lead line moves up into the header
    var head = TAP.viewHead.render(page, { viewId: 'build', kicker: t('heading'), title: t('viewTitle'), lead: t('lead') });
    var builder = TAP.customBuilder.render(page, { lead: false });
    return { destroy: function () {
      builder.destroy();
      head.destroy();
      TAP.dom.clear(root);
    } };
  }

  // The menu title comes from config/views.js
  TAP.views.register('build', { mount: mount });
})(window.TAP);
