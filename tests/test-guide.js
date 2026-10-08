/*
 * File: tests/test-guide.js
 * Purpose: Tests for the Guide's layout (D139): a contents list with a search box beside the sections, which are
 *          cards in two columns, each with its first paragraph and "Read more"; jumps and deep links open the card.
 * Provides: test cases X-d139-guide-layout (#555)
 * Depends on: tests/harness.js, tests/test-setup.js, the app scripts, data/sample-plan-data.js
 * Used by: tests.html
 */
(function (TAP) {
  'use strict';

  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  // On the page: drawn, not hidden by itself or by a parent
  function shown(n) { return !!n && n.getClientRects().length > 0; }
  function t(key, vars) { return TAP.content.text('guidePage.' + key, vars); }

  function withGuide(fn) {
    var root = T.dom.mount(), handle = TAP.views.get('guide').mount(root);
    try { return fn(root); } finally { handle.destroy(); }
  }
  function sample() { return JSON.parse(JSON.stringify(window.PLAN_DATA)); }
  // Runs fn with the whole app on the sample data; returns fn's promise when it gives one.
  function withApp(fn) {
    var root = T.dom.mount();
    TAP.app.start({ root: root, plan: sample() });
    function stop() { TAP.app.stop(); TAP.data.load(T_FIXTURE('mini')); }
    var out;
    try { out = fn(root); } catch (e) { stop(); throw e; }
    if (out && out.then) return out.then(function (v) { stop(); return v; }, function (e) { stop(); throw e; });
    stop();
    return out;
  }

  // The sections of each part, from the content file, with the added sections (Guide extras) at the end of the first
  function parts() {
    var g = TAP.content.guide();
    var extras = (TAP.guideExtras || []).map(function (x) { return { id: x.id, title: x.title }; });
    return [
      { id: 'howTo', title: g.howTo.title, sections: g.howTo.sections.concat(extras) },
      { id: 'planning', title: g.planning.title, sections: g.planning.sections }
    ];
  }
  function card(root, id) { return root.querySelector('.tap-guide__card[data-part="' + id + '"]'); }
  function link(root, id) { return root.querySelector('.tap-guide__tocitem[data-target="' + id + '"]'); }
  function search(root, words) {
    var box = root.querySelector('.tap-guide__toc input[type="search"]');
    box.value = words;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    return box;
  }
  // Worked out from the content file, not from the page: sections whose title or text holds every word
  function matching(words) {
    var ws = words.toLowerCase().split(/\s+/);
    var out = [];
    parts().forEach(function (p) {
      p.sections.forEach(function (s) {
        if (!s.paragraphs) return;   // added sections draw their own text; checked on the page below
        var hay = (s.title + ' ' + s.paragraphs.join(' ')).toLowerCase();
        if (ws.every(function (w) { return hay.indexOf(w) >= 0; })) out.push(s.id);
      });
    });
    return out;
  }

  T.suite('guide layout (D139)', function () {
    T.test('X-d139-guide-layout', 'The contents list has a search box, both parts as headings and one link per section', function (a) {
      withGuide(function (root) {
        var toc = root.querySelector('.tap-guide__toc');
        a.ok(toc, 'a contents list');
        var box = toc.querySelector('input[type="search"]');
        a.ok(box, 'a search box');
        var label = box && toc.querySelector('label[for="' + box.id + '"]');
        a.equal(txt(label), t('search'), 'labelled "Search the guide"');
        a.deepEqual(qsa('.tap-guide__tocpart', toc).map(txt), parts().map(function (p) { return p.title; }), 'the two parts as headings');
        parts().forEach(function (p) {
          var links = qsa('[data-toc="' + p.id + '"] .tap-guide__tocitem', toc);
          a.deepEqual(links.map(txt), p.sections.map(function (s) { return s.title; }), p.id + ': one link per section, in order');
        });
      });
    });

    T.test('X-d139-guide-layout', 'The sections are cards in a grid, one card per section, under their part heading', function (a) {
      withGuide(function (root) {
        parts().forEach(function (p) {
          var sec = root.querySelector('.tap-guide__sec[data-guide="' + p.id + '"]');
          a.ok(sec, p.id + ': the part is there');
          a.equal(txt(sec.querySelector('h2')), p.title, p.id + ': its heading');
          a.equal(getComputedStyle(sec).display, 'grid', p.id + ': its cards sit in a grid');
          var ids = qsa('.tap-guide__card', sec).map(function (c) { return c.getAttribute('data-part'); });
          a.deepEqual(ids, p.sections.map(function (s) { return s.id; }), p.id + ': one card per section, in order');
        });
        var toc = root.querySelector('.tap-guide__toc'), first = root.querySelector('.tap-guide__card');
        a.ok(toc.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING, 'the contents come before the cards');
      });
    });

    T.test('X-d139-guide-layout', 'A long section shows its first paragraph and "Read more", which reveals the rest; "Show less" hides it', function (a) {
      var s = TAP.content.guide().howTo.sections.filter(function (x) { return x.id === 'compare'; })[0];
      a.ok(s.paragraphs.length > 1, 'the comparison bar section has more than one paragraph');
      withGuide(function (root) {
        var c = card(root, 'compare'), ps = qsa('.tap-guide__p', c), more = c.querySelector('.tap-guide__more');
        a.equal(ps.length, s.paragraphs.length, 'every paragraph is in the card');
        a.ok(shown(ps[0]), 'the first paragraph shows');
        a.ok(!shown(ps[1]), 'the second is closed');
        a.equal(txt(more), t('readMore'), '"Read more"');
        a.equal(more.getAttribute('aria-expanded'), 'false', 'closed for screen readers');
        more.click();
        a.ok(shown(ps[1]) && shown(ps[ps.length - 1]), 'the rest shows in place');
        a.equal(more.getAttribute('aria-expanded'), 'true', 'open for screen readers');
        a.equal(txt(more), t('showLess'), '"Show less"');
        more.click();
        a.ok(!shown(ps[1]), '"Show less" closes it again');
        var one = TAP.content.guide().howTo.sections.filter(function (x) { return x.paragraphs.length === 1; })[0];
        a.equal(card(root, one.id).querySelector('.tap-guide__more'), null, 'a one-paragraph section has no "Read more"');
      });
    });

    T.test('X-d139-guide-layout', 'Searching "hit rate" leaves only the matching sections in both lists; clearing brings all back', function (a) {
      var want = matching('hit rate');
      a.ok(want.length > 0, 'some sections mention a hit rate');
      withGuide(function (root) {
        var all = qsa('.tap-guide__card', root).length;
        a.ok(want.length < all, 'not every section does');
        search(root, 'Hit  RATE');
        var cards = qsa('.tap-guide__card', root).filter(shown).map(function (c) { return c.getAttribute('data-part'); });
        a.deepEqual(cards, want, 'only the matching cards show (any case, any spacing)');
        var links = qsa('.tap-guide__tocitem', root).filter(shown).map(function (b) { return b.getAttribute('data-target'); });
        a.deepEqual(links, want, 'only their contents links show');
        a.ok(!shown(root.querySelector('.tap-guide__nomatch')), 'no "no section" message');
        search(root, '');
        a.equal(qsa('.tap-guide__card', root).filter(shown).length, all, 'clearing shows every card');
        a.equal(qsa('.tap-guide__tocitem', root).filter(shown).length, all, 'and every contents link');
      });
    });

    T.test('X-d139-guide-layout', 'A search with no match says so, and its clear button brings every section back', function (a) {
      withGuide(function (root) {
        var all = qsa('.tap-guide__card', root).length;
        var box = search(root, 'zebra quokka');
        a.equal(qsa('.tap-guide__card', root).filter(shown).length, 0, 'no card shows');
        var none = root.querySelector('.tap-guide__nomatch');
        a.ok(shown(none), 'a message shows');
        a.ok(txt(none).indexOf(t('noMatch', { words: 'zebra quokka' })) >= 0, txt(none));
        none.querySelector('button').click();
        a.equal(box.value, '', 'the box is emptied');
        a.equal(qsa('.tap-guide__card', root).filter(shown).length, all, 'every card is back');
        a.ok(!shown(none), 'the message goes');
      });
    });

    T.test('X-d139-guide-layout', 'A contents link opens its card, focuses its heading and marks itself as the section in view', function (a) {
      withGuide(function (root) {
        var c = card(root, 'tiers'), l = link(root, 'tiers');
        a.equal(c.querySelector('.tap-guide__more').getAttribute('aria-expanded'), 'false', 'starts closed');
        l.click();
        a.equal(c.querySelector('.tap-guide__more').getAttribute('aria-expanded'), 'true', 'the card opens');
        a.equal(document.activeElement, c.querySelector('h3'), 'focus is on its heading');
        a.ok(l.hasAttribute('aria-current'), 'the link is marked');
        a.equal(qsa('.tap-guide__tocitem[aria-current]', root).length, 1, 'and only that one');
      });
    });

    T.test('X-d139-guide-layout', 'TAP.guide.open lands on the section, opened, from another view and on the Guide', function (a) {
      withApp(function (root) {
        TAP.store.set({ view: 'industry' });
        TAP.guide.open('segments');
        a.equal(TAP.store.get().view, 'guide', 'the Guide opens');
        var c = card(root, 'segments');
        a.ok(c && c.querySelector('.tap-guide__more').getAttribute('aria-expanded') === 'true', 'its card is open');
        a.equal(document.activeElement, c && c.querySelector('h3'), 'focus is on its heading');
        TAP.guide.open('chartTypes');
        a.equal(document.activeElement, card(root, 'chartTypes').querySelector('h3'), 'already on the Guide: it moves there');
      });
    });

    T.test('X-d139-guide-layout', 'An address naming a section (#guide/ratings) lands on its card, opened', function (a) {
      return withApp(function (root) {
        TAP.store.set({ view: 'overview' });
        return new Promise(function (resolve, reject) {
          var done = false;
          function on() { if (done) return; done = true; window.removeEventListener('hashchange', on); setTimeout(resolve, 0); }
          window.addEventListener('hashchange', on);
          setTimeout(function () { if (!done) { done = true; reject(new Error('no hashchange')); } }, 1500);
          window.location.hash = '#guide/ratings';
        }).then(function () {
          a.equal(TAP.store.get().view, 'guide', 'the Guide opens');
          var c = card(root, 'ratings');
          a.ok(c && c.querySelector('.tap-guide__more').getAttribute('aria-expanded') === 'true', 'its card is open');
          a.equal(document.activeElement, c && c.querySelector('h3'), 'focus is on its heading');
        });
      });
    });

    T.test('X-d139-guide-layout', 'The tour’s "Open the Guide" lands on the card about what territory account planning is', function (a) {
      withApp(function (root) {
        TAP.tour.start();
        var guard = 30, open;
        while (!(open = document.querySelector('.tap-tour__guide')) && guard--) {
          var next = document.querySelector('.tap-tour__next');
          if (!next) break;
          next.click();
        }
        a.ok(open, 'the last step has "Open the Guide"');
        try { open.click(); } finally { TAP.tour.stop(); TAP.storage.remove('tour:done'); }
        a.equal(TAP.store.get().view, 'guide', 'the Guide opens');
        var c = card(root, 'what');
        a.ok(c && c.querySelector('.tap-guide__more').getAttribute('aria-expanded') === 'true', 'that card is open');
        a.equal(document.activeElement, c && c.querySelector('h3'), 'focus is on its heading');
      });
    });

    T.test('X-d139-guide-layout', 'The shortcuts table is on its card, open without "Read more", across both columns', function (a) {
      withGuide(function (root) {
        var c = card(root, 'keys'), keys = c ? qsa('.tap-guide__key', c) : [];
        a.equal(keys.length, Math.min(TAP.views.order().length, 10), 'one line per number key');
        a.ok(keys.length && shown(keys[0]), 'shown without opening the card');
        a.ok(c.classList.contains('tap-guide__card--wide'), 'the card spans both columns');
      });
    });
  });
})(window.TAP);
