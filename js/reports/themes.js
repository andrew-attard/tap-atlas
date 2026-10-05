/*
 * File: js/reports/themes.js
 * Purpose: Finds recurring themes in commentary and success factors with the keyword rules in config/comment-themes.js, and draws the themes report (US-2.5.1).
 * Provides: TAP.themes (all, match, config), builder 'themes'
 * Depends on: config/comment-themes.js, content/text-themes.js, js/core/data.js, js/core/content.js, js/core/sources.js,
 *             js/core/dom.js, js/engine/scope.js, js/engine/shapes.js (drawing kit), js/engine/registry.js
 * Used by: js/insights/rules-themes.js, config/reports-themes.js (nb-themes), js/panel/panel.js
 * Owner: INSIGHTS2 stream (#72)
 *
 * Keyword rules, run by this app (D63): a text counts for a theme when it holds one of the theme's keywords as a
 * whole word or phrase, in any case. No model, no service, no network call.
 */
(function (TAP) {
  'use strict';

  var FIELDS = [{ section: 'newBusiness', field: 'successFactors' }, { section: 'marketCoverage', field: 'commentary' }];

  function config() {
    var c = window.TAP_COMMENT_THEMES || {};
    return { minRegions: typeof c.minRegions === 'number' ? c.minRegions : 3, themes: c.themes || [] };
  }
  function t(key, vars) { return TAP.content.text('themes.' + key, vars); }
  function esc(s) { return TAP.dom.esc(s); }

  // A keyword as a whole word or phrase: no letter (accented ones too) or digit may run on at either end; the words
  // of a phrase may be joined by any spaces or a hyphen ("case-study").
  function pattern(keyword) {
    var words = String(keyword).trim().split(/[\s-]+/).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    return new RegExp('(^|[^\\p{L}\\p{N}])' + words.join('[\\s-]+') + '($|[^\\p{L}\\p{N}])', 'iu');
  }
  function mentions(text, theme) {
    return (theme.keywords || []).some(function (k) { return pattern(k).test(text); });
  }
  function match(text) {
    if (typeof text !== 'string' || !text.trim()) return [];
    return config().themes.filter(function (th) { return mentions(text, th); }).map(function (th) { return th.id; });
  }

  // Every success factor and comment of a region, one quote per distinct text, with the source of its first row.
  function texts(r) {
    var out = [], byText = {};
    FIELDS.forEach(function (f) {
      (r[f.section] || []).forEach(function (row) {
        var s = row[f.field];
        if (typeof s !== 'string' || !s.trim()) return;
        var k = f.field + '|' + s.trim();
        if (byText[k]) { byText[k].rows++; if (row.industryId && byText[k].industryIds.indexOf(row.industryId) < 0) byText[k].industryIds.push(row.industryId); return; }
        byText[k] = { text: s.trim(), field: f.field, industryIds: row.industryId ? [row.industryId] : [], rows: 1,
          src: { regionId: r.id, section: f.section, field: f.field, row: row.sourceRow, year: null, cell: null, kind: 'IN' } };
        out.push(byText[k]);
      });
    });
    return out;
  }

  // Themes with the regions (file order) and quotes that mention them, ranked by regions, then configuration order.
  function all(regionIds) {
    var regions = TAP.data.regions().filter(function (r) { return !regionIds || regionIds.indexOf(r.id) >= 0; });
    var quotes = regions.map(function (r) { return { regionId: r.id, list: texts(r) }; });
    var list = config().themes.map(function (th, i) {
      var found = quotes.map(function (q) {
        return { regionId: q.regionId, quotes: q.list.filter(function (x) { return mentions(x.text, th); }) };
      }).filter(function (q) { return q.quotes.length; });
      return { id: th.id, label: th.label, plural: !!th.plural, keywords: (th.keywords || []).slice(), regions: found, order: i };
    });
    return list.sort(function (a, b) { return b.regions.length - a.regions.length || a.order - b.order; });
  }

  /* ---------- the report ---------- */

  function rname(id) { return TAP.content.regionName(TAP.data.region(id)); }
  function industries(ids) { return TAP.format.list(ids.map(function (id) { var d = TAP.data.industry(id); return d ? d.name : id; })); }
  function address(src) { try { return TAP.sources.address(src).text || ''; } catch (e) { return ''; } }
  function focusOf(cmp) { return cmp && (cmp.mode === 'one' || cmp.mode === 'pair') ? cmp.focus : null; }

  function selected(ctx, list) {
    var hl = ctx.highlight && ctx.highlight.reportId === ctx.def.id ? ctx.highlight.theme : null;
    var want = (ctx.opts && ctx.opts.theme) || hl;
    var hit = list.filter(function (x) { return x.id === want; })[0];
    return hit || list.filter(function (x) { return x.regions.length; })[0] || list[0] || null;
  }

  function bars(list, total, pick, hl) {
    return '<ol class="tap-themes__bars" aria-label="' + esc(t('barsLabel')) + '">' + list.map(function (x) {
      var on = pick && x.id === pick.id, n = x.regions.length;
      return '<li><button type="button" class="tap-themes__bar' + (on ? ' is-selected' : '') + (hl === x.id ? ' is-hl' : '') +
        '" data-tap-opt="theme" data-tap-value="' + esc(x.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="tap-themes__label">' + esc(x.label) + '</span>' +
        '<span class="tap-themes__track"><span class="tap-themes__fill" style="width:' + (total ? Math.round(100 * n / total) : 0) + '%"></span></span>' +
        '<span class="tap-themes__n">' + esc(t('regions', { n: n, total: total })) + '</span></button></li>';
    }).join('') + '</ol>';
  }

  // The chosen theme's quotes, by region: the focus region first, then file order.
  function quotes(pick, focus) {
    if (!pick) return '';
    var regions = pick.regions.slice().sort(function (a, b) { return (b.regionId === focus) - (a.regionId === focus); });
    var head = '<h3 class="tap-themes__title">' + esc(t('quotesTitle', { theme: pick.label })) + '</h3>' +
      '<p class="tap-themes__keywords">' + esc(t('keywords', { list: pick.keywords.join(', ') })) + '</p>';
    if (!regions.length) return '<section class="tap-themes__quotes">' + head + '<p>' + esc(t('noQuotes', { theme: pick.label })) + '</p></section>';
    return '<section class="tap-themes__quotes">' + head + regions.map(function (g) {
      return '<div class="tap-themes__region' + (g.regionId === focus ? ' is-focus' : '') + '" data-region="' + esc(g.regionId) + '">' +
        '<h4 class="tap-themes__name">' + esc(rname(g.regionId)) + '</h4><ul class="tap-themes__list">' + g.quotes.map(function (q) {
          var from = t('from.' + q.field, { industry: industries(q.industryIds) }) + (q.rows > 1 ? ' (' + t('rows', { n: q.rows }) + ')' : '');
          return '<li class="tap-themes__quote"><q>' + esc(q.text) + '</q> <span class="tap-themes__src">' + esc(from) + ' · ' +
            esc(address(q.src)) + '</span></li>';
        }).join('') + '</ul></div>';
    }).join('') + '</section>';
  }

  // A theme's figures are counted by this app over the regions in scope: a count source naming those regions.
  function counted(ids) {
    var none = silent(ids);
    return { combined: true, how: 'count', regionIds: ids.slice(), excluded: none, notApplicable: [] };
  }
  // Regions in scope with neither success factors nor commentary: nothing to count, so not provided.
  function silent(ids) {
    return TAP.data.regions().filter(function (r) { return ids.indexOf(r.id) >= 0 && !texts(r).length; }).map(function (r) { return r.id; });
  }
  function silentRegions(ids) { return silent(ids).map(rname); }
  function table(list, ids) {
    var c = function (k, unit, align) { return { key: k, label: t('columns.' + k), unit: unit, align: align || 'left' }; };
    return { columns: [c('theme', 'text'), c('regions', 'count', 'right'), c('names', 'text'), c('keywords', 'text')],
      rows: list.map(function (x) {
        var src = counted(ids), cell = function (v) { return { v: v, state: 'value', kind: 'APP', src: src }; };
        return { entityId: x.id, src: src, cells: { theme: cell(x.label), regions: cell(x.regions.length),
          names: cell(TAP.format.list(x.regions.map(function (g) { return rname(g.regionId); }))), keywords: cell(x.keywords.join(', ')) } };
      }) };
  }

  function build(ctx) {
    var K = TAP.shapes.kit, ids = TAP.scope.regionIds(ctx.cmp), list = all(ids), pick = selected(ctx, list);
    var none = !list.length || !TAP.data.regions().some(function (r) { return ids.indexOf(r.id) >= 0 && texts(r).length; });
    var unmentioned = list.filter(function (x) { return !x.regions.length; }).map(function (x) { return x.label; });
    var hl = ctx.highlight && ctx.highlight.reportId === ctx.def.id ? ctx.highlight.theme : null;
    var res = K.result(ctx.def, null, { empty: none, missing: silentRegions(ids), table: table(list, ids),
      notes: [t('counted')].concat(unmentioned.length ? [t('notMentioned', { list: TAP.format.list(unmentioned) })] : []),
      controls: [{ key: 'theme', label: t('pick'), kind: 'select', value: pick ? pick.id : null,
        options: list.map(function (x) { return { value: x.id, label: x.label }; }) }] });
    if ((ctx.type || ctx.def.defaultType) !== 'table' && !none) {
      res.html = '<div class="tap-themes">' + bars(list, ids.length, pick, hl) + quotes(pick, focusOf(ctx.cmp)) + '</div>';
    }
    return res;
  }

  TAP.themes = { all: all, match: match, config: config };
  TAP.builders.register('themes', TAP.shapes.kit.safely(build));
})(window.TAP);
