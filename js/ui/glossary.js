/*
 * File: js/ui/glossary.js
 * Purpose: Shows a term's definition where it appears: a small popover with the term, its short definition and why
 *          it matters (US-1.6.4). There is no A to Z list; definitions stay where the terms appear (D98).
 * Provides: TAP.glossary (popover, close)
 * Depends on: js/core/content.js (terms, text), js/core/dom.js, js/core/icons.js, js/core/store.js (closes on a view change)
 * Used by: every panel that shows TAP.content.mark() output (clicks are picked up here, page-wide)
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
      entry.why ? el('p', { class: 'tap-popover__why' }, [el('strong', { text: t('why') + ' ' }), entry.why]) : null
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

  TAP.glossary = { popover: popover, close: close };
})(window.TAP);
