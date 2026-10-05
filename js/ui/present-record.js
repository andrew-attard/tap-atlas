/*
 * File: js/ui/present-record.js
 * Purpose: Records a running order from the screen (US-3.1.3, D65): "Add to running order" in a panel's More menu
 *          keeps the chart as it is on screen; the Guide lists the recorded steps to move, remove, try or copy as
 *          the text of config/running-order.js. Kept in this browser only, through TAP.storage; never writes a file.
 * Provides: TAP.presentRecord (record, recorded, move, remove, clearRecorded, asFileText, fromPanel), and the
 *           "Running order" Guide section (TAP.guideExtras)
 * Depends on: js/core/storage.js, js/core/dom.js, js/core/content.js, js/engine/registry.js, js/engine/prepare.js,
 *             js/engine/shapes.js, js/engine/scope.js, js/core/store.js, js/panel/panel-table.js (clipboard),
 *             js/ui/present.js (start) (all at call time)
 * Used by: js/ui/present.js (TAP.present delegates to it), js/panel/panel-menus.js (Add to running order),
 *          js/views/guide.js (Guide extras)
 * Owner: PRESENT stream (#234)
 */
(function (TAP) {
  'use strict';

  var KEY = 'runningOrder.recorded';
  var el = function () { return TAP.dom.el.apply(null, arguments); };
  function t(key, vars) { return TAP.content.text('present.' + key, vars); }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- the recorded steps ---------- */

  function recorded() {
    var list;
    try { list = TAP.storage.get(KEY, []); } catch (e) { list = []; }
    // Only step objects: a damaged stored list must not break the Guide section that offers "Remove all" (#367)
    return Array.isArray(list) ? list.filter(function (s) { return !!s && typeof s === 'object' && !Array.isArray(s); }) : [];
  }
  function save(list) { TAP.storage.set(KEY, list); redraw(); }

  // Adds a step at the end; returns how many steps are recorded.
  function record(step) {
    if (!step || typeof step !== 'object') return recorded().length;
    var list = recorded();
    list.push(copy(step));
    save(list);
    return list.length;
  }

  // Moves step i by d places (-1 up, 1 down). False when it can't move.
  function move(i, d) {
    var list = recorded(), j = i + d;
    if (i < 0 || i >= list.length || j < 0 || j >= list.length) return false;
    var s = list[i];
    list[i] = list[j];
    list[j] = s;
    save(list);
    return true;
  }

  function remove(i) {
    var list = recorded();
    if (i < 0 || i >= list.length) return false;
    list.splice(i, 1);
    save(list);
    return true;
  }

  function clearRecorded() { TAP.storage.remove(KEY); redraw(); }

  /* ---------- from a panel (the More menu) ---------- */

  // The comparison as a step writes it: only the keys its mode uses.
  function cmpOf(c) {
    var out = { mode: c.mode };
    if (c.mode === 'one' || c.mode === 'pair') out.focus = c.focus;
    if (c.mode === 'pair') out.second = c.second;
    if (c.mode === 'set') out.set = (c.set || []).slice();
    if (c.mode === 'one') { out.restAs = c.restAs; out.restAgg = c.restAgg; }
    return out;
  }

  /*
   * The step for panel p as it is on screen (b: its build): the report, or a custom chart's spec with its type
   * (CUSTOM keeps def.spec); the measure, chart type and breakdown; and the panel's comparison, its own when it has
   * one. Below the top drill level only the report and comparison are kept (no title either): the level depends on
   * the click above.
   */
  function stepOf(p, b) {
    var def = b.def, top = !p.drill || !p.drill.depth();
    var step = top && b.title ? { title: b.title } : {};   // a lower level's title names the click above it
    var type = p.st.table && b.ctx.type !== 'list' ? 'table' : b.ctx.type;   // the table view records as 'table'
    if (def.custom && def.spec) step.custom = Object.assign({}, def.spec, top ? { type: type } : {});
    else step.report = p.id;
    if (top && !def.custom) {
      if ((def.measures || []).length > 1) step.measure = TAP.prepare.selected(def, { measureId: p.st.measureId });
      step.type = type;
      if (p.st.breakdown) step.breakdown = p.st.breakdown;
      else if (def.defaultBreakdown) step.breakdown = 'none';   // "None" chosen over the report's own breakdown
    }
    if (top && b.industryId) step.industry = b.industryId;
    step.cmp = cmpOf(p.cmp());
    return step;
  }

  // Records the panel and returns the line the panel shows.
  function fromPanel(p, b) { return t('added', { n: record(stepOf(p, b)) }); }

  /* ---------- the file text (Copy running order) ---------- */

  // The header of config/running-order.js, so the pasted file explains every field just as the original does.
  var HEAD = [
    '/*',
    ' * File: config/running-order.js',
    ' * Purpose: The running order for presentation mode: the steps of the meeting, in order (US-3.1.1). "Present"',
    ' *          (beside the data date) or the P key shows them one at a time, full screen. Steps can also be recorded',
    ' *          from the screen ("Add to running order" in a chart\'s More menu) and copied from the Guide as the text',
    ' *          of this file.',
    ' * Provides: window.TAP_RUNNING_ORDER',
    ' * Depends on: nothing',
    ' * Used by: js/ui/present.js, js/ui/present-steps.js',
    ' * Owner: PRESENT stream',
    ' *',
    ' * Each step names exactly one of these three:',
    ' *   report     the id of a chart, for example \'nb-levers\' (the ids are in config/reports-*.js)',
    ' *   insight    the id of an insight, for example \'consensus:education\'. The step shows the insight\'s chart with',
    ' *              the insight highlighted, and the insight\'s sentence as its title',
    ' *   custom     a custom chart: {measure, by, type}, or a full chart definition copied from the app',
    ' * and may also set any of these (leave one out to get the chart\'s usual setting):',
    ' *   title      a short title, shown in the progress row with "Step 3 of 11"',
    ' *   measure    which of the chart\'s measures to show, for example \'nb.wins\'',
    ' *   type       the chart type, for example \'bar\', \'dot\', \'heatmap\' or \'stacked100\' (one the chart offers),',
    ' *              or \'table\' for the table view',
    ' *   breakdown  break the chart down by \'year\', \'industry\', \'channel\', \'motion\', \'segment\' or \'risk\' (if offered),',
    ' *              or \'none\' for no breakdown on a chart that starts with one',
    ' *   industry   the industry id a one-industry chart shows (the ratings, for example)',
    ' *   cmp        what to compare, as in the comparison bar:',
    ' *                mode     \'all\' (all regions), \'one\' (one against the rest), \'pair\' (one against one),',
    ' *                         \'set\' (a chosen set) or \'org\' (the organization total)',
    ' *                focus    the region id the comparison is about (\'one\' and \'pair\')',
    ' *                second   the other region id (\'pair\')',
    ' *                set      a list of at least two region ids (\'set\')',
    ' *                restAgg  the rest as an \'average\' or a \'total\' (\'one\'); rest is accepted as a shorter name',
    ' *                restAs   the rest \'combined\' into one figure or shown \'individual\'ly (\'one\')',
    ' *              The comparison applies to that step only. Leaving presentation mode restores the screen as it was.',
    ' *   highlight  what to outline: {regionIds: [...], industryIds: [...], mark: \'bar\'}; mark is \'bar\', \'points\',',
    ' *              \'cell\', \'industryRow\', \'regionColumn\' or \'quadrant\', as the chart draws it',
    ' * A step that names a chart, measure, region or insight this data doesn\'t have is left out when presentation',
    ' * starts, and listed in the data sources panel. The rest still run.',
    ' */'
  ];

  function key(k) { return /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k); }
  function lit(v) {
    if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
    if (v && typeof v === 'object') {
      return '{ ' + Object.keys(v).filter(function (k) { return v[k] !== undefined; })
        .map(function (k) { return key(k) + ': ' + lit(v[k]); }).join(', ') + ' }';
    }
    if (typeof v === 'string') {
      return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + "'";
    }
    return JSON.stringify(v === undefined ? null : v);
  }

  // The steps (the recorded ones by default) as the text of config/running-order.js, ready to paste over it.
  function asFileText(steps) {
    var list = steps || recorded();
    return HEAD.join('\n') + '\nwindow.TAP_RUNNING_ORDER = {\n  steps: [\n' +
      list.map(function (s, i) { return '    ' + lit(s) + (i < list.length - 1 ? ',' : ''); }).join('\n') +
      (list.length ? '\n' : '') + '  ]\n};\n';
  }

  /* ---------- the Guide section ---------- */

  var hosts = [];   // Guide sections on screen, redrawn after any change
  function redraw() {
    hosts = hosts.filter(function (h) { return h.isConnected; });
    hosts.forEach(draw);
  }

  // What a step shows, in words: chart type, measure, breakdown and comparison, as far as the step sets them.
  function meta(s) {
    var def = s.report ? reportOf(s.report) : null, parts = [];
    if (s.insight) parts.push(t('guide.insight'));
    if (s.custom) parts.push(t('guide.custom'));
    var type = s.type || (s.custom && s.custom.type);
    if (type) parts.push(TAP.shapes.label(type));
    var m = def && (def.measures || []).filter(function (x) { return x.id === s.measure; })[0];
    if (m) parts.push(m.label);
    if (s.breakdown) parts.push(t('guide.by', { dim: TAP.content.text(s.breakdown === 'none' ? 'panel.breakdownNone' : 'panel.breakdowns.' + s.breakdown) }));
    var ind = s.industry && TAP.data.industry(s.industry);
    if (ind) parts.push(ind.name);
    try { if (s.cmp) parts.push(TAP.scope.sentence(Object.assign(TAP.store.defaults().cmp, s.cmp))); } catch (e) { /* unknown region */ }
    return parts.join(' · ');
  }

  function reportOf(id) { var f = TAP.presentSteps.reportDef(id); return f ? f.def : null; }

  function nameOf(s) {
    var def = s.report ? reportOf(s.report) : null;
    return s.title || (def && def.title) || s.report || s.insight || t('guide.custom');
  }

  function btn(action, label, fn, off) {
    return el('button', { type: 'button', class: 'tap-btn tap-ro__btn', 'data-ro': action, disabled: off || null, onclick: fn }, label);
  }

  function say(host, msg) { TAP.dom.text(TAP.dom.qs('.tap-ro__status', host), msg || ''); }

  function copyOut(host) {
    var text = asFileText(), box = TAP.dom.qs('.tap-ro__text', host);
    TAP.panelTable.clipboard(text).then(function (ok) {
      say(host, t(ok ? 'guide.copied' : 'guide.copyFailed'));
      if (ok || !box) return;
      box.value = text;   // the clipboard was refused: the text to select and copy by hand
      box.hidden = false;
      box.select();
    });
  }

  function play(host, steps) {
    var res = TAP.present.start(steps);
    if (!res.started) say(host, res.message);
  }

  function draw(host) {
    var steps = recorded(), n = steps.length;
    TAP.dom.clear(host);
    TAP.dom.append(host, [
      el('p', { class: 'tap-ro__intro' }, t('guide.intro')),
      n ? el('ol', { class: 'tap-ro__list' }, steps.map(function (s, i) {
        return el('li', { class: 'tap-ro__step' }, [
          el('div', { class: 'tap-ro__what' }, [
            el('span', { class: 'tap-ro__n' }, t('stepN', { n: i + 1 })),
            el('span', { class: 'tap-ro__name' }, nameOf(s)),
            el('span', { class: 'tap-ro__meta' }, meta(s))
          ]),
          el('div', { class: 'tap-ro__btns' }, [
            btn('up', t('guide.up'), function () { move(i, -1); }, i === 0),
            btn('down', t('guide.down'), function () { move(i, 1); }, i === n - 1),
            btn('remove', t('guide.remove'), function () { remove(i); })
          ])
        ]);
      })) : el('p', { class: 'tap-ro__none' }, t('guide.none')),
      el('div', { class: 'tap-ro__actions' }, [
        n ? btn('try', t('guide.try'), function () { play(host, recorded()); }) : null,
        n ? btn('copy', t('guide.copy'), function () { copyOut(host); }) : null,
        n ? btn('clear', t('guide.clear'), function () { clearRecorded(); say(host, t('guide.cleared')); }) : null,
        btn('present', t('guide.presentFile'), function () { play(host); })
      ]),
      el('p', { class: 'tap-ro__status', role: 'status', 'aria-live': 'polite' }),
      el('textarea', { class: 'tap-field tap-ro__text', readonly: 'readonly', rows: '10', hidden: true, 'aria-label': t('guide.textLabel') })
    ]);
  }

  TAP.guideExtras = TAP.guideExtras || [];
  TAP.guideExtras.push({
    id: 'runningOrder',
    get title() { return t('guide.title'); },
    render: function (host) {
      host.classList.add('tap-ro');
      hosts.push(host);
      draw(host);
      return { destroy: function () { hosts = hosts.filter(function (h) { return h !== host; }); } };
    }
  });

  TAP.presentRecord = { record: record, recorded: recorded, move: move, remove: remove, clearRecorded: clearRecorded,
    asFileText: asFileText, fromPanel: fromPanel, stepOf: stepOf };
})(window.TAP);
