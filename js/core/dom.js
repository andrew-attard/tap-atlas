/*
 * File: js/core/dom.js
 * Purpose: Small helpers for building and finding page elements safely.
 * Provides: TAP.dom (el, text, html, esc, qs, qsa, on, clear)
 * Depends on: js/core/namespace.js
 * Used by: every module that draws on screen
 */
(function (TAP) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // Escapes text for use inside HTML strings.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  // Builds an element. attrs: class, text, html (trusted only), data-*, aria-*, on<event>, others as attributes.
  // children: a string, a node, or a list of either (null entries are skipped).
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') html(node, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children == null) return node;
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function text(node, s) { node.textContent = s == null ? '' : String(s); return node; }

  // The one place raw HTML is set. Callers pass only strings they built with esc() or trusted templates.
  function html(node, trusted) { node.innerHTML = trusted; return node; } // html-ok: the single trusted sink

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Adds a listener, optionally delegated to children matching sel. Returns a function that removes it.
  function on(node, type, sel, fn) {
    if (typeof sel === 'function') { fn = sel; sel = null; }
    var handler = function (e) {
      if (!sel) return fn(e);
      var t = e.target.closest ? e.target.closest(sel) : null;
      if (t && node.contains(t)) fn(e, t);
    };
    node.addEventListener(type, handler);
    return function () { node.removeEventListener(type, handler); };
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  TAP.dom = { el: el, append: append, text: text, html: html, esc: esc, qs: qs, qsa: qsa, on: on, clear: clear };
})(window.TAP);
