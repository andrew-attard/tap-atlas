/*
 * File: tests/fixtures/mini-data.js
 * Purpose: A tiny, hand-calculable plan (4 regions, 4 rated industries) for exact checks. Not sample data.
 * Provides: window.TEST_FIXTURES.mini (a Data Contract v0.2 plan object)
 * Depends on: nothing
 * Used by: tests/test-*.js (load it with TAP.data.load(T_FIXTURE('mini')))
 *
 * Expected results, with the working shown, are in tests/fixtures/mini-expected.js. Change both together.
 * Deliberate cases: Region C has a blank rating (ind1 references), a blank tier (ind2), a New Business row
 * with a blank hit rate (so its ARR potential is blank), an empty Customer Growth section and an import note.
 * Region D was imported on a different date. Region A account a4 uses the 3-year multiplier instead of growth %.
 */
window.TEST_FIXTURES = window.TEST_FIXTURES || {};
window.TEST_FIXTURES.mini = {
"meta": {"schemaVersion": "0.2", "generatedAt": "2026-10-03T12:00:00Z", "templateVersion": "test-fixture", "currency": "EUR", "years": [2027, 2028, 2029], "isSample": true, "sourceMap": {"marketCoverage": {"sheet": "1. Market Coverage", "columns": {"industryId": "B", "growthPotential": "D", "criticality": "E", "competitiveIntensity": "F", "currentArr": "G", "pipelineTotal": "H", "pipelineCreated12m": "I", "references": "J", "expertise": "K", "productFit": "L", "tier": "M", "commentary": "N"}}, "newBusiness": {"sheet": "2. New Business", "columns": {"industryId": "B", "market": "C", "subVertical": "D", "channelSplit.direct": "E", "channelSplit.partner": "F", "channelSplit.allianceA": "G", "channelSplit.allianceB": "H", "targetAccounts": "I", "hitRate": "J", "avgDealSize": "K", "growth.year2": "L", "growth.year3": "M", "successFactors": "N", "arrPotential": ["O", "P", "Q"], "servicesPotential": ["R", "S", "T"], "servicesRatio": "U"}}, "customerGrowth": {"sheet": "3. Customer Growth", "columns": {"name": "C", "industryId": "D", "country": "E", "productLine": "F", "currentArr": "G", "riskLevel": "H", "growthPct": ["I", "J", "K"], "multiplier3y": "L", "servicesRatio": "M", "incrementalArr": ["N", "O", "P"], "servicesOrderIntake": ["Q", "R", "S"], "cumulativeOrderIntake": "T", "segment": "U"}, "cells": {"thresholds.strategicArr": "N3", "thresholds.scaledArr": "N4", "thresholds.growthArr": "N5", "thresholds.growthOrderIntake": "N6"}}, "partners": {"sheet": "4. Partner", "columns": {"name": "B", "channel": "C", "maturity": "D", "expertiseGeo": "E", "expertiseProduct": "F", "fteSales": "G", "fteConsultants": "H", "centralSupportPct": "I", "arr": ["J", "K", "L"], "services": ["M", "N", "O"]}}, "recap": {"sheet": "4. Partner"}}},
"lookups": {
 "industries": [
  {"id": "ind1", "name": "Healthcare", "productLine": "pl1", "groupPriority": true, "rated": true},
  {"id": "ind2", "name": "Education", "productLine": "pl1", "groupPriority": false, "rated": true},
  {"id": "ind3", "name": "Retail", "productLine": "pl2", "groupPriority": false, "rated": true},
  {"id": "ind4", "name": "Utilities", "productLine": "pl2", "groupPriority": false, "rated": true},
  {"id": "other", "name": "Other", "productLine": null, "groupPriority": false, "rated": false}
 ],
 "productLines": [
  {"id": "pl1", "name": "Product line 1"},
  {"id": "pl2", "name": "Product line 2"}
 ],
 "channels": [
  {"id": "direct", "name": "Direct"},
  {"id": "partner", "name": "Partner"},
  {"id": "allianceA", "name": "Alliance A"},
  {"id": "allianceB", "name": "Alliance B"}
 ],
 "tiers": [
  {"id": 1, "name": "Group priority", "description": "Set by group strategy"},
  {"id": 2, "name": "Focus", "description": "A winning recipe, worth investing in"},
  {"id": 3, "name": "Opportunistic", "description": "No active investment"}
 ],
 "segments": [
  {"id": "strategic", "name": "Strategic", "description": "Current ARR above the strategic threshold"},
  {"id": "growth", "name": "Growth", "description": "High planned order intake and ARR above the growth threshold"},
  {"id": "core", "name": "Core", "description": "Everything else"},
  {"id": "scaled", "name": "Scaled", "description": "Current ARR below the scaled threshold"}
 ],
 "scales": {
  "growthPotential": {"levels": [{"score": 3, "label": "Strong dynamics, business to take"}, {"score": 2, "label": "Healthy dynamics, large untapped base"}, {"score": 1, "label": "Limited traction, limited pool"}]},
  "criticality": {"levels": [{"score": 3, "label": "Core, business critical"}, {"score": 2, "label": "Moderate value, executive level"}, {"score": 1, "label": "Limited value, not executive level"}]},
  "competitiveIntensity": {"levels": [{"score": 3, "label": "We are the recognized leader"}, {"score": 2, "label": "Fragmented, no clear leader"}, {"score": 1, "label": "Dominant competitor(s)"}]},
  "references": {"levels": [{"score": 3, "label": "Selling to top 5 local players"}, {"score": 2, "label": "Some references"}, {"score": 1, "label": "No or limited references"}]},
  "expertise": {"levels": [{"score": 3, "label": "Generalized"}, {"score": 2, "label": "Few key experts"}, {"score": 1, "label": "Limited"}]},
  "productFit": {"levels": [{"score": 3, "label": "Strong"}, {"score": 2, "label": "Partial"}, {"score": 1, "label": "Major gaps"}]}
 }
},
"regions": [
 {"id": "alpha", "name": "Region A", "source": {"fileName": "Region A plan.xlsx", "fileModified": "2026-09-28T10:00:00Z", "importedAt": "2026-10-02T09:00:00Z", "notes": []},
  "marketCoverage": [
   {"sourceRow": 10, "industryId": "ind1", "currentArr": 1000, "pipelineTotal": 2000, "pipelineCreated12m": 800, "tier": 1, "commentary": "Strong base in clinics.", "growthPotential": 3, "criticality": 3, "competitiveIntensity": 2, "references": 3, "expertise": 3, "productFit": 3},
   {"sourceRow": 11, "industryId": "ind2", "currentArr": 500, "pipelineTotal": 1000, "pipelineCreated12m": 400, "tier": 2, "commentary": null, "growthPotential": 2, "criticality": 2, "competitiveIntensity": 2, "references": 2, "expertise": 2, "productFit": 2},
   {"sourceRow": 12, "industryId": "ind3", "currentArr": 0, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": 3, "commentary": null, "growthPotential": 1, "criticality": 1, "competitiveIntensity": 1, "references": 1, "expertise": 1, "productFit": 1},
   {"sourceRow": 13, "industryId": "ind4", "currentArr": 200, "pipelineTotal": 300, "pipelineCreated12m": 100, "tier": 2, "commentary": "Attractive, but we lack references.", "growthPotential": 3, "criticality": 3, "competitiveIntensity": 3, "references": 1, "expertise": 1, "productFit": 1},
   {"sourceRow": 14, "industryId": "other", "currentArr": 100, "pipelineTotal": 100, "pipelineCreated12m": 50, "tier": null, "commentary": null, "growthPotential": null, "criticality": null, "competitiveIntensity": null, "references": null, "expertise": null, "productFit": null}
  ],
  "newBusiness": [
   {"sourceRow": 20, "industryId": "ind1", "tier": 1, "market": "North", "subVertical": "Clinics", "channelSplit": {"direct": 0.5, "partner": 0.5, "allianceA": 0, "allianceB": 0}, "targetAccounts": 20, "hitRate": 0.25, "avgDealSize": 100, "growth": {"year2": 0.1, "year3": 0.1}, "successFactors": "Local references", "arrPotential": [500, 550, 605], "servicesPotential": [100, 110, 121], "servicesRatio": 0.2},
   {"sourceRow": 21, "industryId": "ind4", "tier": 2, "market": "North", "subVertical": "Grid operators", "channelSplit": {"direct": 1, "partner": 0, "allianceA": 0, "allianceB": 0}, "targetAccounts": 10, "hitRate": 0.1, "avgDealSize": 200, "growth": {"year2": 0, "year3": 0}, "successFactors": "Specialist partner", "arrPotential": [200, 200, 200], "servicesPotential": [40, 40, 40], "servicesRatio": 0.2}
  ],
  "partners": [
   {"sourceRow": 10, "name": "Fictional Partner A1", "channel": "partner", "maturity": "Developing", "expertiseGeo": "Home market", "expertiseProduct": "Product line 1", "fteSales": 2, "fteConsultants": 3, "centralSupportPct": 0.1, "arr": [100, 150, 200], "services": [20, 30, 40]}
  ],
  "recap": [
   {"year": 2027, "sourceCell": "E5", "channel": "direct", "motion": "newBusiness", "type": "arr", "value": 450},
   {"year": 2027, "sourceCell": "F5", "channel": "partner", "motion": "newBusiness", "type": "arr", "value": 250}
  ],
  "customerGrowth": {"thresholds": {"strategicArr": 400, "scaledArr": 50, "growthArr": 100, "growthOrderIntake": 150}, "accounts": [
   {"sourceRow": 10, "id": "a1", "name": "Fictional Account A1", "industryId": "ind1", "country": "Country 1", "productLine": "pl1", "currentArr": 500, "riskLevel": null, "growthPct": [0.1, 0, 0], "multiplier3y": null, "servicesRatio": 0.2, "incrementalArr": [50, 0, 0], "servicesOrderIntake": [10, 0, 0], "cumulativeOrderIntake": 60, "segment": "strategic"},
   {"sourceRow": 11, "id": "a2", "name": "Fictional Account A2", "industryId": "ind2", "country": "Country 1", "productLine": "pl1", "currentArr": 200, "riskLevel": "high", "growthPct": [0.5, 0, 0], "multiplier3y": null, "servicesRatio": 0.1, "incrementalArr": [100, 0, 0], "servicesOrderIntake": [10, 0, 0], "cumulativeOrderIntake": 110, "segment": "core"},
   {"sourceRow": 12, "id": "a3", "name": "Fictional Account A3", "industryId": "ind3", "country": "Country 1", "productLine": "pl2", "currentArr": 30, "riskLevel": null, "growthPct": [0, 0, 0], "multiplier3y": null, "servicesRatio": 0, "incrementalArr": [0, 0, 0], "servicesOrderIntake": [0, 0, 0], "cumulativeOrderIntake": 0, "segment": "scaled"},
   {"sourceRow": 13, "id": "a4", "name": "Fictional Account A4", "industryId": "ind1", "country": "Country 1", "productLine": "pl1", "currentArr": 150, "riskLevel": "medium", "growthPct": null, "multiplier3y": 2.0, "servicesRatio": 0.2, "incrementalArr": [50, 50, 50], "servicesOrderIntake": [10, 10, 10], "cumulativeOrderIntake": 180, "segment": "growth"}
  ]}
 },
 {"id": "bravo", "name": "Region B", "source": {"fileName": "Region B plan.xlsx", "fileModified": "2026-09-28T10:00:00Z", "importedAt": "2026-10-02T09:00:00Z", "notes": []},
  "marketCoverage": [
   {"sourceRow": 10, "industryId": "ind1", "currentArr": 800, "pipelineTotal": 1600, "pipelineCreated12m": 600, "tier": 1, "commentary": "Group priority, strong fit.", "growthPotential": 3, "criticality": 3, "competitiveIntensity": 3, "references": 3, "expertise": 3, "productFit": 3},
   {"sourceRow": 11, "industryId": "ind2", "currentArr": 0, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": 2, "commentary": null, "growthPotential": 3, "criticality": 3, "competitiveIntensity": 2, "references": 1, "expertise": 1, "productFit": 2},
   {"sourceRow": 12, "industryId": "ind3", "currentArr": 300, "pipelineTotal": 900, "pipelineCreated12m": 300, "tier": 3, "commentary": "Opportunistic only.", "growthPotential": 2, "criticality": 2, "competitiveIntensity": 1, "references": 2, "expertise": 2, "productFit": 2},
   {"sourceRow": 13, "industryId": "ind4", "currentArr": 100, "pipelineTotal": 200, "pipelineCreated12m": 100, "tier": 2, "commentary": null, "growthPotential": 3, "criticality": 2, "competitiveIntensity": 3, "references": 1, "expertise": 2, "productFit": 1},
   {"sourceRow": 14, "industryId": "other", "currentArr": 0, "pipelineTotal": 50, "pipelineCreated12m": 0, "tier": null, "commentary": null, "growthPotential": null, "criticality": null, "competitiveIntensity": null, "references": null, "expertise": null, "productFit": null}
  ],
  "newBusiness": [
   {"sourceRow": 20, "industryId": "ind1", "tier": 1, "market": "South", "subVertical": "Hospitals", "channelSplit": {"direct": 0.6, "partner": 0.4, "allianceA": 0, "allianceB": 0}, "targetAccounts": 40, "hitRate": 0.5, "avgDealSize": 50, "growth": {"year2": 0.2, "year3": 0}, "successFactors": "Dedicated marketing assets", "arrPotential": [1000, 1200, 1200], "servicesPotential": [100, 120, 120], "servicesRatio": 0.1},
   {"sourceRow": 21, "industryId": "ind2", "tier": 2, "market": "South", "subVertical": "Universities", "channelSplit": {"direct": 0.5, "partner": 0, "allianceA": 0.5, "allianceB": 0}, "targetAccounts": 10, "hitRate": 0.2, "avgDealSize": 100, "growth": {"year2": 0, "year3": 0}, "successFactors": null, "arrPotential": [200, 200, 200], "servicesPotential": [20, 20, 20], "servicesRatio": 0.1}
  ],
  "partners": [
   {"sourceRow": 10, "name": "Fictional Partner B1", "channel": "allianceA", "maturity": "Developing", "expertiseGeo": "Home market", "expertiseProduct": "Product line 1", "fteSales": 2, "fteConsultants": 3, "centralSupportPct": 0.1, "arr": [50, 50, 50], "services": [10, 10, 10]}
  ],
  "recap": [
   {"year": 2027, "sourceCell": "E5", "channel": "direct", "motion": "newBusiness", "type": "arr", "value": 700}
  ],
  "customerGrowth": {"thresholds": {"strategicArr": 400, "scaledArr": 50, "growthArr": 100, "growthOrderIntake": 150}, "accounts": [
   {"sourceRow": 10, "id": "b1", "name": "Fictional Account B1", "industryId": "ind1", "country": "Country 1", "productLine": "pl1", "currentArr": 600, "riskLevel": null, "growthPct": [0.2, 0, 0], "multiplier3y": null, "servicesRatio": 0.1, "incrementalArr": [120, 0, 0], "servicesOrderIntake": [12, 0, 0], "cumulativeOrderIntake": 132, "segment": "strategic"},
   {"sourceRow": 11, "id": "b2", "name": "Fictional Account B2", "industryId": "ind3", "country": "Country 1", "productLine": "pl2", "currentArr": 100, "riskLevel": "high", "growthPct": [0.3, 0, 0], "multiplier3y": null, "servicesRatio": 0, "incrementalArr": [30, 0, 0], "servicesOrderIntake": [0, 0, 0], "cumulativeOrderIntake": 30, "segment": "core"}
  ]}
 },
 {"id": "charlie", "name": "Region C", "source": {"fileName": "Region C plan.xlsx", "fileModified": "2026-09-28T10:00:00Z", "importedAt": "2026-10-02T09:00:00Z", "notes": [{"message": "The Customer Growth section is empty.", "sheet": "3. Customer Growth", "cell": "A10"}]},
  "marketCoverage": [
   {"sourceRow": 10, "industryId": "ind1", "currentArr": 400, "pipelineTotal": 500, "pipelineCreated12m": 200, "tier": 1, "commentary": "Mixed picture.", "growthPotential": 2, "criticality": 3, "competitiveIntensity": 2, "references": null, "expertise": 2, "productFit": 2},
   {"sourceRow": 11, "industryId": "ind2", "currentArr": 100, "pipelineTotal": 300, "pipelineCreated12m": 100, "tier": null, "commentary": null, "growthPotential": 2, "criticality": 2, "competitiveIntensity": 2, "references": 2, "expertise": 2, "productFit": 2},
   {"sourceRow": 12, "industryId": "ind3", "currentArr": 0, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": 3, "commentary": null, "growthPotential": 1, "criticality": 2, "competitiveIntensity": 1, "references": 3, "expertise": 1, "productFit": 1},
   {"sourceRow": 13, "industryId": "ind4", "currentArr": 0, "pipelineTotal": 100, "pipelineCreated12m": 50, "tier": 2, "commentary": null, "growthPotential": 3, "criticality": 3, "competitiveIntensity": 2, "references": 1, "expertise": 1, "productFit": 2},
   {"sourceRow": 14, "industryId": "other", "currentArr": 0, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": null, "commentary": null, "growthPotential": null, "criticality": null, "competitiveIntensity": null, "references": null, "expertise": null, "productFit": null}
  ],
  "newBusiness": [
   {"sourceRow": 20, "industryId": "ind1", "tier": 1, "market": "East", "subVertical": "Labs", "channelSplit": {"direct": 1, "partner": 0, "allianceA": 0, "allianceB": 0}, "targetAccounts": 10, "hitRate": null, "avgDealSize": 80, "growth": {"year2": 0, "year3": 0}, "successFactors": null, "arrPotential": [null, null, null], "servicesPotential": [null, null, null], "servicesRatio": 0.2},
   {"sourceRow": 21, "industryId": "ind4", "tier": 2, "market": "East", "subVertical": "Water", "channelSplit": {"direct": 0, "partner": 1, "allianceA": 0, "allianceB": 0}, "targetAccounts": 5, "hitRate": 0.2, "avgDealSize": 100, "growth": {"year2": 0, "year3": 0}, "successFactors": "Product gaps", "arrPotential": [100, 100, 100], "servicesPotential": [20, 20, 20], "servicesRatio": 0.2}
  ],
  "partners": [],
  "recap": [],
  "customerGrowth": {"thresholds": {"strategicArr": null, "scaledArr": null, "growthArr": null, "growthOrderIntake": null}, "accounts": []}
 },
 {"id": "delta", "name": "Region D", "source": {"fileName": "Region D plan.xlsx", "fileModified": "2026-09-28T10:00:00Z", "importedAt": "2026-10-01T15:00:00Z", "notes": []},
  "marketCoverage": [
   {"sourceRow": 10, "industryId": "ind1", "currentArr": 0, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": 1, "commentary": "Group priority, but no references yet.", "growthPotential": 3, "criticality": 3, "competitiveIntensity": 3, "references": 1, "expertise": 1, "productFit": 1},
   {"sourceRow": 11, "industryId": "ind2", "currentArr": 600, "pipelineTotal": 1200, "pipelineCreated12m": 500, "tier": 3, "commentary": null, "growthPotential": 1, "criticality": 1, "competitiveIntensity": 1, "references": 2, "expertise": 2, "productFit": 2},
   {"sourceRow": 12, "industryId": "ind3", "currentArr": 900, "pipelineTotal": 600, "pipelineCreated12m": 300, "tier": 2, "commentary": "Our strongest market.", "growthPotential": 2, "criticality": 2, "competitiveIntensity": 2, "references": 3, "expertise": 3, "productFit": 3},
   {"sourceRow": 13, "industryId": "ind4", "currentArr": 0, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": 2, "commentary": null, "growthPotential": 3, "criticality": 3, "competitiveIntensity": 3, "references": 1, "expertise": 1, "productFit": 1},
   {"sourceRow": 14, "industryId": "other", "currentArr": 50, "pipelineTotal": 0, "pipelineCreated12m": 0, "tier": null, "commentary": null, "growthPotential": null, "criticality": null, "competitiveIntensity": null, "references": null, "expertise": null, "productFit": null}
  ],
  "newBusiness": [
   {"sourceRow": 20, "industryId": "ind3", "tier": 2, "market": "West", "subVertical": "Stores", "channelSplit": {"direct": 0.25, "partner": 0.25, "allianceA": 0.25, "allianceB": 0.25}, "targetAccounts": 100, "hitRate": 0.6, "avgDealSize": 10, "growth": {"year2": 0.5, "year3": 0.5}, "successFactors": "Retail partner network", "arrPotential": [600, 900, 1350], "servicesPotential": [150, 225, 337.5], "servicesRatio": 0.25}
  ],
  "partners": [
   {"sourceRow": 10, "name": "Fictional Partner D1", "channel": "partner", "maturity": "Developing", "expertiseGeo": "Home market", "expertiseProduct": "Product line 1", "fteSales": 2, "fteConsultants": 3, "centralSupportPct": 0.1, "arr": [80, 80, 80], "services": [0, 0, 0]}
  ],
  "recap": [
   {"year": 2027, "sourceCell": "E5", "channel": "direct", "motion": "newBusiness", "type": "arr", "value": 150}
  ],
  "customerGrowth": {"thresholds": {"strategicArr": 500, "scaledArr": 100, "growthArr": 200, "growthOrderIntake": 300}, "accounts": [
   {"sourceRow": 10, "id": "d1", "name": "Fictional Account D1", "industryId": "ind3", "country": "Country 1", "productLine": "pl2", "currentArr": 800, "riskLevel": null, "growthPct": [0.1, 0.1, 0], "multiplier3y": null, "servicesRatio": 0.25, "incrementalArr": [80, 88, 0], "servicesOrderIntake": [20, 22, 0], "cumulativeOrderIntake": 210, "segment": "strategic"},
   {"sourceRow": 11, "id": "d2", "name": "Fictional Account D2", "industryId": "ind2", "country": "Country 1", "productLine": "pl1", "currentArr": 400, "riskLevel": "medium", "growthPct": [0.25, 0, 0], "multiplier3y": null, "servicesRatio": 0.5, "incrementalArr": [100, 0, 0], "servicesOrderIntake": [50, 0, 0], "cumulativeOrderIntake": 150, "segment": "core"},
   {"sourceRow": 12, "id": "d3", "name": "Fictional Account D3", "industryId": "ind2", "country": "Country 1", "productLine": "pl1", "currentArr": 50, "riskLevel": null, "growthPct": [0, 0, 0], "multiplier3y": null, "servicesRatio": 0, "incrementalArr": [0, 0, 0], "servicesOrderIntake": [0, 0, 0], "cumulativeOrderIntake": 0, "segment": "scaled"}
  ]}
 }
]
};
