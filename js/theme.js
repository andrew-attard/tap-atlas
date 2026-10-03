/*
 * File: js/theme.js
 * Purpose: THE theme file: every colour, font, size and the logo slot, plus the chart theme built from them.
 *          To rebrand, replace this file only (US-1.1.9). It writes the CSS variables the stylesheets use.
 * Provides: window.TAP_THEME (values, shade(), regionColor(), echarts), CSS variables --tap-* on :root,
 *           the ECharts theme 'tap'
 * Depends on: vendor/echarts.min.js (optional: the chart theme is registered only if ECharts loaded first)
 * Used by: css/*.css (through the variables), js/engine/scope.js (region colours), every chart builder
 */
(function () {
  'use strict';

  var T = {
    appName: 'TAP Atlas',
    logo: null,                       // e.g. 'assets/logo.svg'. Shown 28 px tall left of the app name; no gap when null
    font: '"Archivo", "Segoe UI", system-ui, sans-serif',

    /* Page colours (the Modernist palette) */
    ground: '#f3f2f2', surface: '#eae9e9', paper: '#ffffff', ink: '#201e1d',
    muted: '#5a5656',                 // secondary text, 6.2:1 on ground
    rule: '#8c8888',                  // 2 px structural rules
    grid: '#c4c0c0',                  // chart gridlines
    onColour: '#ffffff',              // text on region colours and dark fills
    accent: '#ec3013',                // UI only: active menu item, primary action, focus ring, insight highlight
    accentHover: '#dd2b0f', accentPress: '#ae1800',
    accentDeep: '#ae1800',            // accent at body-text size
    accentTint: '#fff2ef',
    bannerSample: '#201e1d', bannerInternal: '#7c1405',

    /* Region colours, in data-file order. Never red (that means "highlight"), never grey (that means "the rest").
       Every pair stays apart by CIEDE2000 10 or more, for normal vision and for protanopia, deuteranopia and
       tritanopia (TPV-TC-027, D45). Each takes white labels at 4.5:1 or better. */
    regions: ['#274ab9', '#b16312', '#09653e', '#a45d9a', '#940078', '#118753', '#694100', '#3371e7'],
    focusGrey: '#bdb9b9',             // other regions when one is in focus
    combined: '#3d3a3a',              // "the rest" and "organization total", always
    shadeSteps: [0, 0.45, 0.7],       // lighter shades for stacked parts (mixed toward white)

    /* Tiers: neutral ink steps, so no tier reads as good or bad */
    tiers: {
      1: { bg: '#2d2b2b', fg: '#ffffff', label: 'Tier 1' },
      2: { bg: '#6b6767', fg: '#ffffff', label: 'Tier 2' },
      3: { bg: '#c9c5c5', fg: '#201e1d', label: 'Tier 3' }
    },
    notProvided: { border: '#8c8888', fg: '#5a5656' },

    /* Kinds of value: glyph and word always together, never colour */
    kinds: {
      IN: { glyph: '●', label: 'Leader input' },
      PRE: { glyph: '○', label: 'System figure' },
      DER: { glyph: '◇', label: 'Calculated in the workbook' },
      APP: { glyph: '◇', label: 'Calculated by this app' }
    },

    /* Sizes (px). Shared-screen minimums (D24): body 16, chart labels 13 */
    type: { display: 40, h1: 32, h2: 24, h3: 20, lead: 18, body: 16, label: 14, chart: 14, chartMin: 13, title: 18 },
    space: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 },
    radius: 0,
    border: { rule: 2, control: 1, focus: 2, highlight: 3 },
    shadow: {
      sm: '0 1px 2px rgba(45,43,43,.14)', md: '0 3px 10px rgba(45,43,43,.16)', lg: '0 12px 32px rgba(45,43,43,.22)'
    },
    motion: { fast: 120, panel: 160, chart: 0 },   // chart animation off: it stutters over Teams
    chartHeight: { normal: 440, tall: 560 },
    layout: { maxWidth: 1840, gutter: 24, sidePanel: 440 }
  };

  // Mixes a colour toward white by t (0 = unchanged, 1 = white). Used for stacked-part shades.
  T.mix = function (hex, t) {
    var n = parseInt(hex.slice(1), 16);
    var c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.round(v + (255 - v) * t); });
    return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
  };

  // The shade for the k-th part of a stack, from a base colour.
  T.shade = function (hex, k) { return k ? T.mix(hex, T.shadeSteps[Math.min(k, T.shadeSteps.length - 1)]) : hex; };

  // The colour for the region at a position in file order. Past the palette it repeats (scope.js warns).
  T.regionColor = function (i) { return T.regions[((i % T.regions.length) + T.regions.length) % T.regions.length]; };

  /* ---------- ECharts theme ---------- */
  var axisLabel = { color: T.ink, fontSize: T.type.chart, fontFamily: T.font };
  T.echarts = {
    color: T.regions,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: T.font, color: T.ink, fontSize: T.type.chart },
    animation: false,
    title: { textStyle: { fontSize: T.type.title, fontWeight: 800, color: T.ink } },
    legend: { textStyle: { fontSize: T.type.chart, color: T.ink }, itemWidth: 14, itemHeight: 14, icon: 'rect' },
    tooltip: {
      backgroundColor: T.ground, borderColor: T.ink, borderWidth: 2, padding: [10, 12],
      textStyle: { color: T.ink, fontSize: T.type.label, fontFamily: T.font },
      extraCssText: 'border-radius:0;box-shadow:' + T.shadow.md + ';'
    },
    categoryAxis: {
      axisLine: { show: true, lineStyle: { color: T.ink, width: 2 } },
      axisTick: { show: false }, axisLabel: axisLabel, splitLine: { show: false }
    },
    valueAxis: {
      axisLine: { show: false }, axisTick: { show: false }, axisLabel: axisLabel,
      splitLine: { show: true, lineStyle: { color: T.grid, width: 1 } },
      nameTextStyle: { color: T.muted, fontSize: T.type.chart, fontWeight: 600 }
    },
    bar: { itemStyle: { borderRadius: 0 } },
    scatter: { itemStyle: { opacity: 0.88, borderColor: T.ground, borderWidth: 1.5 } },
    radar: { axisName: { color: T.ink, fontSize: T.type.chart }, splitLine: { lineStyle: { color: T.grid } }, axisLine: { lineStyle: { color: T.grid } } },
    // Extra keys read by the app's own builders (ECharts ignores them)
    tap: {
      highlight: { color: T.accent, width: T.border.highlight, ringGap: 8 },
      quadrant: { line: T.ink, lineWidth: 2, label: T.muted, labelSize: T.type.label },
      annotation: { color: T.ink, size: T.type.label, weight: 800 },
      notProvided: { symbol: 'emptyCircle', size: 14, color: T.rule },
      bubble: { min: 10, max: 64 }
    }
  };

  /* ---------- CSS variables ---------- */
  T.cssVars = function () {
    var v = {
      font: T.font, ground: T.ground, surface: T.surface, paper: T.paper, ink: T.ink, muted: T.muted, rule: T.rule,
      grid: T.grid, 'on-colour': T.onColour, accent: T.accent, 'accent-hover': T.accentHover, 'accent-press': T.accentPress,
      'accent-deep': T.accentDeep, 'accent-tint': T.accentTint, 'banner-sample': T.bannerSample,
      'banner-internal': T.bannerInternal, 'focus-grey': T.focusGrey, combined: T.combined,
      'np-border': T.notProvided.border, 'np-fg': T.notProvided.fg,
      'rule-w': T.border.rule + 'px', 'control-w': T.border.control + 'px', 'focus-w': T.border.focus + 'px',
      'highlight-w': T.border.highlight + 'px', radius: T.radius + 'px',
      'motion-fast': T.motion.fast + 'ms', 'motion-panel': T.motion.panel + 'ms',
      'shadow-sm': T.shadow.sm, 'shadow-md': T.shadow.md, 'shadow-lg': T.shadow.lg,
      'chart-h': T.chartHeight.normal + 'px', 'chart-h-tall': T.chartHeight.tall + 'px',
      'max-w': T.layout.maxWidth + 'px', gutter: T.layout.gutter + 'px', 'side-w': T.layout.sidePanel + 'px'
    };
    Object.keys(T.type).forEach(function (k) { v['fs-' + k] = T.type[k] + 'px'; });
    Object.keys(T.space).forEach(function (k) { v['sp-' + k] = T.space[k] + 'px'; });
    T.regions.forEach(function (c, i) { v['r' + (i + 1)] = c; });
    [1, 2, 3].forEach(function (k) { v['tier' + k] = T.tiers[k].bg; v['tier' + k + '-fg'] = T.tiers[k].fg; });
    return v;
  };

  T.apply = function (root) {
    var el = root || document.documentElement, v = T.cssVars();
    // Respect "reduce motion" in the system settings: inline variables would otherwise override a CSS media query
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v['motion-fast'] = '0ms';
      v['motion-panel'] = '0ms';
    }
    Object.keys(v).forEach(function (k) { el.style.setProperty('--tap-' + k, v[k]); });
  };

  T.apply();
  if (window.echarts) window.echarts.registerTheme('tap', T.echarts);
  window.TAP_THEME = T;
})();
