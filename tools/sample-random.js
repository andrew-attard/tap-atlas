/*
 * File: tools/sample-random.js
 * Purpose: Seeded random numbers for the sample data generator, so the same seed always gives the same file.
 * Provides: module.exports.create(seed) -> {next, between, int, pick, shuffle, normal, chance}
 * Depends on: nothing
 * Used by: tools/generate-sample-data.js, tools/sample-build.js
 */
'use strict';

// mulberry32: small, fast and good enough for invented figures. Never Math.random.
function create(seed) {
  let s = seed >>> 0;
  function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const r = {
    next: next,
    between: function (a, b) { return a + (b - a) * next(); },
    int: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },
    pick: function (list) { return list[Math.floor(next() * list.length)]; },
    chance: function (p) { return next() < p; },
    shuffle: function (list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      }
      return out;
    },
    // Standard normal (Box-Muller), for account sizes.
    normal: function () {
      const u = Math.max(next(), 1e-12);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    }
  };
  return r;
}

module.exports = { create: create };
