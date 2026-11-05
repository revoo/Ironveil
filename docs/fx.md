# Combat FX and lighting — 1.2 solo

The pass adds a presentation layer around confirmed combat events and authorized observations. Shared combat, movement, visibility and AI rules are unchanged. Multiplayer remains deferred.

## Visuals

- WebGL surface lighting through Phaser Light2D, with generated height-field normal maps for armor, turret, canopies and roofs. Warm point lights follow muzzle flashes, charging guns and wreck fires. Eight surface lights maximum (four with low effects), prioritizing short combat flashes.
- Soft additive light blooms, glowing shell cores, charge heat, directional building/foliage shadows, dynamic tank contact shadows and a restrained static vignette. These also provide a Canvas presentation fallback for the WebGL lighting.
- Charge-scaled muzzle flame, sparks and gun smoke. Impacts kick up hot fragments, smoke and debris, with fading pressure rings around blasts. Destruction bursts settle into a charred hull silhouette, flickering fire, embers and rising smoke; the cosmetic wreck fades after nine seconds.
- Textured, slowly rolling smoke billows replace the flat smoke disks. Every puff stays inside the authoritative 100px radius, with a subtle perimeter to communicate the exact boundary. Moving tanks leave short exhaust puffs; heavily damaged visible tanks emit thicker smoke.

These are stylized 2D surface lights and baked directional shadows, not volumetric light simulation or dynamic shadow casting. Walls do not occlude point lights. Cosmetic wrecks introduce no collision or cover.

## Architecture and safeguards

`client/fx.ts` owns deterministic, bounded presentation state; `fx-renderer.ts` renders pooled sprites and graphics; `lighting.ts` generates normal maps once at load. Textures are generated locally with Canvas, without external assets or downloads. No raster generation or runtime image service is required.

Particles are capped at 420 (110 with low effects), transient flashes at 20 and wrecks at 12. Sprite storage is bounded to 720; textures and light objects are reused. Updates pause with solo play, and restart clears all FX. World effects render only on authorized visible ground; actor exhaust and charge glow use observed living actors. The renderer receives neither hidden actors nor private AI state. Authorized smoke clouds are rendered directly from their observations.

Reduced motion removes moving particles, fire flicker, charge lights and bright flash lights, retaining stable smoke and static wreck silhouettes. Low effects reduces burst counts, smoke layers, flicker and surface-light capacity. HUD, crosshair and tactical indicators remain above effects.

## Test-first verification

Before implementation, five of six FX unit tests failed on missing charge response, wreck lifecycle/pause, bounded/reset state, reduced effects and smoke geometry. Two normal-map tests then failed on flat-surface and ridge encoding before the height-field conversion was implemented. Browser acceptance failed on the missing FX diagnostics before Phaser integration, then passed explosion/wreck lighting, pause, visibility loss and reduced motion scenarios. Repeatability and immutable event inputs are also covered. A further failing test preceded expanding/fading shockwave rings.

Local regression, performance inspection, CI and standalone release results are recorded below after final verification. Human evaluation of readability and enjoyment remains pending.

## Local checkpoint

The full local run passes 153 unit tests and all 38 Chromium browser tests; a subsequent focused run passes the ninth new FX/lighting case, bringing the unit coverage to 154 tests. Strict TypeScript, production build and map/route validation pass. The existing Phaser bundle-size warning remains.

Production screenshots were inspected for actual charged-shot destruction and deployed smoke. An isolated Chromium run at device scale factor 2 measured 599 frames during real movement, deployed smoke and repeated charged shots: p50 16.7 ms, p95 16.8 ms, p99 33.4 ms, up to 105 rendered particles and three light sources, with no page errors. This indicates mostly 60 Hz pacing on the reference host, with occasional missed frames; it is not broad hardware certification or a worst-case stress benchmark. An earlier sample running alongside the browser suite was intentionally excluded from that result.

Chromium/WebKit production engine checks pass five scenarios; WebKit's offline-emulation case retains its documented upstream skip. All three offline acceptance checks pass against the refreshed standalone package, including full process restart with networking disabled and missing Worker cache repair.

The standalone archive contains version `1.2.0-solo` and source checkpoint `705c403156851a0a93bb0a2ccfa505c01fbeacda`. Current `release/ironveil-solo-v1.tar.gz` SHA-256: `75ce79d80087979178dc0654bd92d11aa35d14810eea4291157344ac4dbe76c8`; sidecar verification passes. This supersedes the historical archive checksums in the earlier AI and recoil reports. The updated build is served at http://127.0.0.1:4180/. Close all previous Ironveil tabs and reopen to activate the new offline cache.

## CI follow-up

The first manual checkpoint passed all 154 unit tests, map validation and build, plus 37 of 38 browser scenarios. The existing right-click cancellation browser test missed the short eight-tick recovery state on the slower CI renderer and observed the subsequent ready state. The test now latches the Worker-confirmed transition with a MutationObserver before sending right-click, then verifies release returns to ready with no shot or hit. No game rules or FX implementation changed for this correction. Final repeat verification and CI result follow below.
