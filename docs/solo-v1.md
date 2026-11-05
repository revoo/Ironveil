# Ironveil solo V1 — implementation and final playtest handoff

## Scope

The owner authorized finishing the entire remaining solo specification on November 5, 2026, with one playtest after completion and no multiplayer work. This supersedes intermediate milestone gates. Implementation is complete for this solo scope; the final owner playtest is pending. It does not declare the original online V1 complete or invent results for the unfamiliar-player fun/onboarding gates.

Approved changes from the original final_spec.md remain authoritative: Space fires, Q smokes, responsive vector drift replaces hull-constrained movement, and team deathmatch replaces Relay Control. The chosen presentation is the original stylized code-generated art and synthesized audio; no commissioned or third-party media is required.

## Requirement audit

| Solo requirement | Delivered |
| --- | --- |
| Chassis, independent turret, responsive acceleration/deceleration, terrain, silent movement and wall sliding | Shared simulation, approved drift baseline; movement tests |
| One cannon; authoritative charge/hold/reload/cancel/vent, 22–55 damage, 400–750 speed, 900 range, swept collision and trades | Shared cannon and match resolver; no one-hit full-HP kills, no friendly damage, allied shells pass through |
| Wall/smoke occlusion, brush concealment, shared living-team vision, firing reveal | Filtered observations used by bots and presentation; no hidden extrapolation |
| Anonymous mud evidence, coarse sound, stale sightings | Bounded storage and expiry, canonical tread axes, no hidden owner or live linked trails |
| Smoke ability and cooldown | Shared life/radius/recovery rules, factual HUD and training |
| Authored production map with small layout, landmarks and training map | Validated Tiled-compatible Relay Yard full/small data; solo uses the small layout. Radio lattice, depot roofs and bridge warning strips distinguish existing cover |
| One complete match mode | Accepted 2v2 team deathmatch; 15 kills/seven minutes, bounded overtime, respawn/protection, restart/results/rematch |
| Fair bots and three presets | Authorized observations only, weighted navigation, search/investigate/engage/flank/retreat/recovery; presets alter reaction/aim/memory, not combat statistics |
| Local Worker authority, fixed ticks and lifecycle | Elapsed-time 30 Hz scheduling with at most four catch-up steps and discarded excess debt; paused time never fast-forwards; stale input cancels |
| Offline after connected cache, atomic updates and repair | Verified shell/Worker/config/art/audio bundles, complete candidate-cache publication, missing-asset recovery, update waits for old tabs to close |
| Sprites, charge-scaled feedback and readable outcomes | Separate hull/turret textures, team symbols, recoil, scaled flash/projectiles/trails/audio, confirmed visible personal hits and destruction, coarse incoming trajectory cues |
| HUD, actual barrel/requested aim, minimap and scoreboard | HP/protection/respawn, charge/vent/recovery, smoke, quiet/reveal facts, score/time, authorized minimap. Hold remappable Tab while the battlefield is focused, or use the Scoreboard button |
| Tutorial, accessibility and audio controls | Nine actual exercises, restart/skip, remappable keyboard controls, keyboard cancel, scalable text, non-color team symbols, visual sound cues, reduced motion/low effects, separate effects/music volumes and master mute |
| Resize/fullscreen, failure recovery | Fixed 960×540 logical view with fitting/letterboxing; fullscreen button. Worker failure and actual WebGL context loss expose reload recovery; context loss pauses the authority |
| Delivery and repeatable checks | Standalone static release archive, checksum, source build metadata, included licenses, local server, offline/browser tests, diagnostics and rollback instructions |

No new weapon, chassis, map, armor, healing, inventory, forest-depth occlusion, progression or optional Beacon mode was introduced. The production client never connects to Colyseus, including the range. The old connection diagnostic remains development-only behind `?range=1&diagnostics=1`; no online game infrastructure was expanded.

## Play and distribution

Development: `npm ci`, `npm run dev`, then http://127.0.0.1:5173/.

Production: `npm run package:solo`. The archive is `release/ironveil-solo-v1.tar.gz`, with a SHA-256 sidecar. Extract it, enter `ironveil-solo/`, run `node server.mjs --dir public --port 4173`, and open http://127.0.0.1:4173/. It requires Node 20 or newer, no npm install, no multiplayer process and no database. Alternatively serve the `public/` contents at an HTTPS origin root. File-URL opening is unsupported because Workers/service workers require an appropriate origin.

Wait for Ready for offline solo before disconnecting. Settings are per origin; new browser sessions start a new match. No match save is required. A missing/evicted browser cache needs a connection to restore it. Fullscreen changes presentation size, never tactical world-view area. Tab retains normal page navigation outside the battlefield; clicking the battlefield focuses game keys. Escape opens Settings; closing it leaves solo paused until Resume.

The original ambient music loop is non-positional and deliberately quiet. Music and effects volumes are independent; M mutes both. Music pauses on local pause/visibility loss/context loss. It carries no hidden-state information. Tactical sounds remain synthesized locally from authorized cues.

