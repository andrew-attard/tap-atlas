/*
 * File: js/ui/glossary.js
 * Purpose: Shows a term's definition where it appears (a small popover), and the searchable A to Z glossary list.
 * Provides: TAP.glossary (popover, render, close)
 * Depends on: js/core/content.js (terms, text), js/core/dom.js, js/core/icons.js, js/core/store.js (opens the Guide),
 *             js/ui/layers.js
 * Used by: every panel that shows TAP.content.mark() output (clicks are picked up here, page-wide),
 *          the glossary side panel and js/views/guide.js
 */
(function (TAP) {
  'use strict';

  var open = null;        // {el, anchor, termId, pinned, off}
  var hoverTimer = null;
  var GAP = 6;            // space between the term and its popover

  function t(key, vars) { return TAP.content.text('glossary.' + key, vars); }

  // ---- popover ----

  function close() {
    clearTimeout(hoverTimer);
    if (!open) return;
    if (open.off) open.off();
    if (open.anchor && open.anchor.setAttribute) open.anchor.setAttribute('aria-expanded', 'false');
    if (open.el.parentNode) open.el.parentNode.removeChild(open.el);
    open = null;
  }

  // The full entry: the glossary side panel when there is one, otherwise the glossary on the Guide page.
  function openFull(termId) {
    close();
    try { TAP.layers.open('glossary', { termId: termId }); return; } catch (e) { /* side panels not built yet */ }
    TAP.store.set({ view: 'guide' });
    setTimeout(function () { target(document, termId); }, 0);
  }

  function place(pop, anchor) {
    var r = anchor.getBoundingClientRect();
    var maxLeft = document.documentElement.clientWidth - pop.offsetWidth - GAP;
    pop.style.top = (r.bottom + window.pageYOffset + GAP) + 'px';
    pop.style.left = (Math.max(GAP, Math.min(r.left, maxLeft)) + window.pageXOffset) + 'px';
  }

  // Shows a term's definition next to anchorEl. Returns the popover element, or null for an unknown term.
  function popover(termId, anchorEl, opts) {
    var all = TAP.content.terms();
    close();
    if (!Object.prototype.hasOwnProperty.call(all, termId)) return null;
    var entry = all[termId];
    var el = TAP.dom.el;
    var pop = el('div', { class: 'tap-popover', id: 'tap-popover', role: 'dialog', 'aria-label': entry.term }, [
      el('div', { class: 'tap-popover__head' }, [
        el('strong', { class: 'tap-popover__term', text: entry.term }),
        el('button', { type: 'button', class: 'tap-iconbtn tap-popover__close', 'aria-label': t('close'), onclick: function () { close(); } },
          TAP.icons.svg('x'))
      ]),
      el('p', { class: 'tap-popover__short', text: entry.short }),
      entry.why ? el('p', { class: 'tap-popover__why' }, [el('strong', { text: t('why') + ' ' }), entry.why]) : null,
      el('button', { type: 'button', class: 'tap-popover__link', 'data-glossary-link': termId,
        onclick: function () { openFull(termId); } }, t('open'))
    ]);
    pop.addEventListener('mouseenter', function () { clearTimeout(hoverTimer); });
    pop.addEventListener('mouseleave', function () { if (open && !open.pinned) closeSoon(); });
    document.body.appendChild(pop);
    if (anchorEl) {
      if (anchorEl.setAttribute) { anchorEl.setAttribute('aria-expanded', 'true'); anchorEl.setAttribute('aria-controls', 'tap-popover'); }
      place(pop, anchorEl);
    }
    open = { el: pop, anchor: anchorEl, termId: termId, pinned: !(opts && opts.hover) };
    open.off = TAP.store.on(function (s, changed) { followPage(pop, changed); });
    return pop;
  }

  // A popover never outlives its view, or the term it points at (a panel redrawn under it).
  function followPage(pop, changed) {
    function gone() { return open && open.el === pop && open.anchor && open.anchor.nodeType === 1 && !open.anchor.isConnected; }
    if (open && open.el === pop && changed.indexOf('view') >= 0) { close(); return; }
    if (gone()) { close(); return; }
    setTimeout(function () { if (gone()) close(); }, 0);   // other listeners may redraw the panel after this one
  }

  // A short pause lets the pointer move from the term onto the popover without it closing.
  function closeSoon() {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(close, 300);
  }

  // Page-wide handling of marked terms, so panels only need to insert TAP.content.mark() output.
  // Click or tap pins the popover open; hover shows it too, but nothing is hover-only.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.tap-term') : null;
    if (btn) {
      if (open && open.anchor === btn && open.pinned) close();
      else if (open && open.anchor === btn) open.pinned = true;
      else popover(btn.getAttribute('data-term'), btn);
      return;
    }
    if (open && !open.el.contains(e.target)) close();
  });

  document.addEventListener('mouseover', function (e) {
    var btn = e.target.closest ? e.target.closest('.tap-term') : null;
    if (!btn) return;
    clearTimeout(hoverTimer);
    if (open && (open.pinned || open.anchor === btn)) return;
    popover(btn.getAttribute('data-term'), btn, { hover: true });
  });

  document.addEventListener('mouseout', function (e) {
    var btn = e.target.closest ? e.target.closest('.tap-term') : null;
    if (btn && open && open.anchor === btn && !open.pinned && !open.el.contains(e.relatedTarget)) closeSoon();
  });

  // Esc closes the popover first, before any side panel or the tour underneath (capture phase). preventDefault marks
  // it as handled (ARCHITECTURE section 11), so the tour, side panels and expanded charts leave it alone.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !open) return;
    var anchor = open.pinned ? open.anchor : null;
    close();
    e.preventDefault();
    e.stopPropagation();
    if (anchor && anchor.focus && document.contains(anchor)) anchor.focus();
  }, true);

  // ---- A to Z list with search ----

  function target(root, termId) {
    var entry = root.querySelector('[data-entry="' + String(termId).replace(/["\\]/g, '') + '"]');
    if (!entry) return null;
    TAP.dom.qsa('.tap-gloss__entry.is-target', root).forEach(function (n) { n.classList.remove('is-target'); });
    entry.hidden = false;
    entry.classList.add('is-target');
    if (entry.parentNode) entry.parentNode.hidden = false;
    if (document.contains(entry) && entry.scrollIntoView) entry.scrollIntoView({ block: 'start' });
    return entry;
  }

  function entryEl(e, jump) {
    var el = TAP.dom.el;
    return el('div', { class: 'tap-gloss__entry', 'data-entry': e.id }, [
      el('p', { class: 'tap-gloss__head' }, [
        el('span', { class: 'tap-gloss__term', text: e.term }),
        e.layer === 'organization' ? el('span', { class: 'tap-badge tap-badge--accent', text: t('orgBadge') }) : null
      ]),
      el('p', { class: 'tap-gloss__short', text: e.short }),
      e.why ? el('p', { class: 'tap-gloss__why' }, [el('strong', { text: t('why') + ' ' }), e.why]) : null,
      (e.aliases || []).length ? el('p', { class: 'tap-gloss__meta' }, [el('strong', { text: t('aliases') + ' ' }), e.aliases.join(', ')]) : null,
      (e.related || []).length ? el('p', { class: 'tap-gloss__meta' }, [el('strong', { text: t('related') + ' ' })].concat(
        e.related.map(function (id) {
          var r = TAP.content.terms()[id];
          return r ? el('button', { type: 'button', class: 'tap-gloss__rel', onclick: function () { jump(id); } }, r.term) : null;
        }))) : null
    ]);
  }

  // Draws the glossary into el. opts.termId opens the list on that entry. Returns {el, filter(query)}.
  function render(root, opts) {
    opts = opts || {};
    var el = TAP.dom.el, all = TAP.content.terms();
    var list = Object.keys(all).map(function (id) { return all[id]; }).sort(function (a, b) {
      return String(a.term).toLowerCase().localeCompare(String(b.term).toLowerCase());
    });
    var uid = 'tap-gloss-search-' + Math.random().toString(36).slice(2, 8);
    var input = el('input', { type: 'search', id: uid, class: 'tap-field tap-gloss__search', placeholder: t('placeholder'), autocomplete: 'off' });
    var count = el('p', { class: 'tap-gloss__count tap-muted', 'aria-live': 'polite' });
    var none = el('p', { class: 'tap-gloss__none', hidden: true });
    var body = el('div', { class: 'tap-gloss__list' });

    function jump(id) {
      if (input.value) { input.value = ''; filter(''); }
      var n = target(body, id);
      var head = n && n.querySelector('.tap-gloss__term');
      if (head) { head.setAttribute('tabindex', '-1'); head.focus(); }
    }

    var groups = {};
    list.forEach(function (e) {
      var letter = String(e.term).charAt(0).toUpperCase();
      if (!groups[letter]) {
        groups[letter] = el('section', { class: 'tap-gloss__group' }, el('h3', { class: 'tap-gloss__letter', text: letter }));
        body.appendChild(groups[letter]);
      }
      groups[letter].appendChild(entryEl(e, jump));
    });

    // Matches the term and its other names, so "hit" finds Hit rate and "recurring revenue" finds ARR.
    function filter(q) {
      q = String(q || '').trim().toLowerCase();
      var n = 0;
      TAP.dom.qsa('.tap-gloss__entry', body).forEach(function (node) {
        var e = all[node.getAttribute('data-entry')];
        var hit = !q || [e.term].concat(e.aliases || []).some(function (w) { return String(w).toLowerCase().indexOf(q) >= 0; });
        node.hidden = !hit;
        if (hit) n++;
      });
      Object.keys(groups).forEach(function (k) { groups[k].hidden = !groups[k].querySelector('.tap-gloss__entry:not([hidden])'); });
      TAP.dom.text(count, t('count', { n: n, total: list.length }));
      none.hidden = n > 0;
      TAP.dom.text(none, t('none', { q: q }));
    }

    input.addEventListener('input', function () { filter(input.value); });
    TAP.dom.clear(root);
    root.appendChild(el('div', { class: 'tap-gloss' }, [
      el('label', { class: 'tap-gloss__label', for: uid, text: t('searchLabel') }), input, count, none, body
    ]));
    filter('');
    if (opts.termId) target(body, opts.termId);
    return { el: root, filter: function (q) { input.value = q || ''; filter(q); } };
  }

  TAP.glossary = { popover: popover, render: render, close: close };
})(window.TAP);
