/*
 * File: config/insight-rules.js
 * Purpose: Every insight rule in one place: what it looks for, its thresholds, its wording, where it attaches.
 * Provides: window.TAP_RULES (rules, wording)
 * Depends on: nothing
 * Used by: js/insights/engine.js and the rule files in js/insights/
 *
 * Filled in by the INSIGHTS stream (#44). Rule entry format: docs/ARCHITECTURE.md section 12.
 */
window.TAP_RULES = window.TAP_RULES || { rules: [], wording: { banned: [], guide: [] } };
