/*
 * File: js/ui/tour.js
 * Purpose: The optional guided welcome tour of the screen (US-1.1.11, US-2.6.3): a welcome card offered once, then
 *          at most ten short steps that spotlight each part of the screen in turn. A few lines of custom code, no library.
 * Provides: TAP.tour (offer, start, stop, steps, fullscreen)
 * Depends on: js/core/storage.js, js/core/content.js, js/core/dom.js, js/core/icons.js, js/core/store.js,
 *             js/ui/shell.js (actionsEl), js/ui/layers.js (close)
 * Used by: js/ui/app.js (offer, after start-up), js/views/guide.js (start)
 *
 * offer() adds the "Take the tour" button to the top bar and shows the welcome card unless the tour was taken or
 * skipped before (remembered with TAP.storage, so a browser that blocks storage sees the card each time), a chart
 * is expanded, or the page is full screen. Returns true when the card is shown. Step wording: content/text-pages.js.
 */
(function (TAP) {
  'use strict';

  var DONE = 'tour:done';
  // Step ids (the wording keys) and the part of the screen each one spotlights, in the order of the stories.
  // US-2.6.3 adds one step for the Phase 2 views and one for the region profile; keep the tour to 10 steps or fewer.
  var STEPS = [
    { id: 'purpose', sel: '[data-tour="brand"]' },
    { id: 'menu', sel: '[data-tour="menu"]' },
    { id: 'views', sel: '.tap-menu__item[data-view="newBusiness"], [data-tour="menu"]' },
    { id: 'profile', sel: '.tap-view a[href^="#regions/"], .tap-menu__item[data-view="regions"]' },
    { id: 'compare', sel: '[data-tour="compare"]' },
    { id: 'panel', sel: '[data-tour="panel"] .tap-panel__head, [data-tour="panel"]' },
    { id: 'freshness', sel: '[data-tour="datadate"]' },
    { id: 'glossary', sel: '.tap-view .tap-term, .tap-menu__item[data-view="guide"]' },
    { id: 'guide', sel: '.tap-menu__item[data-view="guide"]' }
  ];
  var GAP = 16, PAD = 6;

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text('tourUi.' + key, vars); };
  var cur = null;        // {node, card, hole, n, back} while a card or step is on screen

  function steps() {
    var app = TAP.content.text('app.name');
    return STEPS.map(function (s) {
      return { id: s.id, sel: s.sel, title: t('titles.' + s.id), text: TAP.content.text('tour.' + s.id, { app: app }) };
    });
  }

  function fullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

  function remember() { TAP.storage.set(DONE, true); }

  /* ---------- keys and cleanup ---------- */

  // Capture phase, so the tour's keys win over the expanded chart's arrows and the side panel's Esc.
  // Popovers registered earlier still see Esc first (US Esc order: popovers, then the tour, then side panels).
  function onKey(e) {
    if (!cur) return;
    var k = e.key;
    if (k === 'Escape') stop();
    else if (cur.n == null) return;
    else if (k === 'ArrowRight') go(cur.n + 1);
    else if (k === 'ArrowLeft') go(Math.max(0, cur.n - 1));
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  function onMove() { if (cur && cur.n != null) place(cur.n); }

  function stop() {
    if (!cur) return;
    var back = cur.back;
    if (cur.node.parentNode) cur.node.parentNode.removeChild(cur.node);
    cur = null;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onMove);
    remember();
    if (back && back.isConnected && back.focus) back.focus();
  }

  function show(node) {
    var a = document.activeElement;
    stop();
    cur = { node: node, n: null, back: a && a !== document.body ? a : null };
    document.body.appendChild(node);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onMove);
  }

  /* ---------- the welcome card ---------- */

  function card() {
    var take = el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-tour__take', onclick: function () { remember(); start(); } }, t('take'));
    var node = el('div', { class: 'tap-tour-welcome' }, el('div', {
      class: 'tap-tour-welcome__card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tap-tour-welcome-title'
    }, [
      el('p', { class: 'tap-tour__kicker' }, t('welcome')),
      el('h2', { class: 'tap-tour-welcome__title', id: 'tap-tour-welcome-title' }, TAP.content.text('app.name')),
      el('p', { class: 'tap-tour-welcome__text' }, t('welcomeText')),
      el('p', { class: 'tap-tour-welcome__hint' }, t('welcomeHint')),
      el('div', { class: 'tap-tour__buttons' }, [
        take, el('button', { type: 'button', class: 'tap-btn tap-tour__skipcard', onclick: stop }, t('skip'))
      ])
    ]));
    show(node);
    take.focus();
  }

  // The replay button in the top bar, added once per shell.
  function addButton() {
    var slot;
    try { slot = TAP.shell.actionsEl(); } catch (e) { return; }
    if (slot.querySelector('.tap-tour__button')) return;
    slot.appendChild(el('button', { type: 'button', class: 'tap-btn tap-tour__button', onclick: function () { start(); } },
      [TAP.icons.svg('help', { size: 18 }), t('button')]));
  }

  function offer() {
    addButton();
    if (TAP.storage.get(DONE, false)) return false;
    if (TAP.store.get().expanded || TAP.tour.fullscreen()) return false;   // never interrupt a presentation
    card();
    return true;
  }

  /* ---------- the steps ---------- */

  // The spotlit part, or null when it isn't on screen (the step then shows in the middle, without a spotlight).
  // Selectors separated by commas are tried in turn, so the first one is preferred.
  function target(step) {
    var parts = step.sel.split(',');
    for (var i = 0; i < parts.length; i++) {
      var hit = TAP.dom.qsa(parts[i]).filter(function (n) { var r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; })[0];
      if (hit) return hit;
    }
    return null;
  }

  // Brings a part that is off screen up to just below the sticky top bar, leaving room for the card.
  function reveal(node) {
    var r = node.getBoundingClientRect(), stack = document.querySelector('.tap-stack');
    var top = stack ? Math.max(0, stack.getBoundingClientRect().bottom) : 0;
    if (r.top >= top && r.bottom <= window.innerHeight) return;
    window.scrollBy(0, r.top - top - GAP);
  }

  // Puts the spotlight round the part and the card below it, or above it when there is no room below.
  function place(n) {
    var node = target(steps()[n]), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var w = Math.min(460, vw - 2 * GAP), c = cur.card, hole = cur.hole;
    c.style.width = w + 'px';
    cur.shade.hidden = !!node;   // without a part to spotlight, the whole page is shaded instead
    if (!node) {
      hole.hidden = true;
      hole.classList.remove('tap-tour__hole');
      c.style.left = Math.max(GAP, (vw - w) / 2) + 'px';
      c.style.top = Math.max(GAP, (vh - c.offsetHeight) / 2) + 'px';
      return;
    }
    var r = node.getBoundingClientRect(), h = Math.min(r.height, vh - Math.max(r.top, 0) - GAP);
    hole.hidden = false;
    hole.classList.add('tap-tour__hole');
    hole.style.left = (r.left - PAD) + 'px';
    hole.style.top = (r.top - PAD) + 'px';
    hole.style.width = (r.width + 2 * PAD) + 'px';
    hole.style.height = (h + 2 * PAD) + 'px';
    var below = r.top + h + PAD + GAP, above = r.top - PAD - GAP - c.offsetHeight;
    var top = below + c.offsetHeight <= vh ? below : above >= GAP ? above : Math.max(GAP, vh - c.offsetHeight - GAP);
    c.style.left = Math.max(GAP, Math.min(r.left, vw - w - GAP)) + 'px';
    c.style.top = top + 'px';
  }

  function go(n) {
    var all = steps();
    if (n >= all.length) { stop(); return; }
    var s = all[n], last = n === all.length - 1;
    cur.n = n;
    var c = cur.card;
    c.setAttribute('data-step', String(n + 1));
    TAP.dom.clear(c);
    var next = el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-tour__next', onclick: function () { go(n + 1); } },
      last ? t('finish') : t('next'));
    TAP.dom.append(c, [
      el('p', { class: 'tap-tour__kicker' }, t('step', { n: n + 1, total: all.length })),
      el('h2', { class: 'tap-tour__title', id: 'tap-tour-title' }, s.title),
      el('p', { class: 'tap-tour__text' }, s.text),
      last ? el('button', { type: 'button', class: 'tap-btn tap-tour__guide',
        onclick: function () { stop(); TAP.store.set({ view: 'guide' }); } }, [t('openGuide'), TAP.icons.svg('arrow', { size: 18 })]) : null,
      el('div', { class: 'tap-tour__foot' }, [
        el('button', { type: 'button', class: 'tap-tour__skip', onclick: stop }, t('skipTour')),
        el('span', { class: 'tap-tour__keys' }, t('keys')),
        el('div', { class: 'tap-tour__buttons' }, [
          n > 0 ? el('button', { type: 'button', class: 'tap-btn tap-tour__back', onclick: function () { go(n - 1); } }, t('back')) : null,
          next
        ])
      ])
    ]);
    var node = target(s);
    if (node) reveal(node);
    place(n);
    next.focus();
  }

  // Starts on the Overview with nothing expanded or open, so every step finds its part of the screen.
  function start() {
    var s = TAP.store.get();
    if (s.expanded) TAP.store.set({ expanded: null });
    if (s.view !== 'overview' && TAP.views.get('overview')) TAP.store.set({ view: 'overview' });
    try { TAP.layers.close(); } catch (e) { /* no side panel */ }
    var hole = el('div', { class: 'tap-tour__hole', 'aria-hidden': 'true' });
    var c = el('div', { class: 'tap-tour__card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tap-tour-title', 'aria-live': 'polite' });
    var shade = el('div', { class: 'tap-tour__shade', 'aria-hidden': 'true' });
    var node = el('div', { class: 'tap-tour', 'aria-label': t('label') }, [shade, hole, c]);
    show(node);
    cur.card = c;
    cur.hole = hole;
    cur.shade = shade;
    go(0);
  }

  TAP.tour = { offer: offer, start: start, stop: stop, steps: steps, fullscreen: fullscreen };
})(window.TAP);
