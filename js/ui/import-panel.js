/*
 * File: js/ui/import-panel.js
 * Purpose: The Import panel: pick the workbooks, read them with a live status, show the report, then Use these plans now, Save data/plan-data.js and Copy report; docs/ARCHITECTURE.md section 20. Stub until the UI stream builds it (#587).
 * Provides: TAP.importPanel (open, render, button, show, state)
 * Depends on: js/import/import-plan.js, js/import/import-write.js, js/ui/import-report.js, js/ui/layers.js, js/ui/app.js (at call time), js/core/dom.js, js/core/content.js, js/core/icons.js
 * Used by: js/ui/compare-bar.js, js/ui/system-screens.js
 * Owner: UI stream
 */
(function (TAP) {
  'use strict';

  TAP.importPanel = {
    open: TAP.stub.fn('TAP.importPanel.open', 587),
    render: TAP.stub.fn('TAP.importPanel.render', 587),
    button: TAP.stub.fn('TAP.importPanel.button', 587),
    show: TAP.stub.fn('TAP.importPanel.show', 587),
    state: TAP.stub.fn('TAP.importPanel.state', 587)
  };
})(window.TAP);
