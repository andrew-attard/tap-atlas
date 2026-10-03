/*
 * File: tests/test-cvd-self.js
 * Purpose: Checks the colour helper against published reference values before the theme test relies on it.
 * Provides: self-check tests registered with T (ids X-cvd-*)
 * Depends on: tests/harness.js, tests/cvd.js
 * Used by: tests/selftest.html
 */
(function () {
  'use strict';

  T.suite('cvd', function () {
    // Sharma, Wu and Dalal (2005), table 1: pairs 1, 7, 13, 17, 19 and 25.
    var SHARMA = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, 0, 0], [50, -1, 2], 2.3669],
      [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
      [[50, 2.5, 0], [73, 25, -18], 27.1492],
      [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0000],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644]
    ];

    T.test('X-cvd-ciede2000', 'CIEDE2000 matches the published Sharma test pairs', function (a) {
      SHARMA.forEach(function (p, i) {
        a.near(TCVD.deltaE00Lab(p[0], p[1]), p[2], 1e-4, 'pair ' + (i + 1));
        a.near(TCVD.deltaE00Lab(p[1], p[0]), p[2], 1e-4, 'pair ' + (i + 1) + ' reversed');
      });
    });

    T.test('X-cvd-lab', 'sRGB to Lab gives the expected white and black', function (a) {
      var w = TCVD.hexToLab('#ffffff');
      a.near(w[0], 100, 1e-3, 'white L');
      a.near(w[1], 0, 1e-3, 'white a');
      a.near(TCVD.hexToLab('#000')[0], 0, 1e-9, 'black L');
      a.near(TCVD.deltaE('#000000', '#ffffff'), 100, 1e-3, 'black to white');
      a.equal(TCVD.deltaE('#3366cc', '#3366cc'), 0, 'identical colours');
    });

    T.test('X-cvd-hex', 'hex parsing accepts #rgb and #rrggbb and rejects junk', function (a) {
      a.deepEqual(TCVD.hexToRgb('#f80'), { r: 255, g: 136, b: 0 });
      a.deepEqual(TCVD.hexToRgb('#1F77B4'), { r: 31, g: 119, b: 180 });
      a.equal(TCVD.rgbToHex({ r: 31, g: 119, b: 180 }), '#1f77b4');
      a.throws(function () { TCVD.hexToRgb('red'); });
    });

    T.test('X-cvd-simulate', 'simulation keeps greys and matches a hand-worked protanopia value', function (a) {
      TCVD.types.forEach(function (t) {
        a.equal(TCVD.simulate('#ffffff', t), '#ffffff', t + ' keeps white');
        a.equal(TCVD.simulate('#000000', t), '#000000', t + ' keeps black');
      });
      // Pure red in linear RGB through the protanopia matrix, worked by hand.
      a.equal(TCVD.simulate('#ff0000', 'protanopia'), '#6d5f00');
      a.throws(function () { TCVD.simulate('#ff0000', 'achromatopsia'); });
    });

    T.test('X-cvd-report', 'red and green are flagged as too close for deuteranopia', function (a) {
      var r = TCVD.report(['#d62728', '#2ca02c', '#1f77b4'], 10);
      a.equal(r.types.normal.pass, true, 'distinct with normal vision');
      a.equal(r.types.deuteranopia.pass, false, 'too close for deuteranopia');
      a.deepEqual(r.types.deuteranopia.pair, ['#d62728', '#2ca02c']);
      a.equal(r.pass, false);
      var m = TCVD.minPairDistance(['#000000', '#ffffff', '#808080'], null);
      a.deepEqual(m.pair, ['#ffffff', '#808080'], 'closest pair found');
    });
  });
})();
