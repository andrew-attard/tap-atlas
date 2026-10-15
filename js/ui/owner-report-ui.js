/*
 * File: js/ui/owner-report-ui.js
 * Purpose: The "Reports for workbook owners" list (US-1.8.11, D166) the Import report and the data sources panel show: an
 *          intro sentence, one row per workbook with its item count, Download (the self-contained HTML page) and Copy as
 *          text (the plain-text version, for an email), then one row for all workbooks with Download. A workbook with
 *          nothing to review keeps its row, so every leader can get a report. Every word comes from
 *          content/text-owner-report.js (ownerReport.ui).
 * Provides: TAP.ownerReportUi (render)
 * Depends on: js/core/dom.js, js/core/content.js, js/ui/owner-report.js (build, buildAll, download, countText),
 *             js/panel/panel-table.js (clipboard, at call time)
 * Used by: js/ui/import-report.js, js/ui/sources-panel.js
 * Owner: REPORTS stream (#616)
 *
 * render(regions, opts) → section element. regions: [{ name, fileName, fileModified, importedAt, items }] as
 * TAP.ownerReport takes them; opts.level the heading tag ('h4' by default, 'h3' in the data sources panel); opts.className
 * extra classes for the section, so each panel can style it as its neighbours.
 */
(function (TAP) {
  'use strict';

  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('ownerReport.ui.' + key, vars); }

  function button(label, aria, onclick) {
    return el('button', { type: 'button', class: 'tap-btn', 'aria-label': aria, onclick: onclick }, label);
  }

  // One workbook's row: its name, the count, Download and Copy as text
  function row(r, ui) {
    return el('li', { class: 'tap-own__row', 'data-region': r.name }, [
      el('span', { class: 'tap-own__name' }, r.name),
      el('span', { class: 'tap-own__count tap-muted' }, TAP.ownerReport.countText(r)),
      button(t('download'), t('downloadOne', { region: r.name }), function () { save(TAP.ownerReport.build(r), ui); }),
      button(t('copy'), t('copyOne', { region: r.name }), function () { copy(TAP.ownerReport.build(r).text, ui); })
    ]);
  }

  // The last row: every workbook in one page
  function allRow(regions, ui) {
    return el('li', { class: 'tap-own__row tap-own__all' }, [
      el('span', { class: 'tap-own__name' }, t('all')),
      button(t('download'), t('downloadAll'), function () { save(TAP.ownerReport.buildAll(regions), ui); })
    ]);
  }

  function say(ui, msg) { TAP.dom.text(ui.status, msg); }

  function save(report, ui) {
    TAP.ownerReport.download(report);
    say(ui, t('saved', { name: report.fileName }));
  }

  // The clipboard first; where it is refused (file://), the text is shown selected, to copy by hand (as the Import panel does)
  function copy(text, ui) {
    return Promise.resolve(TAP.panelTable.clipboard(text)).then(function (ok) {
      say(ui, t(ok ? 'copied' : 'copyManual'));
      ui.text.hidden = !!ok;
      if (ok) return;
      ui.text.value = text;
      ui.text.select();
    });
  }

  function render(regions, opts) {
    opts = opts || {};
    var list = regions || [], ui = {
      status: el('p', { class: 'tap-own__status', role: 'status', 'aria-live': 'polite' }),
      text: el('textarea', { class: 'tap-field tap-own__text', readonly: 'readonly', rows: '10', hidden: true, 'aria-label': t('textLabel') })
    };
    return el('section', { class: 'tap-own' + (opts.className ? ' ' + opts.className : '') }, [
      el(opts.level || 'h4', null, t('title')),
      el('p', { class: 'tap-own__intro' }, t('intro')),
      el('ul', { class: 'tap-own__list' }, list.map(function (r) { return row(r, ui); }).concat(list.length ? [allRow(list, ui)] : [])),
      ui.status, ui.text
    ]);
  }

  TAP.ownerReportUi = { render: render };
})(window.TAP);
