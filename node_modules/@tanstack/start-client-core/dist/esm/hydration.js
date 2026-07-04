import { hydrateIdAttribute, hydrateInteractionEventsAttribute, hydrateWhenAttribute } from "./hydration/constants.js";
import { condition } from "./hydration/condition.js";
import { idle } from "./hydration/idle.js";
import { clearResolvedGateIdsInMarker, createResolvedGate, getFallbackHtml, getMarkerGate, getOrCreateGate, onGateResolve, releaseGate, resolveHydrationMarker, runHydrationStrategyCleanup, saveFallbackHtml, waitForHydrationPrefetchStrategy } from "./hydration/runtime.js";
import { interaction, listenForDelegatedHydrationIntent } from "./hydration/interaction.js";
import { load } from "./hydration/load.js";
import { media } from "./hydration/media.js";
import { never } from "./hydration/never.js";
import { withHydrationRenderer } from "./hydration/renderer.js";
import { visible } from "./hydration/visible.js";
//#region src/hydration.ts
var hydrateIdSelector = `[${hydrateIdAttribute}]`;
//#endregion
export { clearResolvedGateIdsInMarker, condition, createResolvedGate, getFallbackHtml, getMarkerGate, getOrCreateGate, hydrateIdAttribute, hydrateIdSelector, hydrateInteractionEventsAttribute, hydrateWhenAttribute, idle, interaction, listenForDelegatedHydrationIntent, load, media, never, onGateResolve, releaseGate, resolveHydrationMarker, runHydrationStrategyCleanup, saveFallbackHtml, visible, waitForHydrationPrefetchStrategy, withHydrationRenderer };

//# sourceMappingURL=hydration.js.map