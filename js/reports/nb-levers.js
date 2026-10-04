/*
 * File: js/reports/nb-levers.js
 * Purpose: The levers report's builder (US-2.1.4): bars, dots and table through the compare builder, and the bubble
 *          view (target accounts across, hit rate up, size = average deal size) through the shared point drawing.
 * Provides: builder 'nbLevers'
 * Depends on: js/engine/build-compare.js, js/engine/build-xy.js (TAP.shapes.kit.points), js/engine/prepare.js,
 *             js/engine/shapes.js (all at call time)
 * Used by: config/reports-newbusiness.js (nb-levers)
 * Owner: NB stream (#200)
 */
(function (TAP) {
  'use strict';

  // One bubble per region (or combined figure): the definition's x and y, sized by the chosen size measure.
  function bubble(ctx) {
    var k = TAP.shapes.kit, def = ctx.def, ds = TAP.prepare.run(def, ctx);
    var drawn = k.points(def, ctx, ds, { x: def.x, y: def.y, size: ctx.sizeId || (def.size && def.size.default) || null });
    var res = k.result(def, ds, drawn);
    res.notes = k.notes(ds, [def.x, def.y]).concat(drawn.notes);
    if (ds.empty) res.empty = true;
    return res;
  }

  function build(ctx) {
    return (ctx.type || ctx.def.defaultType) === 'bubble' ? bubble(ctx) : TAP.builders.get('compare')(ctx);
  }

  TAP.builders.register('nbLevers', TAP.shapes.kit.safely(build));
})(window.TAP);
