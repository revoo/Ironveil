# Tactical AI — solo 1.1

## Status and scope

Implemented for owner playtest after the owner explicitly requested the proposed tactical improvements and a F.E.A.R.-inspired approach. This is an AI refinement of the accepted solo deathmatch, not an expansion into multiplayer or new tank mechanics. The approved drift, cannon, HP/damage, terrain, visibility and smoke rules remain unchanged.

The design takes inspiration from Jeff Orkin's [Three States and a Plan](https://madwomb.com/tutorials/gamedesign/prototyping/gdc2006_JeffOrkin_AI_FEAR.pdf): select goals, describe actions through preconditions/effects/costs, and search for a valid sequence. Ironveil uses a small original implementation suited to its tanks, not F.E.A.R.'s original code or complete behavior system. Utility chooses the intention; bounded symbolic planning chooses steps; the executor verifies real observations and issues normal tank controls.

## What changed

- Reachable tactical destinations score firing range/angle, cover from all observed enemies, escape space, teammate spacing, travel and exposure along the route. Flankers choose an angle around the engager, rather than a fixed orbit offset. Pathfinding accepts a nonnegative exposure cost alongside terrain costs.
- Team roles are derived from the same authorized team facts. One tank pressures while its partner flanks. Healthy teammates take pressure responsibility when another is badly hurt. Roles are held briefly to avoid constant swapping.
- Aggressive, balanced and cautious trait bands are seeded per tank identity. They affect distance/cover preference, cooperation, commitment, retreat cadence and pressure versus relocation. Identity traits survive respawn; tactical memory resets.
- Contact memory uses visible motion and frozen authorized sightings. Lost-contact hypotheses spread within a bounded possible region; known walls and visibly empty locations eliminate possibilities. Estimates lose confidence and expire according to difficulty. New teammate sightings can refresh an older last-known observation, never a hidden live transform.
- Mud evidence remains anonymous. Both possible directions along a tread axis can create clues. Sound creates a small sector/band hypothesis fan, never an exact shooter origin. Clues, history and candidate positions are bounded.
- Utility includes survival, pressure, flank, post-shot relocation, investigation and search. Commitment resists small score changes, while lost/new targets and observed projectile danger can invalidate it. Investigations do not switch just because another clue becomes marginally closer.
- The action planner searches facts such as contact, cover, cannon readiness, angle, charge and smoke availability. Search is bounded to 64 expansions and six actions; position selection considers at most 80 samples and five path queries.
- Fire control leads motion inferred from successive visible snapshots, resets velocity after a visibility gap, keeps target attention through small distractions and uses correlated settling aim error. Difficulty reaction/uncertainty presets remain; no HP, damage, vision or traverse bonuses were added.
- Only observed hostile shells can trigger evasive movement, after the preset reaction delay. Closest-approach estimation includes the tank's own observed drift. Unseen/friendly shells cannot trigger a dodge. Charging can be cancelled for danger, lost contact or an unusable hold window.
- Withdrawals are bounded and followed by an opportunity to re-engage. Unproductive firing holds eventually seek another position. Movement still passes through shared inertia/collision rules; no teleport, instant turret rotation or custom bot physics exists.
- Visible tanks now show a charge ring. Its visibility follows authorized contact rendering and it disappears on hide, making preparation readable to the human as well as available to tactical decisions.

Examples the planner can produce include `take-angle → charge → fire`, `charge-in-cover → take-angle → fire` for a short peek, `smoke → withdraw`, `move-cover` when smoke is unavailable, and `move-to-clue → scan`. An already charged weapon can plan directly to `fire`. These are search results from grounded facts/costs, not a single hard-coded action sequence. Symbolic effects do not alter the simulation; failed physical preconditions invalidate the plan and real movement/weapon state controls progress.

## Code map

| File | Responsibility |
| --- | --- |
| shared/sim/bot.ts | Orchestration, intention choice, target attention, planning inputs, executor and progress recovery |
| shared/sim/ai/planner.ts | Bounded uniform-cost goal/action search and commitment selection |
| shared/sim/ai/memory.ts | Authorized contact history, confidence, negative evidence and anonymous clues |
| shared/sim/ai/positions.ts | Stable traits, complementary roles, position scoring and exposure-aware route selection |
| shared/sim/ai/combat.ts | Visible-motion interception and reaction-limited relative projectile avoidance |
| shared/sim/ai/geometry.ts | Shared tactical geometry helpers |
| shared/sim/navigation.ts | Weighted A* plus safe connection from valid off-grid hull positions |
| tools/ai-diagnostics.ts | Headless-only behavior/plan timing counts; never transmitted in an observation or exposed through a web endpoint |

Decisions remain staggered at 6 Hz; the authority remains 30 Hz. All decision inputs are authorized observations and static map geometry. The planner has no full-world closure, hidden enemy lookup, future player command or machine-learning service. State is local and offline. Protocol remains 6; content version is 7; the package is 1.1.0-solo.

## TDD and refinements

