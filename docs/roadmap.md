# Current roadmap — solo fun first

## Owner scope change — November 4, 2026

The owner explicitly deferred multiplayer to focus on making a fun game first. This supersedes the final specification's requirement to deliver M3 before later gameplay milestones. The specification's combat, movement, perception and content constraints still apply; multiplayer is deferred, not a current delivery prerequisite.

M0 and M1 are complete; M2 is implemented with Gate A passed for now by owner feedback. Preserve that movement/combat baseline. Existing Colyseus scaffolding can remain, but do not expand rooms, matchmaking, prediction/reconciliation, reconnect, VPS deployment or network-load tooling during the solo phase.

## S1 — local bot battle (implemented; owner authorized progression)

Implementation and local verification are recorded in [the S1 handoff](s1.md); the owner authorized S2 after approving the drift-control revision. Scope: an end-to-end Worker-hosted solo match: default player plus allied bot versus two enemy bots, a minimal Relay Control objective, team-safe combat, HP/death/respawn, score/time/result, and pause/restart. Use the training/gray-box layout and existing placeholder presentation. Bots use the same control intents and combat rules as the human. Their decision interface receives team-authorized observations and map/objective data, not the full simulation. Start with one normal behavior preset; three presets follow after behavior is worth tuning.

Bring forward only the bot/navigation and minimal match rules needed for this playable milestone. No second weapon, special mechanics, polished art or online systems. Write behavior tests before implementation, including team damage, respawn/scoring order, fair bot observations, navigation, pause and lifecycle. Deliver one runnable milestone and request owner playtest at completion, rather than after intermediate slices.

## Current milestone: S2 — stealth and encounter loop (implemented; awaiting playtest)

The [S2 handoff](s2.md) records implementation and local verification. Scope: the Relay Yard gray box, brush, wall/smoke sight rules, silent running, coarse sound evidence, mud tracks, stale sightings and map approaches. Keep local play filtered through the same observation boundary as bot decisions. Evaluate scouting, shot choices, escape/reappearance and understandable ambushes through owner solo playtests. Record this as solo evidence: it does not establish multiplayer balance or satisfy the original several-human-match Gate B procedure.

Tune controls, cues, map routes and bot fallibility based on encounters. Do not add content to compensate for a weak loop. Forest-depth occlusion remains out of scope; brush concealment and map dressing are the specified vegetation mechanics.

## S3 — solo usability and delivery

Add difficulty presets, tutorial/settings/accessibility, presentation refinement and robust offline caching once the local loop is promising. These remain milestone-level handoffs with explicit human feedback.

## Deferred online phase

Reassess online scope with the owner after the solo loop is enjoyable. The existing shared-simulation boundary keeps the option open. Online authority, filtering, reconciliation, reconnect and operational/load validation still require their own implementation and evidence before any multiplayer release. Do not claim solo results validate those systems.

TDD, conservative manual CI, milestone commits/pushes, and milestone-only playtest handoffs remain active project instructions.
