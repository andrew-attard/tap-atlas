/*
 * File: tools/sample-derive.js
 * Purpose: The template's formulas, applied to the sample data so every derived value matches its inputs:
 *          New Business potential, customer growth, segments, the recap grid and partner amounts.
 * Provides: module.exports ({r1, r2, nbRow, account, segmentFor, recap, partnerAmounts, CHANNELS})
 * Depends on: nothing
 * Used by: tools/sample-build.js and the planted-case step
 *
 * Money is rounded to one decimal (EUR 100s); the tests allow for that rounding.
 */
'use strict';

const CHANNELS = ['direct', 'partner', 'allianceA', 'allianceB'];

function r1(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 10) / 10; }
function r2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
function num(v) { return typeof v === 'number' && isFinite(v); }

// ARR potential year 1 = accounts x hit rate x deal size; years 2 and 3 grow; services = ARR x services ratio.
function nbRow(row) {
  if (![row.targetAccounts, row.hitRate, row.avgDealSize].every(num)) {
    row.arrPotential = [null, null, null];
    row.servicesPotential = [null, null, null];
    return row;
  }
  const y1 = r1(row.targetAccounts * row.hitRate * row.avgDealSize);
  const y2 = r1(y1 * (1 + row.growth.year2));
  const y3 = r1(y2 * (1 + row.growth.year3));
  row.arrPotential = [y1, y2, y3];
  row.servicesPotential = row.arrPotential.map(function (a) { return r1(a * row.servicesRatio); });
  return row;
}

// Incremental ARR year by year from growth % (compounding), or the 3-year multiplier spread evenly.
function account(acc) {
  const c = acc.currentArr;
  if (acc.growthPct) {
    let base = c;
    acc.incrementalArr = acc.growthPct.map(function (g) { const inc = base * g; base += inc; return r1(inc); });
  } else {
    const each = c * (acc.multiplier3y - 1) / 3;
    acc.incrementalArr = [r1(each), r1(each), r1(each)];
  }
  acc.servicesOrderIntake = acc.incrementalArr.map(function (v) { return r1(v * acc.servicesRatio); });
  const sum = function (a, b) { return a + b; };
  acc.cumulativeOrderIntake = r1(acc.incrementalArr.reduce(sum, 0) + acc.servicesOrderIntake.reduce(sum, 0));
  return acc;
}

// The template's segment rule (Planning Template Structure, section 3).
function segmentFor(acc, t) {
  if (acc.currentArr > t.strategicArr) return 'strategic';
  if (acc.currentArr < t.scaledArr) return 'scaled';
  return acc.cumulativeOrderIntake > t.growthOrderIntake && acc.currentArr > t.growthArr ? 'growth' : 'core';
}

// The recap grid on the Partner sheet: rows by year, motion and type; one column per channel.
function recap(region, years, grid) {
  const out = [];
  const accounts = region.customerGrowth.accounts;
  const firstCol = grid.firstCol.charCodeAt(0);
  years.forEach(function (year, y) {
    ['newBusiness', 'customerGrowth'].forEach(function (motion, m) {
      if (motion === 'customerGrowth' && !accounts.length) return;
      ['arr', 'services'].forEach(function (type, t) {
        CHANNELS.forEach(function (ch, c) {
          let v = 0;
          if (motion === 'newBusiness') {
            region.newBusiness.forEach(function (row) {
              const list = type === 'arr' ? row.arrPotential : row.servicesPotential;
              if (num(list[y])) v += list[y] * row.channelSplit[ch];
            });
          } else if (ch === 'direct') {
            accounts.forEach(function (a) { v += (type === 'arr' ? a.incrementalArr : a.servicesOrderIntake)[y]; });
          }
          out.push({ year: year, sourceCell: String.fromCharCode(firstCol + c) + (grid.firstRow + y * 4 + m * 2 + t),
            channel: ch, motion: motion, type: type, value: r1(v) });
        });
      });
    });
  });
  return out;
}

// Each partner's ARR and services per year: its channel's New Business recap, split by the partner's weight.
function partnerAmounts(region, weights, years) {
  region.partners.forEach(function (p, i) {
    const same = region.partners.map(function (q, k) { return q.channel === p.channel ? weights[k] : 0; });
    const share = weights[i] / same.reduce(function (a, b) { return a + b; }, 0);
    ['arr', 'services'].forEach(function (type) {
      p[type] = [0, 1, 2].map(function (y) {
        const cell = region.recap.filter(function (r) {
          return r.channel === p.channel && r.motion === 'newBusiness' && r.type === type && r.year === years[y];
        })[0];
        return r1(cell ? cell.value * share : 0);
      });
    });
  });
}

module.exports = { r1: r1, r2: r2, nbRow: nbRow, account: account, segmentFor: segmentFor, recap: recap,
  partnerAmounts: partnerAmounts, CHANNELS: CHANNELS };
