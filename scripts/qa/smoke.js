/*
 * File: scripts/qa/smoke.js
 * Purpose: The interaction smoke test: clicks through every view, every comparison mode, the side panels, the
 *          glossary, each panel's chart types and table, expand and Esc, hiding an insight, Show me and the tour,
 *          recording each step's outcome and any error raised during it.
 * Provides: TAP_QA.smoke(done) calling done(steps), steps = [{name, ok, note, errors}]
 * Depends on: scripts/qa/hooks.js (TAP_QA.log, mark); the running app (TAP) and its class names
 * Used by: scripts/qa/qa-run.js when the address has qa=smoke
 *
 * It drives the page only through clicks and key presses on what is drawn, never
 * through the app's internals, except to read state for the checks.
 */
(function () {
  'use strict';

  var QA = window.TAP_QA;
  var PAUSE = 60;   // ms between actions, so redraws and timers run (virtual time makes it cheap)

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function shown(n) { return !!(n && n.getClientRects().length); }
  function state() { return TAP.store.get(); }
  function click(n) {
    if (!n) throw new Error('nothing to click');
    if (n.disabled) throw new Error('control is disabled: ' + (n.textContent || '').trim().slice(0, 40));
    n.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    n.click();
  }
  function esc() {
    var t = document.activeElement || document.body;
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
  }
  function choose(select, value) {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function expect(cond, msg) { if (!cond) throw new Error(msg); }
  function notBuilt() { return ((document.body.innerText || '').match(/Not built yet[^\n]*/) || [])[0]; }

  // Each step: name and a function that may return a note. Errors logged during the step fail it too.
  var steps = [];
  var plan = [];
  var pending = null;   // steps added by the running step; they run right after it
  function step(name, fn) { (pending || plan).push({ name: name, fn: fn }); }

  function runAll(done) {
    var i = 0;
    (function next() {
      if (i >= plan.length) { done(steps); return; }
      var s = plan[i++], before = QA.log.length, rec = { name: s.name, ok: true };
      QA.mark(s.name);
      pending = [];
      try {
        var note = s.fn();
        if (note) rec.note = note;
      } catch (e) {
        rec.ok = false;
        rec.note = e.message;
      }
      Array.prototype.splice.apply(plan, [i, 0].concat(pending));
      pending = null;
      setTimeout(function () {
        var errs = QA.log.slice(before).filter(function (m) { return m.level !== 'warn'; });
        if (errs.length) { rec.ok = false; rec.errors = errs.map(function (m) { return m.level + ': ' + m.text; }); }
        var nb = notBuilt();
        if (nb) { rec.ok = false; rec.note = (rec.note ? rec.note + '; ' : '') + 'on screen: ' + nb; }
        steps.push(rec);
        next();
      }, PAUSE);
    })();
  }

  function views() { return $$('.tap-menu__item[data-view]').map(function (b) { return b.getAttribute('data-view'); }); }
  function goView(v) { step('view ' + v, function () {
    click($('.tap-menu__item[data-view="' + v + '"]'));
  }); step('view ' + v + ' is on screen', function () {
    expect(state().view === v, 'state.view is ' + state().view);
    expect(($('.tap-view').innerText || '').trim().length > 0, 'view area is empty');
  }); }

  function modeSteps(v) {
    ['all', 'one', 'pair', 'set', 'org'].forEach(function (m) {
      step(v + ': mode ' + m, function () { click($('.tap-cmp__mode[data-mode="' + m + '"]')); });
      step(v + ': mode ' + m + ' applied', function () {
        expect(state().cmp.mode === m, 'state.cmp.mode is ' + state().cmp.mode);
        var s = ($('.tap-cmp__sentence') || {}).textContent || '';
        expect(s.trim().length > 0, 'no comparison sentence');
        return s.trim();
      });
      if (m === 'one') {
        // One control since the compact bar (D50): Individually | Average | Total
        ['total', 'average', 'individual'].forEach(function (a) {
          step(v + ': one, the others ' + a, function () {
            click($('[data-picker="rest"] .tap-seg__opt[data-value="' + a + '"]'));
          });
        });
        step(v + ': one, change focus', function () {
          var s = $('[data-picker="focus"] select'), opts = $$('option', s);
          choose(s, opts[opts.length - 1].value);
        });
      }
      if (m === 'pair') step(v + ': pair, change second', function () {
        var s = $('[data-picker="second"] select'), opts = $$('option', s);
        if (opts.length < 2) return 'only one region: no second region to choose';
        choose(s, opts[1].value);
      });
      if (m === 'set') step(v + ': set, add a region', function () {
        var off = $$('.tap-cmp__chip[aria-pressed="false"]')[0];
        if (off) click(off);
      });
    });
    step(v + ': back to all regions', function () { click($('.tap-cmp__mode[data-mode="all"]')); });
  }

  function layerSteps() {
    step('sources: open from the data date', function () { click($('.tap-cmp__date')); });
    step('sources: is open', function () { expect(TAP.layers.top() === 'sources', 'top layer is ' + TAP.layers.top()); });
    step('sources: close button', function () { click($('.tap-layer__close')); });
    step('sources: closed', function () { expect(!TAP.layers.top(), 'still open: ' + TAP.layers.top()); });
    step('sources: open again, then Esc', function () { click($('.tap-cmp__date')); });
    step('sources: Esc', function () { esc(); });
    step('sources: closed by Esc', function () { expect(!TAP.layers.top(), 'still open: ' + TAP.layers.top()); });
    step('combined-figures note: open and close', function () {
      var b = $('.tap-cmp__explain');
      if (!shown(b)) return 'not shown in this mode';
      click(b); click(b);
    });
  }

  function glossarySteps() {
    step('glossary: open a term popover', function () {
      var term = $$('.tap-term').filter(shown)[0];
      expect(term, 'no marked term on screen');
      click(term);
      expect(shown($('.tap-popover')), 'no popover');
    });
    step('glossary: Esc closes the popover', function () { esc(); });
    step('glossary: popover closed', function () { expect(!$('.tap-popover'), 'popover still open'); });
    step('glossary: open the full glossary from a popover', function () {
      click($$('.tap-term').filter(shown)[0]);
      var link = $('.tap-popover [data-glossary-link]');
      expect(link, 'no glossary link in the popover');
      click(link);
    });
    step('glossary: side panel is open', function () { expect(TAP.layers.top() === 'glossary', 'top layer is ' + TAP.layers.top()); });
    step('glossary: Esc', function () { esc(); });
    step('glossary: closed', function () { expect(!TAP.layers.top(), 'still open: ' + TAP.layers.top()); });
  }

  function detailsSteps() {
    step('details: open from a region card', function () {
      var b = $$('.tap-ov-card__open').filter(shown)[0];
      expect(b, 'no region card');
      click(b);
    });
    step('details: is open', function () {
      expect(TAP.layers.top() === 'details', 'top layer is ' + TAP.layers.top());
      expect(($('.tap-layer__body').innerText || '').trim().length > 0, 'details body is empty');
    });
    step('details: Esc', function () { esc(); });
    step('details: closed', function () { expect(!TAP.layers.top(), 'still open: ' + TAP.layers.top()); });
  }

  // Every chart type and the table on each panel of the current view, then expand and Esc.
  function panelSteps(v, mode) {
    var name = v + ': panels in mode ' + mode;
    step(name, function () {
      click($('.tap-cmp__mode[data-mode="' + mode + '"]'));
    });
    step(name + ', each panel', function () {
      var ids = $$('.tap-panel[data-report]').map(function (p) { return p.getAttribute('data-report'); });
      ids.forEach(function (id) { panelPlan(v + ' (' + mode + ')', id); });
      return ids.length + ' panels: ' + ids.join(', ');
    });
  }
  function panel(id) { return $('.tap-panel[data-report="' + id + '"]'); }
  function listPlan(add, id) {
    add('list drawn', function () { expect($('table.tap-list tbody tr', panel(id)), 'no list rows'); });
    add('sort by the first column', function () {
      click($('[data-tap-opt="sort"]', panel(id)));
      expect($('table.tap-list tbody tr', panel(id)), 'no rows after sorting');
    });
    add('expand', function () {
      click($('[data-action="more"]', panel(id)));
      click($('[data-action="expand"]', panel(id)));
      expect(state().expanded === id, 'state.expanded is ' + state().expanded);
    });
    add('Esc closes expanded', function () { esc(); });
    add('collapsed', function () { expect(!state().expanded, 'still expanded'); });
  }
  function panelPlan(v, id) {
    function add(name, fn) { step(v + ' / ' + id + ': ' + name, fn); }
    // A list report (US-2.7.2) is its own table: no chart type menu or table switch, so sort a column instead
    var def = TAP.reports.get(id);
    if (def && def.shape === 'list') return listPlan(add, id);
    add('open the chart type menu', function () { click($('[data-action="type"]', panel(id))); });
    add('list the chart types', function () {
      var types = $$('.tap-panel__item[data-type]', panel(id)).map(function (b) { return b.getAttribute('data-type'); });
      esc();
      types.forEach(function (ty) {
        add('type ' + ty, function () {
          click($('[data-action="type"]', panel(id)));
          click($('.tap-panel__item[data-type="' + ty + '"]', panel(id)));
          var body = $('.tap-panel__body', panel(id));
          expect(body && (body.innerText.trim().length || body.querySelector('canvas,svg,table')), 'panel body empty after ' + ty);
        });
      });
      add('table on', function () {
        click($('[data-action="table"]', panel(id)));
        expect($('table', panel(id)), 'no table drawn');
      });
      add('table off', function () { click($('[data-action="table"]', panel(id))); });
      add('expand', function () {
        click($('[data-action="more"]', panel(id)));
        click($('[data-action="expand"]', panel(id)));
        expect(state().expanded === id, 'state.expanded is ' + state().expanded);
      });
      add('Esc closes expanded', function () { esc(); });
      add('collapsed', function () { expect(!state().expanded, 'still expanded'); });
      add('about this chart', function () {
        click($('[data-action="about"]', panel(id)));
        expect(TAP.layers.top(), 'no explanation panel');
        esc();
      });
      return types.join(', ');
    });
  }

  function insightSteps() {
    step('insights: reset after Show me', function () {
      esc();
      if (state().view !== 'overview') click($('.tap-menu__item[data-view="overview"]'));
    });
  }

  // The welcome card is offered on a normal start (not in screenshot mode)
  function welcomeSteps() {
    step('welcome card: shown on start', function () {
      expect(shown($('.tap-tour-welcome')), 'no welcome card on a normal start');
    });
    step('welcome card: skip', function () { click($('.tap-tour__skipcard')); });
    step('welcome card: gone', function () { expect(!$('.tap-tour-welcome'), 'welcome card still on screen'); });
  }

  function tourSteps(from) {
    if (from === 'guide') step('tour from guide: open the guide', function () { click($('.tap-menu__item[data-view="guide"]')); });
    step('tour from ' + from + ': start', function () {
      var b = from === 'top bar' ? $('.tap-tour__button') : $('.tap-guide__tour');
      expect(shown(b), 'no tour button in the ' + from);
      click(b);
      expect(shown($('.tap-tour')), 'tour not shown');
    });
    step('tour from ' + from + ': next step', function () { click($('.tap-tour__next')); });
    step('tour from ' + from + ': back', function () { var n = $('.tap-tour__back'); if (n) click(n); });
    step('tour from ' + from + ': Esc', function () { esc(); });
    step('tour from ' + from + ': closed', function () { expect(!$('.tap-tour'), 'tour still on screen'); });
  }

  function insightsViewSteps() {
    step('insights view: open', function () { click($('.tap-menu__item[data-view="insights"]')); });
    step('insights view: filter by a region', function () { click($$('.tap-ins__chip').filter(shown)[0]); });
    step('insights view: clear the filter', function () { var c = $('.tap-ins__clear'); if (shown(c)) click(c); });
    step('insights view: figures, rule and sources', function () {
      click($$('.tap-ins__toggle').filter(shown)[0]);
      expect(shown($('.tap-ins__details')), 'details not shown');
    });
    step('insights view: copy', function () { click($$('.tap-ins__copy').filter(shown)[0]); });
    step('insights view: hide one', function () {
      var n = TAP.insights.hidden().length;
      click($$('.tap-ins__hide').filter(shown)[0]);
      expect(TAP.insights.hidden().length === n + 1, 'hidden count did not go up');
    });
    step('insights view: Show me', function () {
      var before = JSON.stringify([state().view, state().highlight, TAP.layers.top()]);
      click($$('.tap-ins__showme').filter(shown)[0]);
      var after = JSON.stringify([state().view, state().highlight, TAP.layers.top()]);
      expect(after !== before, 'Show me changed nothing (view, highlight and side panel unchanged)');
      return after;
    });
    step('insights view: reset', function () { esc(); });
  }

  function guideSteps() {
    step('guide: open', function () { click($('.tap-menu__item[data-view="guide"]')); });
    step('guide: contents link', function () { click($$('.tap-guide__tocitem').filter(shown)[1]); });
    step('guide: reset all charts', function () { click($('.tap-guide__reset')); });
    step('guide: open a view from its section', function () {
      click($$('.tap-guide__link').filter(shown)[0]);
      expect(state().view !== 'guide', 'still on the guide');
    });
  }

  QA.smoke = function (done) {
    var vs = views();
    var normal = !/[?&]screenshot=1/.test(window.location.search);
    // Say what this run covers, so a pass says what it looked at
    step('views in the menu', function () { return vs.length + ' views: ' + vs.join(', '); });
    if (normal) welcomeSteps();
    vs.forEach(function (v) {
      goView(v); modeSteps(v);
      ['all', 'pair', 'one'].forEach(function (m) { panelSteps(v, m); });
      step(v + ': back to all regions after the panels', function () { click($('.tap-cmp__mode[data-mode="all"]')); });
    });
    goView(vs[0]);
    layerSteps();
    glossarySteps();
    detailsSteps();
    insightSteps();
    insightsViewSteps();
    guideSteps();
    if (normal) tourSteps('top bar');
    tourSteps('guide');
    runAll(done);
  };
})();
