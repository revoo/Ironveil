# Ironveil development instructions

## Test-driven development

For every milestone and new behavior, write tests before implementation. Use small behavior slices within each milestone:

1. Define observable behavior with focused tests derived from the specification.
2. Run the tests and verify they fail for the intended reason (red).
3. Implement the behavior and run the relevant tests until they pass (green).
4. Refactor while keeping the relevant checks passing.

Apply this to bug fixes by reproducing the failure in a test before correcting it. Record meaningful red/green verification in milestone reports. Do not count a test that only fails because of broken test setup as behavioral evidence. Human playtest gates still require human feedback; automated tests do not establish fun or readability.

## Verification and version control

Use local checks during development. GitHub CI is manually triggered for substantial checkpoints and release validation; avoid routine CI runs for small changes. Commit coherent, reviewable changes and keep the GitHub repository updated. Report incomplete milestones and untested gates honestly.

## Active roadmap and playtest cadence

The owner deferred multiplayer on November 4, 2026 to prioritize a fun solo game. Follow docs/roadmap.md over the original milestone order. The owner accepted the S2 systems and authorized further development on November 5, deferring detailed mode refinement. The owner accepted S3 solo usability/offline delivery and authorized S4 on November 5. The owner accepted S4 team deathmatch for progression (“very good. continue”). The owner accepted S5 artwork/readability (“i like it”). S6 is implemented. The owner then authorized completing all remaining solo scope before the next playtest. The completed solo V1 implementation and final verification are tracked in docs/solo-v1.md; the final owner playtest remains pending. Preserve the accepted default team deathmatch rules. The owner criticized the repetitive Relay/smoke-camping loop and prefers team deathmatch as the next mode experiment; Relay fun is not validated and its redesign was deferred during S3. Preserve approved vector drift; default Space fires and Q smokes, with remapping in Settings. Do not expand online infrastructure until the owner reactivates that scope. Preserve shared rules and explicit observation boundaries.

The owner explicitly authorized completing the entire remaining solo specification before the next playtest on November 5. Do not stop at intermediate milestone playtest gates; complete and locally verify the remaining solo scope, maintain milestone commits, and make one final handoff. Multiplayer remains deferred. Human gates require recorded feedback; the M2 Gate A approval is provisional and does not validate future solo or multiplayer encounters.


## Authorized tactical AI pass

After solo V1, the owner explicitly requested all proposed tactical AI refinements plus a F.E.A.R.-inspired planning approach. The implementation is recorded in docs/tactical-ai.md: bounded goal/action search, utility/commitment, authorized uncertain memory, scored positions/routes, coordinated roles, persistent identity traits and reaction-limited fire/evasion. Preserve the observation boundary and approved mechanics. Planning facts are predictions, never authority outcomes. Keep personality stable through respawn and keep diagnostics headless-only. Deliver one verified AI handoff; owner evaluation of the new behavior remains pending. Multiplayer is still deferred.
