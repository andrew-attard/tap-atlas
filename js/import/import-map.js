/*
 * File: js/import/import-map.js
 * Purpose: Reads and validates the template mapping (config/import-map.js) and derives meta.sourceMap from it; docs/ARCHITECTURE.md section 20. Stub until the READ stream builds it (#585).
 * Provides: TAP.importMap (get, problems, normalize, sourceMap, extraSections, matchRegion, glob)
 * Depends on: config/import-map.js, js/core/content.js
 * Used by: js/import/import-plan.js, js/import/import-region.js, js/ui/import-panel.js
 * Owner: READ stream
 */
(function (TAP) {
  'use strict';

  TAP.importMap = {
    get: TAP.stub.fn('TAP.importMap.get', 585),
    problems: TAP.stub.fn('TAP.importMap.problems', 585),
    normalize: TAP.stub.fn('TAP.importMap.normalize', 585),
    sourceMap: TAP.stub.fn('TAP.importMap.sourceMap', 585),
    extraSections: TAP.stub.fn('TAP.importMap.extraSections', 585),
    matchRegion: TAP.stub.fn('TAP.importMap.matchRegion', 585),
    glob: TAP.stub.fn('TAP.importMap.glob', 585),
    ROWS: ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'baseYear'],
    GRIDS: ['recap', 'revenue', 'booksValue', 'strategicPlan', 'routes'],
    REQUIRED: ['marketCoverage', 'newBusiness', 'customerGrowth', 'partners', 'recap']
  };
})(window.TAP);
