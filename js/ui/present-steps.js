/*
 * File: js/ui/present-steps.js
 * Purpose: Checks the running order and works out what each step shows: the report, its starting chart choices,
 *          the comparison, the highlight and the title (US-3.1.1, US-3.1.4). A step naming something this data or
 *          this app doesn't have is left out and noted for the data sources panel, never on the main screen.
 * Provides: TAP.presentSteps (check, resolve)
 * Depends on: config/running-order.js, js/engine/registry.js, js/engine/prepare.js, js/core/data.js, js/core/store.js
 *             (defaults, TAP.notes), js/core/content.js, js/insights/engine.js, js/engine/custom.js (all at call time)
 * Used by: js/ui/present.js (TAP.present.check, start)
 * Owner: PRESENT stream (#232)
 */
(function (TAP) {
  'use strict';

  var MODES = ['all', 'one', 'pair', 'set', 'org'];
  var REST_AS = ['combined', 'individual'];
  var REST_AGG = ['average', 'total'];
  var KINDS = ['report', 'insight', 'custom'];

  function t(key, vars) { return TAP.content.text('present.' + key, vars); }

  // Why a step is left out: the reason (a wording key) and the name that was not found.
  function Skip(reason, name) { this.reason = reason; this.name = name == null ? '' : String(name); }

  function regionIds() { return TAP.data.regions().map(function (r) { return r.id; }); }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

  function insight(id) {
    if (!TAP.insights || TAP.insights.__stub) return null;
    return (TAP.insights.all() || []).filter(function (x) { return x.id === id; })[0] || null;
  }

  // The step's comparison over the defaults. Every region it names must be in the data; what a mode needs and the
  // step leaves out comes from the regions in file order, as the comparison bar does. `rest` may stand for restAgg.
  function cmpOf(c) {
    if (c != null && !isObj(c)) throw new Skip('setting', 'cmp');
    c = Object.assign({}, c || {});
    if (c.rest != null && c.restAgg == null) c.restAgg = c.rest;
    delete c.rest;
    var out = Object.assign(TAP.store.defaults().cmp, c), ids = regionIds();
    if (MODES.indexOf(out.mode) < 0) throw new Skip('setting', out.mode);
    if (REST_AS.indexOf(out.restAs) < 0) throw new Skip('setting', out.restAs);
    if (REST_AGG.indexOf(out.restAgg) < 0) throw new Skip('setting', out.restAgg);
    if (!Array.isArray(out.set)) throw new Skip('setting', 'set');
    [out.focus, out.second].concat(out.set).forEach(function (id) {
      if (id != null && ids.indexOf(id) < 0) throw new Skip('region', id);
    });
    if ((out.mode === 'one' || out.mode === 'pair') && out.focus == null) out.focus = ids[0] || null;
    if (out.mode === 'pair' && out.second == null) out.second = ids.filter(function (id) { return id !== out.focus; })[0] || null;
    if (out.mode === 'pair' && out.second === out.focus) throw new Skip('setting', 'second');
    if (out.mode === 'set' && out.set.length < 2) throw new Skip('setting', 'set');
    return out;
  }

  // A highlight is a Target (ARCHITECTURE section 11) for the step's report.
  function highlightOf(h, reportId) {
    if (h == null) return null;
    if (!isObj(h)) throw new Skip('setting', 'highlight');
    var ids = regionIds();
    (h.regionIds || []).forEach(function (id) { if (ids.indexOf(id) < 0) throw new Skip('region', id); });
    (h.industryIds || []).forEach(function (id) { if (!TAP.data.industry(id)) throw new Skip('industry', id); });
    return Object.assign({}, h, { reportId: reportId });
  }

  // The panel's starting choices (opts.initial). With no type the report's default is used, never one remembered
  // from earlier clicking, so the meeting runs the same way every time.
  function choices(step, def, measure) {
    var own = (def.measures || []).map(function (m) { return m.id; });
    if (measure != null && own.indexOf(measure) < 0) throw new Skip('measure', measure);
    if (step.type != null && (def.types || []).indexOf(step.type) < 0) throw new Skip('type', step.type);
    var bd = step.breakdown;   // 'none': no breakdown, even on a report that starts with one
    if (bd != null && bd !== 'none' && TAP.prepare.breakdowns(def, { measureId: measure || null }).indexOf(bd) < 0) {
      throw new Skip('breakdown', bd);
    }
    var out = { type: step.type || def.defaultType, measureId: measure || null, breakdown: bd || null };
    if (step.industry != null) {   // the industry a one-industry chart shows (the ratings, for example)
      if (!TAP.data.industry(step.industry)) throw new Skip('industry', step.industry);
      out.industryId = step.industry;
    }
    return out;
  }

  // A report title with a placeholder ("{industry}") depends on the screen, so the progress row leaves it out.
  function plainTitle(def) { return /\{\w+\}/.test(def.title || '') ? '' : def.title || ''; }

  function fromReport(step) {
    var def = TAP.reports.get(step.report);
    if (!def || TAP.reports.validate(def).length) throw new Skip('report', step.report);
    return { kind: 'report', reportId: def.id, def: null, title: step.title || plainTitle(def),
      initial: choices(step, def, step.measure), highlight: highlightOf(step.highlight, def.id) };
  }

  // An insight step shows the insight's report with its "Show me" highlight, titled with the sentence (US-3.1.4).
  function fromInsight(step) {
    var ins = insight(step.insight);
    if (!ins) throw new Skip('insight', step.insight);
    var def = ins.reportId ? TAP.reports.get(ins.reportId) : null;
    if (!def) throw new Skip('noChart', step.insight);
    var hl = Object.assign({}, ins.highlight, { reportId: def.id });
    var mine = (def.measures || []).some(function (m) { return m.id === hl.measureId; });
    return { kind: 'insight', reportId: def.id, def: null, title: step.title || ins.sentence, insightId: ins.id, label: ins.label,
      initial: choices(step, def, step.measure || (mine ? hl.measureId : null)), highlight: hl };
  }

  // A custom chart: a full definition (D70), or {measure, by, type} that the custom chart engine turns into one.
  // Its id must start with "custom:", so a step can never replace one of the app's own reports.
  function fromCustom(step) {
    var c = step.custom, def = c;
    if (!isObj(c)) throw new Skip('custom', '');
    if (!(c.id && c.shape)) {
      if (!TAP.custom || TAP.custom.__stub) throw new Skip('custom', c.measure);
      def = TAP.custom.definition(c);
      if (!isObj(def) || def.errors) throw new Skip('custom', c.measure);
      if (c.type && step.type == null) step = Object.assign({}, step, { type: c.type });
    }
    if (!/^custom:/.test(String(def.id)) || TAP.reports.validate(def).length) throw new Skip('custom', def.id);
    return { kind: 'custom', reportId: def.id, def: def, title: step.title || plainTitle(def),
      initial: choices(step, def, step.measure), highlight: highlightOf(step.highlight, def.id) };
  }

  // What one step shows: {kind, reportId, def, title, cmp, initial, highlight}, and for an insight step insightId and
  // label ("Observation to discuss"). Throws a Skip when it can't be shown.
  function resolve(step) {
    if (!isObj(step)) throw new Skip('step', '');
    var named = KINDS.filter(function (k) { return step[k] != null; });
    if (named.length !== 1) throw new Skip('step', '');
    if (named[0] !== 'custom' && typeof step[named[0]] !== 'string') throw new Skip('step', '');
    var cmp = cmpOf(step.cmp);
    var out = named[0] === 'report' ? fromReport(step) : named[0] === 'insight' ? fromInsight(step) : fromCustom(step);
    out.cmp = cmp;
    return out;
  }

  /*
   * Checks a list of steps (the file's when none is given). Returns {ok: [{index, step, kind, reportId, def, title,
   * cmp, initial, highlight}], skipped: [{index, reason, name, message}]}. Each check replaces the earlier notes.
   */
  function check(steps) {
    if (steps === undefined) steps = (window.TAP_RUNNING_ORDER || {}).steps;
    var out = { ok: [], skipped: [] };
    TAP.notes.clear('presentation');
    (Array.isArray(steps) ? steps : []).forEach(function (step, i) {
      try {
        out.ok.push(Object.assign({ index: i, step: step }, resolve(step)));
      } catch (e) {
        var s = e instanceof Skip ? e : new Skip('error', e && e.message);   // one odd step never stops the others
        var message = t('skip.' + s.reason, { step: t('stepN', { n: i + 1 }), name: s.name });
        out.skipped.push({ index: i, reason: s.reason, name: s.name, message: message });
        TAP.notes.add({ source: 'presentation', message: message });
      }
    });
    return out;
  }

  TAP.presentSteps = { check: check, resolve: resolve };
})(window.TAP);
