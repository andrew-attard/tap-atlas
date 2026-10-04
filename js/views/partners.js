/*
 * File: js/views/partners.js
 * Purpose: The Partners view: reliance on partners and alliances, partner capacity and the partner list (Epic 2.3),
 *          under the shared view header, laid out like the Customer growth view.
 * Provides: view 'partners' (registered with TAP.views)
 * Depends on: js/views/customers.js (TAP.cgpLayout, at call time), js/ui/view-head.js, js/panel/panel.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 * Owner: CGP stream (#209)
 */
(function (TAP) {
  'use strict';
  TAP.views.register('partners', { title: 'Partners', mount: function (root) { return TAP.cgpLayout.mount(root, 'partners', 'partnerView'); } });
})(window.TAP);
