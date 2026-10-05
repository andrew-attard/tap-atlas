/*
 * File: config/running-order.js
 * Purpose: The running order for presentation mode: the steps of the meeting, in order (US-3.1.1). Each field is explained in docs/ARCHITECTURE.md section 18.2.
 * Provides: window.TAP_RUNNING_ORDER
 * Depends on: nothing
 * Used by: js/ui/present.js
 * Owner: PRESENT stream (#232)
 */
window.TAP_RUNNING_ORDER = window.TAP_RUNNING_ORDER || { steps: [] };
