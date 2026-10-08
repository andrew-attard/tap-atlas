/*
 * File: js/ui/custom-measure-picker.js
 * Purpose: The Measure picker of Build a chart (D122, US-3.5.1): a search box, topic buttons named after the menu,
 *          then the topic's key measures as radio buttons, with "Show all" for the topic's full list, A to Z.
 *          Typing in the search box lists the matches of every topic under topic headings.
 * Provides: TAP.customPicker (render, topicOf, topics)
 * Depends on: config/custom-topics.js, js/core/dom.js, content.js (all at call time)
 * Used by: js/ui/custom-builder.js
 * Owner: CUSTOM stream
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('custom.' + key, vars); }
  var OTHER = 'other';   // a measure no topic claims (one added later, under a new prefix) is still offered here
  var seq = 0;           // each picker drawn gets its own radio group and search box id

  function config() { return window.TAP_CUSTOM_TOPICS || []; }

  // The topic a measure belongs to: the one naming it in ids, else the one holding its id's first part.
  function topicOf(id) {
    var pre = String(id).split('.')[0];
    var hit = config().filter(function (c) { return (c.ids || []).indexOf(id) >= 0; })[0] ||
      config().filter(function (c) { return (c.prefixes || []).indexOf(pre) >= 0; })[0];
    return hit ? hit.id : OTHER;
  }

  // The topics that have a measure in the list, in the config's order, each with its measures and its key ones.
  function topics(list) {
    var all = config().concat([{ id: OTHER, key: [] }]);
    return all.map(function (c) {
      var items = list.filter(function (m) { return topicOf(m.id) === c.id; });
      var key = (c.key || []).map(function (id) { return items.filter(function (m) { return m.id === id; })[0]; }).filter(Boolean);
      return { id: c.id, label: t('topics.' + c.id), items: items, key: key };
    }).filter(function (x) { return x.items.length > 0; });
  }

  function az(items) { return items.slice().sort(function (a, b) { return a.text.localeCompare(b.text); }); }
  // Every word typed, in any order and any case, is in the measure's plain name
  function matches(m, words) {
    var name = m.label.toLowerCase();
    return words.every(function (w) { return name.indexOf(w) >= 0; });
  }

  // One measure: its radio, its name, and its kind of value in a glyph and a word beside it (never colour alone).
  function row(m, ctx) {
    var input = el('input', { type: 'radio', name: ctx.name, value: m.id, class: 'tap-custom__radio', 'data-custom': 'measure', 'data-value': m.id });
    input.checked = m.id === ctx.current;
    input.addEventListener('change', function () { if (input.checked) ctx.onPick(m.id); });
    return el('li', { class: 'tap-custom__row' }, el('label', { class: 'tap-custom__opt' }, [
      input,
      el('span', { class: 'tap-custom__name' }, m.text),
      el('span', { class: 'tap-custom__kind' }, [
        el('span', { class: 'tap-custom__glyph', 'aria-hidden': 'true' }, t('kinds.' + m.group + '.glyph')), ' ' + t('kinds.' + m.group + '.word')])
    ]));
  }
  function rows(items, ctx) { return el('ul', { class: 'tap-custom__radios' }, items.map(function (m) { return row(m, ctx); })); }

  // A topic: its key measures (the current one first when it is not a key one), or all of them, A to Z.
  function topicView(box, tp, ctx, state, redraw) {
    var short = tp.key.slice(), cur = tp.items.filter(function (m) { return m.id === ctx.current; })[0];
    if (cur && short.indexOf(cur) < 0) short.unshift(cur);
    var full = state.expanded || !tp.key.length;
    box.appendChild(rows(full ? az(tp.items) : short, ctx));
    if (!tp.key.length || tp.items.length <= short.length) return;
    box.appendChild(el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-custom__more', 'data-action': 'custom-more',
      'aria-expanded': String(!!state.expanded), onclick: function () {
        state.expanded = !state.expanded;
        redraw();
        var again = TAP.dom.qs('[data-action="custom-more"]', box);
        if (again) again.focus({ preventScroll: true });
      } }, state.expanded ? t('fewer') : t('more', { n: tp.items.length, topic: tp.label })));
  }

  // The matches of every topic, under topic headings; a line when nothing matches.
  function searchView(box, tps, ctx, query, status) {
    var words = query.toLowerCase().split(/\s+/).filter(Boolean), n = 0;
    tps.forEach(function (tp) {
      var hits = az(tp.items.filter(function (m) { return matches(m, words); }));
      if (!hits.length) return;
      n += hits.length;
      box.appendChild(el('div', { class: 'tap-custom__group', 'data-topic': tp.id }, [el('h3', { class: 'tap-custom__topic' }, tp.label), rows(hits, ctx)]));
    });
    if (!n) box.appendChild(el('p', { class: 'tap-custom__none' }, t('find.none', { query: query })));
    TAP.dom.text(status, n ? t(n === 1 ? 'find.one' : 'find.count', { n: n }) : '');
  }

  // Left and Right (or Up and Down) move along the topic buttons; Enter or Space picks one.
  function arrows(group) {
    group.addEventListener('keydown', function (e) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      var bs = TAP.dom.qsa('button', group), i = bs.indexOf(document.activeElement);
      if (!step || i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      bs[(i + step + bs.length) % bs.length].focus();
    });
  }

  /*
   * Draws the picker for the list of choices (from the builder: {id, label, text, group}), with current selected.
   * state ({topic, expanded, query, synced}) is the builder's, so a redraw keeps the topic, "Show all" and the search;
   * a new current measure from elsewhere (a spec, a kept chart) brings its own topic. onPick(id) on a choice.
   */
  function render(list, current, state, onPick) {
    var tps = topics(list), n = ++seq, ids = tps.map(function (x) { return x.id; });
    if (state.synced !== current || ids.indexOf(state.topic) < 0) {
      var mine = topicOf(current);
      if (mine !== state.topic) state.expanded = false;
      state.topic = ids.indexOf(mine) >= 0 ? mine : ids[0];
      state.synced = current;
    }
    var ctx = { name: 'tap-custom-measure-' + n, current: current, onPick: onPick };
    var findId = 'tap-custom-find-' + n, box = el('div', { class: 'tap-custom__choices' }), status = el('p', { class: 'tap-custom__found', role: 'status' });
    var input = el('input', { type: 'search', id: findId, class: 'tap-field tap-custom__find', 'data-custom': 'find', autocomplete: 'off', spellcheck: 'false' });
    input.value = state.query || '';
    var group = el('div', { class: 'tap-panel__seg tap-custom__topics', role: 'group', 'aria-label': t('topic'), 'data-control': 'custom-topic' },
      tps.map(function (tp) {
        return el('button', { type: 'button', class: 'tap-panel__seg-opt', 'data-value': tp.id, onclick: function () {
          state.topic = tp.id; state.expanded = false; state.query = ''; input.value = '';
          draw();
        } }, tp.label);
      }));
    arrows(group);

    function draw() {
      var q = (state.query || '').trim();
      TAP.dom.qsa('button', group).forEach(function (b) { b.setAttribute('aria-pressed', String(!q && b.getAttribute('data-value') === state.topic)); });
      TAP.dom.clear(box);
      TAP.dom.text(status, '');
      if (q) searchView(box, tps, ctx, q, status);
      else topicView(box, tps.filter(function (x) { return x.id === state.topic; })[0], ctx, state, draw);
    }
    input.addEventListener('input', function () { state.query = input.value; draw(); });
    draw();
    return el('fieldset', { class: 'tap-custom__measure', 'data-custom-picker': '' }, [
      el('legend', { class: 'tap-custom__label' }, t('measure')),
      el('div', { class: 'tap-custom__findrow' }, [el('label', { class: 'tap-custom__findlabel', for: findId }, t('find.label')), input, status]),
      group, box
    ]);
  }

  TAP.customPicker = { render: render, topicOf: topicOf, topics: topics };
})(window.TAP);
