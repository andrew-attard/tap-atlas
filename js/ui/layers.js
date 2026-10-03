/*
 * File: js/ui/layers.js
 * Purpose: Side panels that open over the page without blocking it (details, data sources, glossary, explanations).
 *          One is open at a time; opening another replaces it. Esc closes it, after any nearer popover.
 * Provides: TAP.layers (open, close, openDetails, top)
 * Depends on: js/core/store.js (state.layer), js/core/dom.js, js/core/icons.js, js/core/content.js,
 *             js/core/format.js, js/core/sources.js (addresses), js/reports/details.js (TAP.details.build),
 *             js/ui/sources-panel.js, js/ui/glossary.js
 * Used by: panels, cards, the comparison bar, the glossary popover, the explanation panel
 *
 * open(name, payload): built-in panels are 'sources', 'details' ({target}) and 'glossary' ({termId}). Any other
 * name draws payload.title and calls payload.render(bodyEl), so other streams can add panels without code here.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text(key, vars); };
  var current = null;      // {name, payload, node}
  var returnTo = null;     // the element that had focus before the first panel opened
  var wired = false;
  var count = 0;

  /* ---------- what each panel shows ---------- */

  function drawDetails(body, payload) {
    var built = TAP.details.build(payload && payload.target);
    (built.groups || []).forEach(function (g) {
      var group = el('section', { class: 'tap-details__group' }, el('h3', null, g.title));
      (g.rows || []).forEach(function (r) { group.appendChild(detailRow(r)); });
      if (!(g.rows || []).length) group.appendChild(el('p', { class: 'tap-muted' }, t('layers.none')));
      body.appendChild(group);
    });
    return built.title;
  }

  // Label and value, then the kind of value and where it came from (file › sheet › cell).
  function detailRow(r) {
    var c = r.cell || {};
    var value = r.text != null ? r.text : TAP.format.cell(c, { unit: r.unit, field: r.field, exact: true });
    var where = '';
    try { where = c.src ? TAP.sources.address(c.src).text : ''; } catch (e) { where = ''; }
    var kind = c.kind ? TAP.format.kind(c.kind).text : '';
    return el('div', { class: 'tap-details__row' }, [
      el('span', { class: 'tap-details__label' }, r.label),
      el('span', { class: 'tap-details__value' }, value),
      kind || where ? el('span', { class: 'tap-details__src' }, [kind, kind && where ? ' · ' : '', where]) : null
    ]);
  }

  var PANELS = {
    sources: { wide: true, draw: function (body) { TAP.sourcesPanel.render(body); return t('sourcesPanel.title'); } },
    details: { draw: drawDetails },
    glossary: { draw: function (body, p) { TAP.glossary.render(body, p); return t('layers.glossary'); } }
  };

  // Draws the body; a part that isn't built yet shows its own "Not built yet" message instead.
  function drawBody(name, payload, body) {
    var spec = PANELS[name];
    try {
      if (spec) return spec.draw(body, payload || {});
      if (payload && typeof payload.render === 'function') payload.render(body);
    } catch (e) {
      if (!/Not built yet/.test(e.message)) throw e;
      TAP.dom.clear(body);
      body.appendChild(el('p', { class: 'tap-stub' }, e.message));
    }
    return null;
  }

  /* ---------- open and close ---------- */

  function host() {
    var hosts = TAP.dom.qsa('.tap-app .tap-layers');
    return hosts.length ? hosts[hosts.length - 1] : document.body;
  }

  function build(name, payload) {
    var id = 'tap-layer-title-' + (++count);
    var title = el('h2', { class: 'tap-layer__title', id: id, tabindex: '-1' });
    var body = el('div', { class: 'tap-layer__body' });
    var heading = drawBody(name, payload, body);
    TAP.dom.text(title, (payload && payload.title) || heading || '');
    return el('aside', {
      class: 'tap-layer tap-layer--' + name + (PANELS[name] && PANELS[name].wide ? ' tap-layer--wide' : ''),
      role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': id, 'data-layer': name
    }, [
      el('header', { class: 'tap-layer__head' }, [
        title,
        el('button', { type: 'button', class: 'tap-btn tap-layer__close', onclick: function () { close(); } },
          [TAP.icons.svg('x', { size: 18 }), t('layers.close')])
      ]),
      body,
      el('footer', { class: 'tap-layer__foot' }, t('layers.escHint'))
    ]);
  }

  function remove() {
    if (current && current.node.parentNode) current.node.parentNode.removeChild(current.node);
    current = null;
  }

  function draw(name, payload) {
    if (!current) {
      var a = document.activeElement;
      returnTo = a && a !== document.body ? a : null;
    }
    remove();
    var node = build(name, payload);
    host().appendChild(node);
    current = { name: name, payload: payload, node: node };
    var title = TAP.dom.qs('.tap-layer__title', node);
    if (title.focus) title.focus();
  }

  function open(name, payload) {
    wire();
    draw(name, payload);
    TAP.store.set({ layer: { name: name, payload: payload || null } });
  }

  function close() {
    var back = returnTo;
    remove();
    returnTo = null;
    if (TAP.store.get().layer) TAP.store.set({ layer: null });
    if (back && back.isConnected && back.focus) back.focus();
  }

  function openDetails(target) { open('details', { target: target }); }

  function top() { return current ? current.name : null; }

  // Listens once: Esc closes the open panel (unless a popover already used that Esc), and a state reset closes it.
  function wire() {
    if (wired) return;
    wired = true;
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.defaultPrevented || !current) return;
      e.preventDefault();
      close();
    });
    TAP.store.on(function (state, changed) {
      if (changed.indexOf('layer') >= 0 && !state.layer && current) close();
    });
  }

  TAP.layers = { open: open, close: close, openDetails: openDetails, top: top };
})(window.TAP);
