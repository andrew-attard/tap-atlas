/*
 * File: content/glossary.js
 * Purpose: The general glossary: every business term and acronym in plain English (US-1.6.3).
 * Provides: window.TAP_CONTENT.glossary
 * Depends on: nothing
 * Used by: js/core/content.js, js/ui/glossary.js, js/views/guide.js
 *
 * Entry format: id: { term, aliases: [], short: 'one or two sentences', why: 'why it matters here', related: [ids] }
 * Filled in by the CONTENT stream (#39).
 */
window.TAP_CONTENT = window.TAP_CONTENT || {};
window.TAP_CONTENT.glossary = window.TAP_CONTENT.glossary || {};