## Hosting and rollback

The included server serves only static files on localhost. It supplies appropriate MIME, no-cache for HTML/service worker, immutable caching for hashed assets and rejects unsupported methods/path escape. It has no game authority, sessions, account storage or sockets.

Publish an entire verified `public/` version together. Preserve the prior archive and its checksum. For an update retain old hashed assets while old tabs remain open; old clients keep their active cached version. Finish matches, close all Ironveil tabs and reopen to activate an update. To roll back restore the complete previous directory and apply the same close/reopen procedure. A new cache version is never forced into a running match. No public deployment or VPS changes were made.

## TDD and verification record

The completion slice began with behavioral failures for elapsed-time scheduling, bounded catch-up, pause debt, retained transient events, music/scoreboard settings, missing music PCM, missing scoreboard/fullscreen/context recovery and a missing standalone shell. Each passed after its implementation. A further browser regression reproduced Tab intercepting native page navigation; the fix scopes held Tab to the focused battlefield and explicitly focuses the canvas on pointer input. Earlier milestone red/green records remain in their reports.

Transient authorized events now pass through a bounded, deduplicating inbox so a catch-up burst cannot overwrite an earlier shot/impact before rendering. The effects and persistent perception rules remain separate. The production legacy transport import is pruned, reducing the main bundle to about 1.54 MB uncompressed; Phaser still exceeds Vite's chunk warning threshold.

Current validation evidence is recorded below and in GitHub CI. Human playtesting, not automated checks, must establish readability and fun.

### Local verification

- 107 unit tests pass, including standalone serving/MIME/cache/path checks and fixed-clock/event-inbox tests.
- All 33 final Chromium acceptance tests pass. All three offline acceptance tests also pass against the standalone package on port 4180, including full Chromium process shutdown/restart with networking disabled, missing-Worker detection/repair and first-visit failure.
- Chromium/WebKit engine smoke suite: five pass; WebKit offline emulation is explicitly skipped after reproducing the matching [upstream Playwright navigation issue](https://github.com/microsoft/playwright/issues/42775). Both engines boot, drive, pause and run the production range without sockets. Chromium offline reload passes.
- Firefox 141 was installed, but its automated test context stalled on this host and was stopped. Firefox validation is not claimed. It remains opt-in via `IRONVEIL_FIREFOX=1`; the engine suite has a bounded global timeout.
- Two simulation hours per difficulty (648,000 total ticks, six simulated hours) completed across repeated real match restarts. This is accelerated headless execution, not six wall-clock hours or an online load test. Max tracks 8/8/5 and max shells 4/4/4; no invalid actor state or storage-bound violation. Headless step p99 was 0.061/0.066/0.062 ms on the M1 Pro reference host. These measurements exclude rendering and do not calibrate player difficulty.
- A 600-frame isolated Chromium 140 sample at device scale factor 2 during movement, smoke and repeated firing measured p50 16.7 ms, p95/p99 16.8 ms and maximum 33.4 ms, with no page errors. A concurrent five-browser test run caused contention (p95 33.4 ms); the isolated sample is the reference measurement, not device certification.
- Strict build, offline manifest generation and authored map validation pass. Offline shell includes four verified bundles; original art, effects and music are generated from cached code.

### Known validation limits and final gate

Recommended verified browser for the final playtest is Chromium/Chrome. A real Safari offline restart remains a manual check because Playwright WebKit offline emulation fails before delivering a service-worker navigation. This is recorded as unverified, not passed. Firefox automation was unavailable on this host. No broad device certification is claimed.

The owner should now play the completed tutorial and a solo match, including smoke/quiet pursuit, quick versus charged fire, incoming direction, settings, scoreboard and fullscreen. An offline Chromium restart has automated evidence; perceived mix/readability and mode balance still require the owner. The original four-of-five unfamiliar-user Gate C procedure is pending and cannot be replaced with automated tutorial completion.

Existing development-only Colyseus/dependency advisories remain outside the static solo package; do not expose that diagnostic server publicly. The large Phaser bundle and prior long-run Node/Chromium floating-point divergence remain documented limitations. Online authority, prediction/reconciliation, reconnect, rooms/queues, bot fill for disconnected humans, multiplayer load/soak, VPS/TLS operations and public deployment remain deferred by the owner. They are not implied by solo completion.


## Final source and artifact

Source checkpoint: `a0a368a7dd89f74e6689419f4cfe024b0ec40004`. The archive contains that source identifier in build-info.json. Archive: `release/ironveil-solo-v1.tar.gz`; SHA-256 `e8cccf7d0cbe8d970c66ef20fea4bc87ffb301fc928b67d6bc65f7c3267d9050`. It was served by its included server on port 4180 and passed the standalone offline checks. The final [manual CI checkpoint](https://github.com/revoo/Ironveil/actions/runs/42077929600) passed for that source. No new CI run is needed for documentation-only recording of results.
