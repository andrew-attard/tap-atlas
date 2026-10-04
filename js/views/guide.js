/*
 * File: js/views/guide.js
 * Purpose: The Guide view: how to use the app, planning explained, glossary, reset charts (US-1.6.1).
 * Provides: view 'guide' (registered with TAP.views)
 * Depends on: js/engine/registry.js, js/ui/view-head.js (tip), js/core/dom.js, js/core/icons.js, js/core/content.js (guide, text, mark),
 *             js/core/storage.js, js/core/store.js (view, bus), js/ui/glossary.js (render), js/ui/tour.js (start)
 * Used by: js/ui/app.js, js/ui/shell.js (menu)
 *
 * Every word comes from content/guide.js (sections) and content/text-pages.js (guidePage.*: headings and buttons).
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('guidePage.' + key, vars); }

  // Paragraphs with glossary terms marked once per section.
  function paras(list, seen) {
    return (list || []).map(function (p) { return TAP.dom.html(el('p', { class: 'tap-guide__p' }), TAP.content.mark(p, seen)); });
  }

  function part(s, extra) {
    var seen = {};
    return el('div', { class: 'tap-guide__part', 'data-part': s.id }, [
      el('h3', { class: 'tap-guide__h3' }, [
        s.title,
        s.layer === 'organization' ? el('span', { class: 'tap-badge tap-badge--accent' }, t('orgBadge')) : null
      ])
    ].concat(paras(s.paragraphs, seen), extra ? [extra] : []));
  }

  // Clears the remembered chart types; panels listen for charts:reset and redraw with their defaults.
  function resetCharts(status) {
    TAP.storage.clear('chart:');
    TAP.bus.emit('charts:reset');
    TAP.dom.text(status, t('resetDone'));
  }

  function startTour() {
    try { TAP.tour.start(); } catch (e) { if (!/Not built yet/.test(e.message)) throw e; }
  }

  // The number keys, one per view in menu order (1 to 9), from the same list TAP.keys reads.
  function shortcuts() {
    var ids = TAP.views.order().slice(0, 9);
    return el('ul', { class: 'tap-guide__keys', 'aria-label': t('keysLabel') }, ids.map(function (id, i) {
      return el('li', { class: 'tap-guide__key', 'data-view': id }, [el('kbd', null, String(i + 1)), el('span', null, TAP.views.title(id))]);
    }));
  }

  function howTo(g) {
    var status = el('p', { class: 'tap-guide__status', role: 'status', 'aria-live': 'polite' });
    var actions = el('div', { class: 'tap-guide__actions' }, [
      el('button', { type: 'button', class: 'tap-btn tap-btn--primary tap-guide__tour', onclick: startTour }, t('tour')),
      el('button', { type: 'button', class: 'tap-btn tap-guide__reset', onclick: function () { resetCharts(status); } },
        [TAP.icons.svg('reset', { size: 18 }), t('reset')])
    ]);
    return [g.intro ? el('p', { class: 'tap-guide__lead' }, g.intro) : null, actions, status]
      .concat((g.sections || []).map(function (s) { return part(s, s.shortcuts ? shortcuts() : link(s)); }));
  }

  // "Open <view>" under a section that names a view; nothing when the view isn't in the menu.
  function link(s) {
    var view = s.link && s.link.view && TAP.views.get(s.link.view) ? s.link.view : null;
    return view ? el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-guide__link',
      onclick: function () { TAP.store.set({ view: view }); } }, [t('openView', { view: TAP.views.title(view) }), TAP.icons.svg('arrow', { size: 18 })]) : null;
  }

  function planning(g) {
    return (g.sections || []).map(function (s) { return part(s, link(s)); });
  }

  function section(id, title, children) {
    return el('section', { class: 'tap-guide__sec', 'data-guide': id, 'aria-labelledby': 'tap-guide-' + id },
      [el('h2', { class: 'tap-guide__h2', id: 'tap-guide-' + id, tabindex: '-1' }, title)].concat(children));
  }

  // Moves to a section, clear of the sticky top bar, and puts focus on its heading for keyboard users.
  function jump(root, id) {
    var head = root.querySelector('#tap-guide-' + id);
    if (!head) return;
    var stack = document.querySelector('.tap-stack');
    head.style.scrollMarginTop = ((stack ? stack.offsetHeight : 0) + 16) + 'px';
    if (head.scrollIntoView) head.scrollIntoView({ block: 'start' });
    head.focus({ preventScroll: true });
  }

  function mount(root) {
    var g = TAP.content.guide(), titles = {};
    (g.contents || []).forEach(function (c) { titles[c.id] = c.title; });
    TAP.dom.clear(root);
    var toc = el('nav', { class: 'tap-guide__toc', 'aria-label': t('contents') }, [
      el('h2', { class: 'tap-guide__toch' }, t('contents')),
      el('ol', { class: 'tap-guide__toclist' }, (g.contents || []).map(function (c) {
        return el('li', null, el('button', { type: 'button', class: 'tap-guide__tocitem', onclick: function () { jump(root, c.id); } }, c.title));
      }))
    ]);
    var glossary = el('div', { class: 'tap-guide__gloss' });
    var page = el('div', { class: 'tap-guide' }, [
      el('header', { class: 'tap-guide__head' }, [
        el('p', { class: 'tap-guide__kicker' }, t('kicker')),
        el('h1', { class: 'tap-guide__h1' }, t('heading')),
        TAP.viewHead.tip('guide')
      ]),
      toc,
      section('howTo', titles.howTo || (g.howTo || {}).title, howTo(g.howTo || {})),
      section('planning', titles.planning || (g.planning || {}).title, planning(g.planning || {})),
      section('glossary', titles.glossary, [glossary])
    ]);
    root.appendChild(page);
    TAP.glossary.render(glossary);
    return { destroy: function () { TAP.dom.clear(root); } };
  }

  // The menu title comes from config/views.js
  TAP.views.register('guide', { mount: mount });
})(window.TAP);
