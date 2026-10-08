/*
 * File: js/ui/source-tip.js
 * Purpose: Where a figure or a line of text comes from, behind a small data icon (D100): hover shows a popover with
 *          the kind of value and file › sheet › cell; click, tap, Enter or Space keeps it open; Esc or its close
 *          button closes it. One popover at a time. The address matters to the few who check a figure, so it no
 *          longer sits as a second line under every figure. The same popover, placed beside it, shows one figure
 *          when it is selected (D129): its label, exact value and where it comes from, instead of the side panel.
 * Provides: TAP.sourceTip (where, icon, html, open, figure, close, current)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/format.js (kind), js/core/sources.js
 *             (address), js/core/store.js (follows page changes), js/ui/glossary.js (closes its popover, at call time)
 * Used by: js/ui/layers.js (details rows), js/views/*.js, js/reports/themes.js, js/panel/panel-table.js,
 *          js/engine/build-list.js; figure() by js/views/overview-cards.js (popover)
 *
 * The icon carries what the popover shows (data-src-kind, data-src-where), so builders that return HTML text get the
 * same icon through html(). Clicks and hovers are picked up page-wide, as for glossary terms.
 */
(function (TAP) {
  'use strict';

  var open = null;        // {el, anchor, pinned, beside, off}
  var hoverTimer = null;
  var GAP = 6;            // px between the icon and its popover

  function t(key, vars) { return TAP.content.text('sourceTip.' + key, vars); }

  // file › sheet › cell or range; '' for a figure with no file behind it (worked out by this app, or combined).
  function where(src, opts) {
    if (opts && opts.where) return String(opts.where);
    if (!src || src.combined) return '';
    try { var a = TAP.sources.address(src); return a && a.file && !a.combined ? a.text : ''; } catch (e) { return ''; }
  }

  function attrs(src, kind, opts) {
    var w = where(src, opts);
    if (!w) return null;
    kind = kind || (src && src.kind) || '';
    return { type: 'button', class: 'tap-srctip', 'aria-expanded': 'false',
      'aria-label': opts && opts.label ? t('labelOf', { label: opts.label }) : t('label'),
      'data-src-kind': kind || null, 'data-src-where': w };
  }

  // The icon button, or null when there is no address to show.
  function icon(src, kind, opts) {
    var a = attrs(src, kind, opts);
    return a ? TAP.dom.el('button', a, TAP.icons.svg('data', { size: 18 })) : null;
  }

  // The same icon as HTML text, for builders that return HTML; '' when there is no address.
  function html(src, kind, opts) {
    var a = attrs(src, kind, opts);
    if (!a) return '';
    var out = Object.keys(a).filter(function (k) { return a[k] != null; }).map(function (k) {
      return k + '="' + TAP.dom.esc(a[k]) + '"';
    }).join(' ');
    return '<button ' + out + '>' + TAP.icons.svg('data', { size: 18 }).innerHTML + '</button>';   // html-ok: fixed SVG
  }

  /* ---------- the popover ---------- */

  function close() {
    clearTimeout(hoverTimer);
    if (!open) return;
    if (open.off) open.off();
    window.removeEventListener('scroll', place, true);
    window.removeEventListener('resize', place);
    if (open.anchor && open.anchor.setAttribute) open.anchor.setAttribute('aria-expanded', 'false');
    if (open.el.parentNode) open.el.parentNode.removeChild(open.el);
    open = null;
  }

  // Fixed, so it follows a panel that scrolls, and always inside the window. An icon's popover sits under it, or
  // above it when there is no room below. A figure's sits beside it, level with its top: on the right, else on the
  // left, raised when it would run off the bottom; with no room on either side, under or above it like an icon's.
  function place() {
    if (!open || !open.anchor.isConnected) return;
    var pop = open.el, r = open.anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight, h = pop.offsetHeight, w = pop.offsetWidth, top, left = null;
    if (open.beside) {
      if (r.right + GAP + w <= vw - GAP) left = r.right + GAP;
      else if (r.left - GAP - w >= GAP) left = r.left - GAP - w;
      top = Math.min(r.top, vh - h - GAP);
    }
    if (left === null) {
      top = r.bottom + GAP + h > vh && r.top - GAP - h >= 0 ? r.top - GAP - h : r.bottom + GAP;
      left = r.right - w;
    }
    pop.style.top = Math.max(GAP, Math.min(top, vh - h - GAP)) + 'px';
    pop.style.left = Math.max(GAP, Math.min(left, vw - w - GAP)) + 'px';
  }

  // The popover's frame: a heading, the close button and the body. Shared by the icon's popover and a figure's.
  function frame(cls, head, body, label) {
    var el = TAP.dom.el;
    return el('div', { class: cls, id: 'tap-srcpop', role: 'dialog', tabindex: '-1', 'aria-label': label || head }, [
      el('div', { class: 'tap-srcpop__head' }, [
        el('strong', { class: 'tap-srcpop__kind' }, head),
        el('button', { type: 'button', class: 'tap-iconbtn tap-srcpop__close', 'aria-label': t('close'), onclick: function () { closeAndReturn(); } },
          TAP.icons.svg('x'))
      ])
    ].concat(body));
  }

  // Puts a popover on the page for an anchor, closing any other first (one at a time).
  function mount(anchor, pop, opts) {
    close();
    if (TAP.glossary && TAP.glossary.close) TAP.glossary.close();
    document.body.appendChild(pop);
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', 'tap-srcpop');
    open = { el: pop, anchor: anchor, pinned: !(opts && opts.hover), beside: !!(opts && opts.beside) };
    open.off = TAP.store.on(function (s, changed) { follow(pop, changed); });
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    place();
    return pop;
  }

  // Opens the popover for an icon. opts.hover: shown while the pointer is over it, not kept open.
  function show(btn, opts) {
    var k = btn.getAttribute('data-src-kind'), kind = k ? TAP.format.kind(k) : null;
    var pop = frame('tap-srcpop', kind ? kind.text : t('label'),
      [TAP.dom.el('p', { class: 'tap-srcpop__where' }, btn.getAttribute('data-src-where'))], t('label'));
    pop.addEventListener('mouseenter', function () { clearTimeout(hoverTimer); });
    pop.addEventListener('mouseleave', function () { if (open && !open.pinned) closeSoon(); });
    return mount(btn, pop, opts);
  }

  // One figure, beside the button that shows it (D129): title is its label, body the lines under it. Focus moves into
  // the popover and back to the figure when it closes, never moving the page (D110). Selecting the same figure again
  // closes it.
  function figure(anchor, title, body) {
    if (open && open.anchor === anchor) { closeAndReturn(); return null; }
    var pop = mount(anchor, frame('tap-srcpop tap-figpop', title, body), { beside: true });
    pop.querySelector('.tap-srcpop__kind').classList.add('tap-figpop__title');
    pop.querySelector('.tap-srcpop__close').classList.add('tap-figpop__close');
    pop.focus({ preventScroll: true });
    return pop;
  }

  function closeAndReturn() {
    var anchor = open && open.pinned ? open.anchor : null;
    close();
    if (anchor && anchor.focus && anchor.isConnected) anchor.focus({ preventScroll: true });   // never moves the page (D110)
  }

  // A popover never outlives its view, or the icon it points at (a panel redrawn under it).
  function follow(pop, changed) {
    function gone() { return open && open.el === pop && !open.anchor.isConnected; }
    if (open && open.el === pop && changed.indexOf('view') >= 0) { close(); return; }
    if (gone()) { close(); return; }
    setTimeout(function () { if (gone()) close(); }, 0);
  }

  function closeSoon() {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(close, 300);
  }

  function current() { return open ? open.el : null; }

  function tipOf(e) { return e.target && e.target.closest ? e.target.closest('.tap-srctip') : null; }

  // Capture phase: the icon's click stays its own (a list row under it does not open its details), and a click
  // anywhere else closes the popover even when that click is stopped further down.
  document.addEventListener('click', function (e) {
    var btn = tipOf(e);
    if (btn) {
      e.stopPropagation();
      e.preventDefault();
      if (open && open.anchor === btn && open.pinned) close();
      else if (open && open.anchor === btn) open.pinned = true;
      else show(btn);
      return;
    }
    // A click on the open figure is left to the figure, which closes its own popover
    if (open && !open.el.contains(e.target) && !(open.beside && open.anchor.contains(e.target))) close();
  }, true);

  // Hover shows it too, but nothing is hover-only.
  document.addEventListener('mouseover', function (e) {
    var btn = tipOf(e);
    if (!btn) return;
    clearTimeout(hoverTimer);
    if (open && (open.pinned || open.anchor === btn)) return;
    show(btn, { hover: true });
  });

  document.addEventListener('mouseout', function (e) {
    var btn = tipOf(e);
    if (btn && open && open.anchor === btn && !open.pinned && !open.el.contains(e.relatedTarget)) closeSoon();
  });

  // Esc closes the popover first, before any side panel underneath (ARCHITECTURE section 11).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !open) return;
    closeAndReturn();
    e.preventDefault();
    e.stopPropagation();
  }, true);

  TAP.sourceTip = { where: where, icon: icon, html: html, open: show, figure: figure, close: close, current: current };
})(window.TAP);
