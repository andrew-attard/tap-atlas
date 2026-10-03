/*
 * File: js/views/overview.js
 * Purpose: The Overview view: headline, top insights, region cards and the ambition chart (US-1.5.2), redrawn as
 *          soon as the comparison changes.
 * Provides: view 'overview' (registered with TAP.views)
 * Depends on: js/engine/registry.js, js/core/dom.js, js/core/store.js, js/views/overview-cards.js,
 *             js/panel/panel.js, content/text-overview.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('overview.' + key, vars); };

  // The ambition panel. A panel that isn't built yet shows its own message, so the rest of the view still works.
  function mountPanel(host) {
    try {
      return TAP.panel.create(host, 'ov-ambition', {});
    } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
      TAP.dom.clear(host);
      host.appendChild(el('p', { class: 'tap-stub' }, e.message));
      return null;
    }
  }

  function sectionHead(title, aside) {
    return el('div', { class: 'tap-ov__sechead' }, [el('h2', null, title), aside]);
  }

  function mount(root) {
    TAP.dom.clear(root);
    var headline = el('div', { class: 'tap-ov__headline', 'data-part': 'headline' },
      el('h1', { class: 'tap-ov__title' }, t('title')));
    var insights = el('section', { class: 'tap-ov__insights', 'data-part': 'insights' });
    var cardsHost = el('div', { class: 'tap-ov-cards' });
    var hint = el('span', { class: 'tap-ov__hint' });
    var cards = el('section', { class: 'tap-ov__cards', 'data-part': 'cards', 'aria-label': t('cards.title') },
      [sectionHead(t('cards.title'), hint), cardsHost]);
    var panelHost = el('div', { class: 'tap-ov__panel', 'data-part': 'panel', 'data-report': 'ov-ambition' });
    root.appendChild(el('div', { class: 'tap-ov' }, [headline, insights, cards, panelHost]));

    function drawCards() {
      TAP.overviewCards.render(cardsHost);
      var combinedOnly = TAP.scope.entities(TAP.store.get().cmp).every(function (e) { return e.kind === 'combined'; });
      TAP.dom.text(hint, t(combinedOnly ? 'cards.hintCombined' : 'cards.hint'));
    }
    drawCards();
    var panel = mountPanel(panelHost);

    var off = TAP.store.on(function (state, changed) {
      if (changed.indexOf('cmp') >= 0) drawCards();
    });
    // Keeps the card rows even when the window or zoom changes.
    var ro = window.ResizeObserver ? new window.ResizeObserver(function () { TAP.overviewCards.layout(cardsHost); }) : null;
    if (ro) ro.observe(cardsHost);

    return {
      destroy: function () {
        off();
        if (ro) ro.disconnect();
        if (panel && panel.destroy) panel.destroy();
      }
    };
  }

  TAP.views.register('overview', { title: 'Overview', mount: mount });
})(window.TAP);
