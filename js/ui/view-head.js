/*
 * File: js/ui/view-head.js
 * Purpose: The header every Phase 2 view opens with: a kicker, the view's question as its title, a lead line,
 *          a slot for the "how to read this view" tip (US-2.6.2), and a headline sentence taken from the most
 *          significant insight attached to the view's reports, with its "Show me" link (US-2.1.1, US-2.2.1, US-2.3.1)
 *          and its line on why it matters under it (D111; context insights never head a view).
 *          Also the shared layout helpers the Phase 2 views use: a safe panel mount and a two-panel row.
 * Provides: TAP.viewHead (render, headline, mountPanel, pair, tip, hideTips, showTips, tipsHidden)
 * Depends on: js/core/dom.js, js/core/content.js, js/core/store.js, config/views.js, js/insights/engine.js and
 *             js/panel/panel.js (at call time)
 * Used by: js/views/new-business.js, customers.js, partners.js, regions.js; tip() also by the Phase 1 views
 *          (overview.js, industry.js, insights.js, guide.js)
 *
 * The tip line (US-2.6.2, PAGES2): one line per view from content/text-pages.js (viewTips.<view id>), with a
 * "Hide tips" button. Hiding lasts for the session only: it is held in memory here, never stored, so a reload
 * brings the tips back.
 */
(function (TAP) {
  'use strict';
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  var tipsOff = false;

  // The view's tip line, or null when the content files have none for it.
  function tip(viewId) {
    var key = 'viewTips.' + viewId, text = TAP.content.text(key);
    if (!text || text === '[' + key + ']') return null;
    return el('p', { class: 'tap-vh__tip', 'data-part': 'tip', 'data-view': viewId, hidden: tipsOff }, [
      el('span', { class: 'tap-vh__tiptext' }, text),
      el('button', { type: 'button', class: 'tap-btn tap-btn--ghost tap-vh__tiphide', onclick: hideTips },
        TAP.content.text('viewTips.hide'))
    ]);
  }
  function setTips(off) {
    tipsOff = off;
    TAP.dom.qsa('.tap-vh__tip[data-view]').forEach(function (n) { n.hidden = off; });
  }
  function hideTips() { setTips(true); }
  function showTips() { setTips(false); }

  // The first insight attached to any report on the view, for the current comparison, or null. Insights come in the
  // engine's order: theme insights after every figure-based one (D80), then by significance.
  function late(x) { return x.family === 'themes' ? 1 : 0; }
  function headline(viewId, cmp) {
    var I = TAP.insights, reports = ((window.TAP_VIEWS || {})[viewId] || {}).reports || [];
    if (!I || I.__stub || !reports.length) return null;
    var best = null;
    reports.forEach(function (id) {
      var list = [];
      try { list = I.ranked(cmp, { reportId: id }) || []; } catch (e) { list = []; }
      list.forEach(function (x) {
        if (!best || late(x) - late(best) < 0 || (late(x) === late(best) && x.significance > best.significance)) best = x;
      });
    });
    return best;
  }

  function drawHeadline(box, viewId) {
    TAP.dom.clear(box);
    // No insight: no headline line at all. Panels have no takeaway, so it never repeats one (D120 retires D83)
    var x = headline(viewId, TAP.store.get().cmp);
    if (!x) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(el('p', { class: 'tap-vh__headline-text' }, x.sentence));
    box.appendChild(el('button', { type: 'button', class: 'tap-btn tap-vh__showme', 'data-insight': x.id,
      onclick: function () { TAP.bus.emit('showme', { insightId: x.id, target: x.highlight }); } },
    TAP.content.text('viewHead.showMe')));
    if (x.why) box.appendChild(el('p', { class: 'tap-vh__why' }, x.why));
  }

  // opts: {viewId, kicker, title, lead}. Returns {el, tipEl, refresh(), destroy()}.
  function render(root, opts) {
    var tip = TAP.viewHead.tip(opts.viewId) || el('p', { class: 'tap-vh__tip', 'data-part': 'tip', hidden: true });
    var line = el('div', { class: 'tap-vh__headline', 'data-part': 'headline', 'aria-live': 'polite' });
    var head = el('header', { class: 'tap-vh', 'data-view': opts.viewId }, [
      opts.kicker ? el('span', { class: 'tap-vh__kicker' }, opts.kicker) : null,
      el('h1', { class: 'tap-vh__title' }, opts.title),
      opts.lead ? el('p', { class: 'tap-vh__lead' }, opts.lead) : null,
      tip, line
    ]);
    root.appendChild(head);
    drawHeadline(line, opts.viewId);
    var off = TAP.store.on(function (s, changed) {
      if (!head.isConnected) { off(); return; }
      if (['cmp', 'scopeEpoch', 'hiddenInsights'].some(function (k) { return changed.indexOf(k) >= 0; })) drawHeadline(line, opts.viewId);
    });
    return { el: head, tipEl: tip, refresh: function () { drawHeadline(line, opts.viewId); },
      destroy: function () { if (typeof off === 'function') off(); } };
  }

  // A report panel. If it can't be drawn, the slot says so instead of breaking the view.
  function mountPanel(slot, reportId, opts) {
    try { return TAP.panel.create(slot, reportId, opts || {}); } catch (e) {
      TAP.dom.clear(slot);
      slot.appendChild(el('p', { class: 'tap-stub' }, e.message));
      return null;
    }
  }

  // At most two panels side by side (D24); one column on narrow screens.
  function pair(slots) { return el('div', { class: 'tap-vh-pair' }, slots); }

  TAP.viewHead = { render: render, headline: headline, mountPanel: mountPanel, pair: pair,
    tip: tip, hideTips: hideTips, showTips: showTips, tipsHidden: function () { return tipsOff; } };
})(window.TAP);
