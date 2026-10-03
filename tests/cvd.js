/*
 * File: tests/cvd.js
 * Purpose: Test-only colour maths: colour-vision-deficiency simulation and CIEDE2000 colour distance.
 * Provides: window.TCVD (hexToRgb, rgbToHex, simulate, hexToLab, deltaE, deltaE00Lab, minPairDistance, report)
 * Depends on: nothing
 * Used by: tests/test-cvd-self.js, the theme palette test (TPV-TC-027) on tests.html
 */
(function () {
  'use strict';

  // Machado, Oliveira and Fernandes (2009), severity 1.0, applied in linear RGB.
  var MATRICES = {
    protanopia: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998]
    ],
    deuteranopia: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.011820, 0.042940, 0.968881]
    ],
    tritanopia: [
      [1.255528, -0.076749, -0.178779],
      [-0.078411, 0.930809, 0.147602],
      [0.004733, 0.691367, 0.303900]
    ]
  };
  var TYPES = ['protanopia', 'deuteranopia', 'tritanopia'];

  function hexToRgb(hex) {
    var h = String(hex).trim().replace(/^#/, '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('Not a hex colour: ' + hex);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (v) {
      var n = Math.max(0, Math.min(255, Math.round(v)));
      return (n < 16 ? '0' : '') + n.toString(16);
    }).join('');
  }

  function toLinear(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function fromLinear(c) {
    c = Math.max(0, Math.min(1, c));
    return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  }

  function simulate(hex, type) {
    var m = MATRICES[type];
    if (!m) throw new Error('Unknown deficiency type: ' + type);
    var c = hexToRgb(hex);
    var lin = [toLinear(c.r), toLinear(c.g), toLinear(c.b)];
    var out = m.map(function (row) { return row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]; });
    return rgbToHex({ r: fromLinear(out[0]), g: fromLinear(out[1]), b: fromLinear(out[2]) });
  }

  // sRGB to CIELAB with the D65 white point.
  function hexToLab(hex) {
    var c = hexToRgb(hex);
    var r = toLinear(c.r);
    var g = toLinear(c.g);
    var b = toLinear(c.b);
    var x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    var y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    var z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    function f(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
    var fx = f(x);
    var fy = f(y);
    var fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  // CIEDE2000, following Sharma, Wu and Dalal (2005).
  function deltaE00Lab(lab1, lab2) {
    var rad = Math.PI / 180;
    var L1 = lab1[0], a1 = lab1[1], b1 = lab1[2];
    var L2 = lab2[0], a2 = lab2[1], b2 = lab2[2];
    var C1 = Math.sqrt(a1 * a1 + b1 * b1);
    var C2 = Math.sqrt(a2 * a2 + b2 * b2);
    var Cbar7 = Math.pow((C1 + C2) / 2, 7);
    var G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
    var a1p = (1 + G) * a1;
    var a2p = (1 + G) * a2;
    var C1p = Math.sqrt(a1p * a1p + b1 * b1);
    var C2p = Math.sqrt(a2p * a2p + b2 * b2);
    function hue(b, ap) {
      if (b === 0 && ap === 0) return 0;
      var h = Math.atan2(b, ap) / rad;
      return h < 0 ? h + 360 : h;
    }
    var h1p = hue(b1, a1p);
    var h2p = hue(b2, a2p);
    var dLp = L2 - L1;
    var dCp = C2p - C1p;
    var dhp = 0;
    if (C1p * C2p !== 0) {
      dhp = h2p - h1p;
      if (dhp > 180) dhp -= 360;
      else if (dhp < -180) dhp += 360;
    }
    var dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2);
    var Lbp = (L1 + L2) / 2;
    var Cbp = (C1p + C2p) / 2;
    var hbp = h1p + h2p;
    if (C1p * C2p !== 0) {
      if (Math.abs(h1p - h2p) <= 180) hbp = hbp / 2;
      else hbp = hbp < 360 ? (hbp + 360) / 2 : (hbp - 360) / 2;
    }
    var Tt = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) +
      0.32 * Math.cos((3 * hbp + 6) * rad) - 0.20 * Math.cos((4 * hbp - 63) * rad);
    var dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
    var Cbp7 = Math.pow(Cbp, 7);
    var Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
    var Sl = 1 + 0.015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
    var Sc = 1 + 0.045 * Cbp;
    var Sh = 1 + 0.015 * Cbp * Tt;
    var Rt = -Math.sin(2 * dTheta * rad) * Rc;
    var l = dLp / Sl;
    var c = dCp / Sc;
    var hh = dHp / Sh;
    return Math.sqrt(l * l + c * c + hh * hh + Rt * c * hh);
  }

  function deltaE(hexA, hexB) {
    return deltaE00Lab(hexToLab(hexA), hexToLab(hexB));
  }

  // Smallest distance between any two colours, after simulation when a type is given.
  function minPairDistance(hexes, type) {
    var seen = type ? hexes.map(function (h) { return simulate(h, type); }) : hexes.slice();
    var best = { min: Infinity, pair: [] };
    for (var i = 0; i < seen.length; i++) {
      for (var j = i + 1; j < seen.length; j++) {
        var d = deltaE(seen[i], seen[j]);
        if (d < best.min) best = { min: d, pair: [hexes[i], hexes[j]] };
      }
    }
    return best;
  }

  function report(hexes, threshold) {
    var out = { threshold: threshold, pass: true, types: {} };
    [null].concat(TYPES).forEach(function (t) {
      var r = minPairDistance(hexes, t);
      r.pass = r.min >= threshold;
      out.types[t || 'normal'] = r;
      if (!r.pass) out.pass = false;
    });
    return out;
  }

  window.TCVD = {
    types: TYPES.slice(),
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    simulate: simulate,
    hexToLab: hexToLab,
    deltaE: deltaE,
    deltaE00Lab: deltaE00Lab,
    minPairDistance: minPairDistance,
    report: report
  };
})();
