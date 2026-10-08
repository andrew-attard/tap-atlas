/*
 * File: js/views/guide-cards.js
 * Purpose: The Guide's pieces (D139): a section as a card (first paragraph, the rest behind "Read more"), the
 *          contents list with its search box, the search filter, and the mark on the section in view.
 * Provides: TAP.guideCards (card, extraCard, setOpen, contents, filter, markCurrent)
 * Depends on: js/core/dom.js, js/core/icons.js, js/core/content.js (text, mark), js/core/store.js (view),
 *             js/engine/registry.js (views)
 * Used by: js/views/guide.js
 *
 * Every word comes from content/guide.js (sections) and content/text-pages.js (guidePage.*).
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('guidePage.' + key, vars); }
  function headId(id) { return 'tap-guide-s-' + id; }

  // Paragraphs with glossary terms marked once per section.
  function paras(list, seen) {
    return (list || []).map(function (p) { return TAP.dom.html(el('p', { class: 'tap-guide__p' }), TAP.content.mark(p, seen)); });
  }

  // "Open <view>" under a section that names a view; nothing when the view isn't in the menu.
  function link(s) {
    var view = s.link && s.link.view && TAP.views.order().indexOf(s.link.view) >= 0 ? s.link.view : null;
    return view ? el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-guide__link',
      onclick: function () { TAP.store.set({ view: view }); } }, [t('openView', { view: TAP.views.title(view) }), TAP.icons.svg('arrow', { size: 18 })]) : null;
  }

  // The number keys, one per view in menu order (1 to 9, then 0 for the tenth, D90), from the same list TAP.keys reads.
  function shortcuts() {
    var ids = TAP.views.order().slice(0, 10);
    return el('ul', { class: 'tap-guide__keys', 'aria-label': t('keysLabel') }, ids.map(function (id, i) {
      return el('li', { class: 'tap-guide__key', 'data-view': id }, [el('kbd', null, String((i + 1) % 10)), el('span', null, TAP.views.title(id))]);
    }));
  }

  function heading(id, title, badge) {
    return el('h3', { class: 'tap-guide__h3', id: headId(id), tabindex: '-1' }, [
      title, badge ? el('span', { class: 'tap-badge tap-badge--accent' }, t('orgBadge')) : null
    ]);
  }

  // Opens or closes the paragraphs after the first; a card with none has no button and nothing to do.
  function setOpen(card, open) {
    var rest = card.querySelector('.tap-guide__rest'), btn = card.querySelector('.tap-guide__more');
    if (!rest || !btn) return;
    rest.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    TAP.dom.text(btn, t(open ? 'showLess' : 'readMore'));
  }

  // One section of content/guide.js as a card. The shortcuts table shows without opening the card, which then spans
  // both columns. `hay` is the text the search looks in: the title and every paragraph, in lower case.
  function card(s) {
    var ps = paras(s.paragraphs, {}), restId = 'tap-guide-rest-' + s.id, rest = null, more = null;
    if (ps.length > 1) {
      rest = el('div', { class: 'tap-guide__rest', id: restId, hidden: true }, ps.slice(1));
      more = el('button', { type: 'button', class: 'tap-guide__more', 'aria-expanded': 'false', 'aria-controls': restId }, t('readMore'));
    }
    var c = el('article', { class: 'tap-guide__card tap-guide__part' + (s.shortcuts ? ' tap-guide__card--wide' : ''),
      'data-part': s.id, 'aria-labelledby': headId(s.id) },
      [heading(s.id, s.title, s.layer === 'organization'), ps[0] || null, s.shortcuts ? shortcuts() : null, rest, more, link(s)]);
    if (more) more.addEventListener('click', function () { setOpen(c, rest.hidden); });
    c.hay = (s.title + ' ' + (s.paragraphs || []).join(' ')).toLowerCase();
    return c;
  }

  // A section another stream adds (TAP.guideExtras): drawn whole, across both columns. It keeps data-guide, its
  // address in ARCHITECTURE 18.1. Its words can change while it is on screen, so the search reads them each time.
  function extraCard(x, body) {
    var c = el('article', { class: 'tap-guide__card tap-guide__card--wide', 'data-part': x.id, 'data-guide': x.id,
      'aria-labelledby': headId(x.id) }, [heading(x.id, x.title), body]);
    Object.defineProperty(c, 'hay', { get: function () { return (x.title + ' ' + body.textContent).toLowerCase(); } });
    return c;
  }

  // The contents list: "Search the guide", then each part's title over a link per section. go(id) jumps to one.
  function contents(parts, go, onSearch) {
    var box = el('input', { type: 'search', id: 'tap-guide-search', class: 'tap-field tap-guide__search', autocomplete: 'off',
      oninput: function () { onSearch(box.value); } });
    return el('nav', { class: 'tap-guide__toc', 'aria-label': t('contents') }, [
      el('h2', { class: 'tap-guide__toch' }, t('contents')),
      el('label', { class: 'tap-guide__searchl', for: 'tap-guide-search' }, t('search')),
      box
    ].concat(parts.map(function (p) {
      return el('div', { class: 'tap-guide__tocgroup', 'data-toc': p.id }, [
        el('h3', { class: 'tap-guide__tocpart' }, p.title),
        el('ol', { class: 'tap-guide__toclist' }, p.sections.map(function (s) {
          return el('li', null, el('button', { type: 'button', class: 'tap-guide__tocitem', 'data-target': s.id,
            onclick: function () { go(s.id); } }, s.title));
        }))
      ]);
    })));
  }

  // Shows the sections whose title or text holds every word (any case), in the cards and the contents alike; a part
  // with none left hides whole. Returns how many sections show. Matching cards open, so the words are in view.
  function filter(root, query) {
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean), shown = 0;
    TAP.dom.qsa('.tap-guide__sec', root).forEach(function (sec) {
      var id = sec.getAttribute('data-guide'), left = 0;
      TAP.dom.qsa('.tap-guide__card', sec).forEach(function (c) {
        var hay = c.hay || '', ok = words.every(function (w) { return hay.indexOf(w) >= 0; });
        c.hidden = !ok;
        var item = root.querySelector('.tap-guide__tocitem[data-target="' + c.getAttribute('data-part') + '"]');
        if (item) item.parentNode.hidden = !ok;
        if (ok && words.length) setOpen(c, true);
        if (ok) left++;
      });
      sec.hidden = !left;
      var group = root.querySelector('.tap-guide__tocgroup[data-toc="' + id + '"]');
      if (group) group.hidden = !left;
      shown += left;
    });
    return shown;
  }

  // Marks one contents link as the section in view (aria-current, bold and a bar in the stylesheet).
  function markCurrent(root, id) {
    TAP.dom.qsa('.tap-guide__tocitem', root).forEach(function (b) {
      if (b.getAttribute('data-target') === id) b.setAttribute('aria-current', 'location');
      else b.removeAttribute('aria-current');
    });
  }

  TAP.guideCards = { card: card, extraCard: extraCard, setOpen: setOpen, contents: contents, filter: filter, markCurrent: markCurrent };
})(window.TAP);
