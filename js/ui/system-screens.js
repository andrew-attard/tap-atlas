/*
 * File: js/ui/system-screens.js
 * Purpose: Full-page messages when the app can't start: no data, wrong version, data errors (with copy).
 *          They replace the views; the menu and comparison bar are not drawn, so nothing can show a wrong figure.
 * Provides: TAP.screens (show)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js, js/core/namespace.js (schemaVersion)
 * Used by: js/ui/app.js
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var t = function (key, vars) { return TAP.content.text(key, vars); };

  function str(v) {
    if (v == null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  // Region and item ("Region C · Retail") so the list reads without the data file open.
  function regionOf(e) { return [e.region, e.item].filter(function (x) { return x != null && x !== ''; }).join(' · '); }

  // A heading line, then one tab-separated line per error, so it pastes into a message or a spreadsheet.
  function copyText(errors) {
    var head = [t('screens.colNumber'), t('screens.colRegion'), t('screens.colWhere'), t('screens.colExpected'),
      t('screens.colFound'), t('screens.colProblem')].join('\t');
    return [t('screens.copyHeading', { n: errors.length }), head].concat(errors.map(function (e, i) {
      return [i + 1, regionOf(e), str(e.path), str(e.expected), str(e.found), str(e.message)].join('\t');
    })).join('\n');
  }

  function table(errors) {
    var cols = ['colNumber', 'colRegion', 'colWhere', 'colExpected', 'colFound'];
    return el('table', { class: 'tap-table tap-screen__errors' }, [
      el('thead', null, el('tr', null, cols.map(function (c) { return el('th', { scope: 'col' }, t('screens.' + c)); }))),
      el('tbody', null, errors.map(function (e, i) {
        var detailed = !!(e.path || e.expected);
        return el('tr', null, [el('td', { class: 'num' }, String(i + 1))].concat(detailed ? [
          el('td', null, regionOf(e)),
          el('td', { class: 'tap-screen__path' }, str(e.path)),
          el('td', null, str(e.expected)),
          el('td', null, str(e.found))
        ] : [el('td', { colspan: '4' }, str(e.message))]));
      }))
    ]);
  }

  // Clipboard first; from file:// that can be refused, so fall back to a selected text box and the copy command,
  // and if that fails too, leave the text on screen to copy by hand.
  function copy(area, status) {
    function manual() {
      area.hidden = false;
      area.select();
      TAP.dom.text(status, t('screens.copyManual'));
    }
    function legacy() {
      var ok = false;
      area.hidden = false;
      area.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) { area.hidden = true; TAP.dom.text(status, t('screens.copied')); } else manual();
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) { legacy(); return; }
    // A clipboard request can stay unanswered (no focus, or a permission prompt), so don't wait for it forever
    var settled = false;
    function once(fn) { return function () { if (!settled) { settled = true; fn(); } }; }
    var fallback = once(legacy);
    setTimeout(fallback, 1000);
    navigator.clipboard.writeText(area.value).then(once(function () { TAP.dom.text(status, t('screens.copied')); }), fallback);
  }

  function body(res) {
    var errors = res.errors || [];
    if (res.reason === 'missing') {
      return [el('h1', null, t('screens.missingTitle')), el('p', { class: 'tap-screen__lead' }, t('screens.missingBody')),
        el('p', { class: 'tap-muted' }, t('screens.missingLooked'))];
    }
    if (res.reason === 'version') {
      var e = errors[0] || {};
      return [el('h1', null, t('screens.versionTitle')),
        el('p', { class: 'tap-screen__lead' }, t('screens.versionBody', { found: str(e.found) || '?', expected: e.expected || TAP.schemaVersion }))];
    }
    var area = el('textarea', { class: 'tap-screen__copytext', readonly: true, rows: '8', hidden: true, 'aria-label': t('screens.copy') });
    area.value = copyText(errors);
    var status = el('p', { class: 'tap-screen__status', role: 'status' });
    return [
      el('h1', null, t('screens.invalidTitle')),
      el('p', { class: 'tap-screen__lead' }, t('screens.invalidBody')),
      el('p', { class: 'tap-screen__count' }, t('screens.count', { n: errors.length })),
      table(errors),
      el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-screen__copy', onclick: function () { copy(area, status); } },
        [TAP.icons.svg('copy', { size: 18 }), t('screens.copy')]),
      status,
      area
    ];
  }

  function show(root, res) {
    res = res || {};
    var reason = res.reason === 'missing' || res.reason === 'version' ? res.reason : 'invalid';
    TAP.dom.clear(root);
    root.classList.add('tap-app');
    TAP.dom.append(root, [
      el('div', { class: 'tap-banner tap-banner--sample', role: 'note' }, t('screens.banner')),
      el('header', { class: 'tap-topbar' }, el('div', { class: 'tap-topbar__brand' },
        el('span', { class: 'tap-topbar__name' }, t('app.name')))),
      el('main', { class: 'tap-screen tap-screen--' + reason }, [
        TAP.icons.svg(reason === 'missing' ? 'data' : 'warning', { size: 40, className: 'tap-screen__icon' })
      ].concat(body(Object.assign({}, res, { reason: reason }))))
    ]);
    return root;
  }

  TAP.screens = { show: show };
})(window.TAP);