Behavior tests were written before the new planner/memory/tactics/combat components and their controller integration. Initial failures covered missing action chains and resource alternatives, commitment, observed-motion memory, uncertainty/negative evidence, role/cover selection, leading, delayed dodging and exposure-aware routing. Integration failures covered actual smoke/withdraw execution, complementary destinations, target stickiness and motion leading.

Further regressions preceded fixes for personality changes on respawn, investigation churn, endless low-health retreat, precharging a route too long to complete safely, one-sided cover mistaken for safety against two enemies, stale teammate sightings failing to refresh memory, ignoring own drift during evasion, insufficient neighboring personality diversity, support for injured allies, interrupted charged-shot preconditions and unproductive firing holds. The visible charge cue acceptance failed before it was rendered, then passed through authorized show/hide.

The seed sweeps exposed a navigation defect that short component tests did not: physical drift could reach a valid circular-hull position outside the conservative grid's valid cell centers. Merely replanning could not leave it. Regressions record the actual narrow-gap and rounded-corner positions. A local connector now sweeps the actual circular hull (rectangle strips plus rounded corners) into a valid grid node before A*. It preserves physical collision clearance; it does not move the tank directly. Stationary-period sweeps were repeated after this correction.

## Validation and remaining evaluation

The final result table, source checkpoint, CI and refreshed package are recorded below after verification. Previous solo features remain covered by their regression suites and specification audit.

These tests establish bounded, fair and executable behavior, not human-level intelligence or calibrated difficulty. Search hypotheses are a small geometric approximation, not a complete probabilistic world model. Team coordination is a two-tank role scheme, not a general squad commander. Traits and tactical weights are starting tuning choices. No wall-clock two-hour soak, multiplayer balance, online capacity or new browser certification is claimed. The prior Firefox-host and WebKit offline-emulation limitations remain in the solo handoff.

Owner playtest should assess whether pressure/flanks are legible, smoke breaks contact, searches can be outwitted, aggressive/cautious tanks differ, and dodges feel fallible. Human feedback is needed to judge pacing and whether these stronger tactics remain enjoyable.

### Final local results

- 139 unit tests pass, including 32 new tactical component/controller scenarios; strict build and authored map validation pass.
- All 33 Chromium browser tests pass, including real Worker/Node early replay consistency, actual training completion, sprite/charge-cue hide/reveal, controls, context recovery and full offline browser restart/repair.
- Final 100-seed sweeps per preset (300 matches) all terminate. With an idle human, Blue/Red wins are 2/98 easy, 4/96 normal and 0/100 hard, with no draws. These are termination checks, not difficulty calibration. Maximum active shells are 7/8/8; deaths total 2,223/2,217/1,963. Longest measured live-bot stationary periods are 3.93/3.53/3.47 seconds, replacing the extended stalls found during refinement.
- A separate 100-seed normal replay found no eight-second idle episode after the rounded-hull navigation correction.
- Ten normal diagnostic matches exercised short-peek precharge, move-before-charge, tap fire, reload/recover chains, smoke/withdraw, direct fire from an existing charge and investigation/scan. They produced 1,562 actual shot events and seven vents. Whole shared-step p95/p99 measured 0.508/1.034 ms on the M1 Pro reference host; this includes all bots, not just the planner, and is not an online capacity claim.
- Two accelerated simulation hours per preset (six simulated hours total) completed across real match restarts without invalid actor state or storage-bound violations. Max tracks 9/10/17 and max shells 4/7/7; shared-step p99 0.872/0.886/0.950 ms. This is not a six-hour wall-clock browser soak.

The refreshed archive, isolated rendering sample and final manual CI checkpoint are recorded with the release result after the source commit. Existing browser-validation limits remain explicit; no human playtest result is claimed.

### Release result

Source checkpoint `177b73777391a692304c7939e0d29c7d2d62330f` passed [manual CI](https://github.com/revoo/Ironveil-Sol6.1Medium/actions/runs/42087641667). GitHub's authenticated API confirmed that the original authorized repository and both historical CI checkpoints retain immutable repository ID 1445799489 under the renamed canonical address `revoo/Ironveil-Sol6.1Medium`.

The refreshed `release/ironveil-solo-v1.tar.gz` contains solo version 1.1.0 and the source checkpoint in build-info.json. SHA-256: `29bf0deb04c867e812f5f7b44ab7d4c0023cd59954c5fa6324343e9bb704def1`; the sidecar checksum verifies. All three packaged offline acceptance tests pass, including full Chromium process shutdown/restart with network disabled and cache repair. The standalone server is available locally at http://127.0.0.1:4180/.

A fresh isolated Chromium 140 rendering sample of the refreshed package, with movement, smoke and repeated firing at device scale factor 2, measured 600 frames with p50 16.7 ms and p95/p99 16.8 ms, with no page errors. This is the local reference sample, not broad device certification. Close and reopen old Ironveil tabs to activate the new cached version; updates do not replace an active match.

Owner evaluation of tactical readability, challenge and human-like behavior remains pending. No additional CI run is needed for this documentation-only result record.
