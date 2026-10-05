/*
 * File: tools/sample-settings.js
 * Purpose: The fixed settings the sample data generator works from: seed, regions, industries, tiers and sizes.
 *          Change a setting here, then rerun the generator. The same settings always give the same files.
 * Provides: module.exports (the settings object)
 * Depends on: nothing
 * Used by: tools/generate-sample-data.js and its helpers (tools/sample-*.js)
 *
 * Money is in thousands of EUR. Rates are decimals. Region letters A to G follow file order.
 */
'use strict';

module.exports = {
  seed: 20261002,
  years: [2027, 2028, 2029],
  generatedAt: '2026-10-02T08:30:00Z',
  templateVersion: 'sample-template-1',

  // scale: total current ARR in Market Coverage. nbRows, accounts, partners: list sizes. ads: typical deal size.
  // hit: the region's weighted hit rate (P08). ta: target accounts per row. svc: services ratio (pre-filled).
  // cgRate: three-year customer growth as a share of the accounts' current ARR. strategic: accounts above
  // the strategic threshold. strategicShare: share of customer growth from Strategic accounts (P15).
  regions: [
    { id: 'na', name: 'North America', scale: 36000, nbRows: 18, accounts: 28, strategic: 4, partners: 5, ads: 45, hit: 0.15, ta: [20, 45], svc: 0.25, cgRate: 0.28, strategicShare: 0.32 },
    { id: 'latam', name: 'Latin America', scale: 11000, nbRows: 12, accounts: 22, strategic: 3, partners: 4, ads: 55, hit: 0.13, ta: [5, 14], svc: 0.2, cgRate: 0.45, strategicShare: 0.38 },
    { id: 'neu', name: 'Northern Europe', scale: 24000, nbRows: 16, accounts: 26, strategic: 4, partners: 4, ads: 70, hit: 0.17, ta: [5, 20], svc: 0.3, cgRate: 0.35, strategicShare: 0.45 },
    { id: 'seu', name: 'Southern Europe', scale: 17000, nbRows: 15, accounts: 24, strategic: 4, partners: 3, ads: 55, hit: 0.14, ta: [8, 22], svc: 0.22, cgRate: 0.38, strategicShare: 0.34 },
    { id: 'ceu', name: 'Central Europe', scale: 20000, nbRows: 14, accounts: 0, strategic: 0, partners: 4, ads: 50, hit: 0.35, ta: [5, 18], svc: 0.28, cgRate: 0, strategicShare: null },
    { id: 'mea', name: 'Middle East & Africa', scale: 9000, nbRows: 12, accounts: 21, strategic: 5, partners: 3, ads: 60, hit: 0.16, ta: [4, 11], svc: 0.2, cgRate: 0.45, strategicShare: 0.4 },
    { id: 'apac', name: 'Asia Pacific', scale: 19000, nbRows: 16, accounts: 25, strategic: 8, partners: 5, ads: 65, hit: 0.15, ta: [6, 20], svc: 0.25, cgRate: 0.42, strategicShare: 0.8 }
  ],

  // Import dates (G6: Asia Pacific imported a day earlier than the others).
  imports: {
    na: ['2026-09-29T16:40:00Z', '2026-10-02T08:05:00Z'], latam: ['2026-09-30T11:20:00Z', '2026-10-02T08:07:00Z'],
    neu: ['2026-09-28T09:15:00Z', '2026-10-02T08:09:00Z'], seu: ['2026-09-30T14:05:00Z', '2026-10-02T08:11:00Z'],
    ceu: ['2026-09-29T10:30:00Z', '2026-10-02T08:13:00Z'], mea: ['2026-09-30T08:50:00Z', '2026-10-02T08:15:00Z'],
    apac: ['2026-09-29T07:45:00Z', '2026-10-01T16:20:00Z']
  },

  productLines: [{ id: 'pl1', name: 'Product line 1' }, { id: 'pl2', name: 'Product line 2' }, { id: 'pl3', name: 'Product line 3' }],

  // The template's industries in sheet order, then the two unrated rows.
  // tiers: one character per region A to G ('-' is a blank). Tier 1 is fixed for group priorities.
  industries: [
    { id: 'busServices', name: 'Business Services', pl: 'pl3', tiers: '3232333' },
    { id: 'culture', name: 'Culture and Tourism', pl: 'pl3', tiers: '3333332' },
    { id: 'utilities', name: 'Utilities', pl: 'pl2', tiers: '2232323' },
    { id: 'media', name: 'Entertainment & Media', pl: 'pl3', tiers: '3333333' },
    { id: 'finance', name: 'Financial Services', pl: 'pl1', tiers: '2223332' },
    { id: 'government', name: 'Government', pl: 'pl1', tiers: '33223-3' },
    { id: 'healthcare', name: 'Healthcare', pl: 'pl1', group: true },
    { id: 'hospitality', name: 'Hospitality', pl: 'pl3', tiers: '3333323' },
    { id: 'infotech', name: 'Information and Technology', pl: 'pl1', tiers: '2322332' },
    { id: 'ifm', name: 'Facility Services', pl: 'pl2', group: true },
    { id: 'manufacturing', name: 'Manufacturing', pl: 'pl2', tiers: '3323223' },
    { id: 'pharma', name: 'Pharma and Biotech', pl: 'pl1', tiers: '3233233' },
    { id: 'retail', name: 'Retail', pl: 'pl3', tiers: '2223333' },
    { id: 'transport', name: 'Transportation', pl: 'pl2', tiers: '3332332' },
    { id: 'datacenters', name: 'Data Centers', pl: 'pl2', group: true },
    { id: 'education', name: 'Education', pl: 'pl1', tiers: '2222223' },
    { id: 'fsm', name: 'Field Service Management', pl: 'pl2', tiers: '2332323' },
    { id: 'property', name: 'Property Management', pl: 'pl3', tiers: '3233322' },
    { id: 'other', name: 'Other', pl: null, unrated: true },
    { id: 'unapplied', name: 'Unapplied industry', pl: null, unrated: true }
  ],

  // Where each field sits in the sample workbooks (the same shape as tests/fixtures/mini-data.js).
  firstRow: { marketCoverage: 10, newBusiness: 15, accounts: 10, partners: 20 },
  recapGrid: { firstRow: 5, firstCol: 'E' }
};
