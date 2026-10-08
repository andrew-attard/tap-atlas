/*
 * File: js/views/guide.js
 * Purpose: The Guide view: how to use the app, planning explained, reset charts (US-1.6.1). A sticky contents list
 *          with a search box beside the sections, which are cards in two columns (D139). No glossary list: terms
 *          are defined where they appear (D98).
 * Provides: view 'guide' (registered with TAP.views); TAP.guide (open); TAP.guideExtras (sections other streams add)
 * Depends on: js/engine/registry.js, js/ui/view-head.js (tip), js/core/dom.js, js/core/icons.js, js/core/content.js (guide, text),
 *             js/core/storage.js, js/core/store.js (view, bus), js/ui/tour.js (start), js/views/guide-cards.js
 * Used by: js/ui/app.js, js/ui/shell.js (menu), js/ui/tour.js (open at a section)
 *
 * Every word comes from content/guide.js (sections) and content/text-pages.js (guidePage.*: headings and buttons).
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('guidePage.' + key, vars); }
  function cards() { return TAP.guideCards; }

  var live = null;      // the Guide on screen: { go(id) }
  var pending = null;   // a section to land on as the Guide mounts (TAP.guide.open, #guide/<section>)

  // Clears the remembered chart types; panels listen for charts:reset and redraw with their defaults.
  function resetCharts(status) {
    TAP.storage.clear('chart:');
    TAP.bus.emit('charts:reset');
    TAP.dom.text(status, t('resetDone'));
  }

  function startTour() {
    try { TAP.tour.start(); } catch (e) { if (!/Not built yet/.test(e.message)) throw e; }
  }

  // The intro and the two buttons at the head of "How to use this app".
  function howToHead(g) {
    var status = el('p', { class: 'tap-guide__status', role: 'status', 'aria-live': 'polite' });
    var actions = el('div', { class: 'tap-guide__actions' }, [
      el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-guide__tour', onclick: startTour }, t('tour')),
      el('button', { type: 'button', class: 'tap-btn tap-guide__reset', onclick: function () { resetCharts(status); } },
        [TAP.icons.svg('reset', { size: 18 }), t('reset')])
    ]);
    return [g.intro ? el('p', { class: 'tap-guide__lead' }, g.intro) : null, actions, status];
  }

  // A part: its heading across both columns, then its cards.
  function section(id, title, children) {
    return el('section', { class: 'tap-guide__sec', 'data-guide': id, 'aria-labelledby': 'tap-guide-' + id },
      [el('h2', { class: 'tap-guide__h2', id: 'tap-guide-' + id, tabindex: '-1' }, title)].concat(children));
  }

  // The sticky top bar's height while it sticks (on short windows it scrolls away), plus a gap.
  function barOffset() {
    var stack = document.querySelector('.tap-stack');
    var sticks = !!stack && window.getComputedStyle(stack).position === 'sticky';
    return (sticks ? stack.offsetHeight : 0) + 16;
  }

  // Moves to a section card (or a part), clear of the sticky top bar, opens the card and puts focus on its heading
  // for keyboard users. The scroll is ours, so focus does not scroll again (D110).
  function jump(root, id) {
    var head = root.querySelector('[id="tap-guide-s-' + id + '"]') || root.querySelector('[id="tap-guide-' + id + '"]');
    if (!head) return false;
    var card = head.closest('.tap-guide__card');
    if (card) cards().setOpen(card, true);
    head.style.scrollMarginTop = barOffset() + 'px';
    if (head.scrollIntoView) head.scrollIntoView({ block: 'start' });
    head.focus({ preventScroll: true });
    if (card) cards().markCurrent(root, id);
    return true;
  }

  // Keeps the contents list's mark on the card at the top of the window as the page scrolls. After a jump the mark
  // stays on the card jumped to until the page moves (the last cards can't scroll to the top).
  function tracker(root, page) {
    var frame = 0, held = null;
    function update(force) {
      frame = 0;
      page.style.setProperty('--tap-guide-top', barOffset() + 'px');
      if (!force && held != null && Math.abs(window.scrollY - held) < 4) return;
      held = null;
      var line = barOffset() + 24, best = null, bestTop = -Infinity, first = null;
      TAP.dom.qsa('.tap-guide__card', root).forEach(function (c) {
        if (!c.getClientRects().length) return;   // filtered out by the search
        var top = c.getBoundingClientRect().top;
        first = first || c;
        if (top <= line && top > bestTop + 1) { best = c; bestTop = top; }
      });
      var cur = best || first;
      if (cur) cards().markCurrent(root, cur.getAttribute('data-part'));
    }
    function later() { if (!frame) frame = window.requestAnimationFrame(function () { update(false); }); }
    window.addEventListener('scroll', later, { passive: true });
    window.addEventListener('resize', later);
    return {
      update: update,
      hold: function () { held = window.scrollY; },
      destroy: function () {
        window.removeEventListener('scroll', later);
        window.removeEventListener('resize', later);
        if (frame) window.cancelAnimationFrame(frame);
      }
    };
  }

  // "No section mentions '...'" with a button that clears the search.
  function noMatch(onClear) {
    return el('div', { class: 'tap-guide__nomatch', hidden: true }, [
      el('p', { class: 'tap-guide__nomsg', role: 'status' }),
      el('button', { type: 'button', class: 'tap-btn tap-guide__clear', onclick: onClear }, t('clear'))
    ]);
  }

  // Sections other streams add to the Guide (Phase 3: the running order, US-3.1.3): TAP.guideExtras.push({id, title,
  // render(el)}). Each draws whole into its own card at the end of "How to use this app"; one that fails shows why.
  // render may return {destroy()}, called when the Guide is unmounted.
  TAP.guideExtras = TAP.guideExtras || [];
  function extras(handles) {
    return TAP.guideExtras.map(function (x) {
      var body = el('div', { class: 'tap-guide__extra', 'data-extra': x.id });
      try { handles.push(x.render(body)); } catch (e) { body.appendChild(el('p', { class: 'tap-stub' }, e.message)); }
      return { id: x.id, title: x.title, card: cards().extraCard(x, body) };
    });
  }

  function mount(root) {
    var g = TAP.content.guide(), titles = {}, handles = [], how = g.howTo || {}, plan = g.planning || {};
    (g.contents || []).forEach(function (c) { titles[c.id] = c.title; });
    var own = function (list) { return (list || []).map(function (s) { return { id: s.id, title: s.title, card: cards().card(s) }; }); };
    var parts = [
      { id: 'howTo', title: titles.howTo || how.title, sections: own(how.sections).concat(extras(handles)), head: howToHead(how) },
      { id: 'planning', title: titles.planning || plan.title, sections: own(plan.sections), head: [] }
    ];
    TAP.dom.clear(root);
    var box, none = noMatch(function () { box.value = ''; search(''); box.focus(); });
    var toc = cards().contents(parts, function (id) { go(id); }, function (q) { search(q); });
    box = toc.querySelector('.tap-guide__search');
    var main = el('div', { class: 'tap-guide__main' }, [none].concat(parts.map(function (p) {
      return section(p.id, p.title, p.head.concat(p.sections.map(function (s) { return s.card; })));
    })));
    var page = el('div', { class: 'tap-guide' }, [
      el('header', { class: 'tap-guide__head' }, [
        el('p', { class: 'tap-guide__kicker' }, t('kicker')),
        el('h1', { class: 'tap-guide__h1' }, t('heading')),
        TAP.viewHead.tip('guide')
      ]),
      el('div', { class: 'tap-guide__body' }, [toc, main])
    ]);
    root.appendChild(page);
    var track = tracker(root, page);

    function search(q) {
      var n = cards().filter(root, q), words = String(q || '').trim().replace(/\s+/g, ' ');
      none.hidden = n > 0 || !words;   // shown first, so screen readers hear the message set next
      TAP.dom.text(none.querySelector('.tap-guide__nomsg'), none.hidden ? '' : t('noMatch', { words: words }));
      track.update(true);
    }
    // A section the search has hidden comes back with every other one
    function go(id) {
      var head = root.querySelector('[id="tap-guide-s-' + id + '"]'), card = head && head.closest('.tap-guide__card');
      if (card && !card.getClientRects().length) { box.value = ''; search(''); }
      if (jump(root, id)) track.hold();
    }

    var me = { go: go };
    live = me;
    track.update(true);
    if (pending) { var first = pending; pending = null; go(first); }
    return { destroy: function () {
      if (live === me) live = null;
      track.destroy();
      handles.forEach(function (h) { if (h && typeof h.destroy === 'function') h.destroy(); });
      TAP.dom.clear(root);
    } };
  }

  // Opens the Guide at a section (its id in content/guide.js, or an added section's): the card opens and its heading
  // takes focus. Already on the Guide, it moves there.
  function open(id) {
    if (live) { live.go(id); return; }
    pending = id;
    try { TAP.store.set({ view: 'guide' }); } finally { pending = null; }
  }

  // An address naming a section, #guide/<section>. The app opens the Guide and puts #guide in the address; this
  // listener is added before the app's, so the section is known by the time the Guide mounts.
  window.addEventListener('hashchange', function () {
    var m = /^#\/?guide\/(.+)$/.exec(window.location.hash || ''), id;
    if (!m) return;
    try { id = decodeURIComponent(m[1]); } catch (e) { return; }
    if (live) { live.go(id); return; }
    pending = id;
    window.setTimeout(function () { if (pending === id) pending = null; }, 0);   // only for this address change
  });

  TAP.guide = { open: open };

  // The menu title comes from config/views.js
  TAP.views.register('guide', { mount: mount });
})(window.TAP);
