/*
 * File: config/comment-themes.js
 * Purpose: Keyword rules for recurring themes in leaders' commentary and success factors (US-2.5.1). Whole words, any case.
 * Provides: window.TAP_COMMENT_THEMES
 * Depends on: nothing
 * Used by: js/reports/themes.js, js/insights/rules-themes.js, tools/sample-expect-p2.js (the planted theme counts)
 * Owner: INSIGHTS2 stream
 *
 * Plain keyword lists, run by this app (D63): no model, no service, no network call. A text counts for a theme when
 * it holds one of the theme's keywords as a whole word or phrase, in any case: "partner" counts in "Specialist
 * partner" but not in "partnership" or "Partnerübersicht", and "case study" also counts as "case-study". Add a
 * plural or another form as its own keyword. A theme that comes up in at
 * least minRegions regions becomes an insight. Keep the list short and plain, so a viewer can see why a comment
 * was counted (the report's explanation lists every keyword).
 *
 * Fields per theme: id (stable), label (shown on the chart), keywords, plural (true when the label reads as a
 * plural, so the sentence says "come up" rather than "comes up").
 */
window.TAP_COMMENT_THEMES = window.TAP_COMMENT_THEMES || { minRegions: 3, themes: [] };

window.TAP_COMMENT_THEMES.themes = [
  { id: 'references', label: 'References', plural: true,
    keywords: ['reference', 'references', 'referenceable', 'case study', 'case studies', 'site visit', 'site visits'] },
  { id: 'partners', label: 'Partners', plural: true,
    keywords: ['partner', 'partners', 'reseller', 'resellers', 'alliance', 'alliances'] },
  { id: 'productGaps', label: 'Product gaps', plural: true,
    keywords: ['product gap', 'product gaps', 'gaps to close', 'missing feature', 'missing features', 'roadmap'] },
  { id: 'marketing', label: 'Marketing support', plural: false,
    keywords: ['marketing', 'campaign', 'campaigns', 'brand awareness', 'events'] },
  { id: 'skills', label: 'Skills and people', plural: true,
    keywords: ['expert', 'experts', 'expertise', 'hire', 'hires', 'hiring', 'skills', 'training', 'headcount'] },
  { id: 'pricing', label: 'Pricing', plural: false,
    keywords: ['price', 'prices', 'pricing', 'discount', 'discounts'] }
];
