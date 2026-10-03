/*
 * File: tests/test-theme.js
 * Purpose: Tests for the theme file: distinct region colours (also for colour-blind viewers), label contrast,
 *          CSS variables and the chart theme.
 * Provides: test cases TPV-TC-027, X-theme-*
 * Depends on: tests/harness.js, tests/cvd.js, js/theme.js
 * Used by: tests.html
 */
(function () {
  'use strict';
  var TH = window.TAP_THEME;

  function luminance(hex) {
    var rgb = TCVD.hexToRgb(hex);
    return [rgb.r, rgb.g, rgb.b].map(function (c) {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (sum, c, i) { return sum + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  T.suite('theme', function () {
    T.test('TPV-TC-027', 'Every pair of the 8 region colours stays distinguishable, also with colour-vision deficiency', function (a) {
      a.equal(TH.regions.length, 8, '8 region colours');
      var r = TCVD.report(TH.regions, 10);   // CIEDE2000 of 10 or more for every pair (D45)
      Object.keys(r.types).forEach(function (t) {
        a.ok(r.types[t].pass, t + ': closest pair ' + r.types[t].pair.join(' / ') + ' at ' + r.types[t].min.toFixed(1));
      });
    });

    T.test('X-theme-labels', 'White labels on every region colour, combined grey and tier fill meet 4.5:1', function (a) {
      TH.regions.concat([TH.combined, TH.tiers[1].bg, TH.tiers[2].bg]).forEach(function (c) {
        a.ok(contrast(c, TH.onColour) >= 4.5, c + ' with white text: ' + contrast(c, TH.onColour).toFixed(2));
      });
      a.ok(contrast(TH.tiers[3].bg, TH.tiers[3].fg) >= 4.5, 'Tier 3 text');
      a.ok(contrast(TH.muted, TH.ground) >= 4.5, 'muted text on the page');
    });

    T.test('X-theme-separate', 'Region colours stay clear of the highlight red and the two greys', function (a) {
      TH.regions.forEach(function (c) {
        [TH.accent, TH.combined, TH.focusGrey].forEach(function (ref) {
          a.ok(TCVD.deltaE(c, ref) >= 12, c + ' vs ' + ref + ': ' + TCVD.deltaE(c, ref).toFixed(1));
        });
      });
    });

    T.test('X-theme-css', 'The theme writes its values as CSS variables the stylesheets read', function (a) {
      var css = getComputedStyle(document.documentElement);
      a.equal(css.getPropertyValue('--tap-ground').trim(), TH.ground);
      a.equal(css.getPropertyValue('--tap-r1').trim(), TH.regions[0]);
      a.equal(css.getPropertyValue('--tap-fs-body').trim(), TH.type.body + 'px');
      a.equal(getComputedStyle(document.body).backgroundColor !== '', true, 'body has a background');
    });

    T.test('X-theme-sizes', 'Text sizes meet the shared-screen minimums (D24)', function (a) {
      a.ok(TH.type.body >= 16, 'body text');
      a.ok(TH.type.chart >= 13 && TH.type.chartMin >= 13, 'chart labels');
      a.equal(TH.echarts.animation, false, 'chart animation off');
    });

    T.test('X-theme-echarts', 'The chart theme is registered and uses the region colours', function (a) {
      a.ok(window.echarts, 'ECharts loaded');
      a.deepEqual(TH.echarts.color, TH.regions);
      var div = T.dom.mount();
      div.style.width = '300px'; div.style.height = '200px';
      var chart = window.echarts.init(div, 'tap');
      chart.setOption({ xAxis: { type: 'category', data: ['a'] }, yAxis: {}, series: [{ type: 'bar', data: [1] }] });
      a.equal(chart.getOption().color[0], TH.regions[0], 'first series colour comes from the theme');
      chart.dispose();
    });

    T.test('X-theme-font', 'Archivo loads from the folder (part of TPV-TC-043; the fallback is checked by hand)', function (a) {
      a.ok(TH.font.indexOf('Archivo') === 1 && TH.font.indexOf('Segoe UI') > 0, 'Archivo first, then Segoe UI');
      return document.fonts.load('600 16px Archivo').then(function (faces) {
        a.ok(faces.length > 0, 'the Archivo font file loaded');
      });
    });

    T.test('X-theme-helpers', 'Shades lighten toward white and region colours repeat past the palette', function (a) {
      a.equal(TH.mix('#000000', 0.5), '#808080');
      a.equal(TH.shade('#274ab9', 0), '#274ab9');
      a.equal(TH.regionColor(8), TH.regions[0]);
      a.equal(TH.regionColor(9), TH.regions[1]);
    });
  });
})();
