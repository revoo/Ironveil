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

The owner deferred multiplayer on November 4, 2026 to prioritize a fun solo game. Follow docs/roadmap.md over the original milestone order. The owner authorized S2 on November 5 after approving responsive drifting movement. S2's stealth/encounter loop is implemented and awaiting the owner's milestone playtest (docs/s2.md). Resolve that feedback before expanding S3. Preserve the approved vector drift controls; Space fires and Q deploys smoke. Do not expand online infrastructure until the owner reactivates that scope. Preserve shared rules and explicit observation boundaries.

Finish and locally verify a whole milestone before handing it to the owner for playtest. Do not request playtests for intermediate implementation slices. Human gates require recorded feedback; the M2 Gate A approval is provisional and does not validate future solo or multiplayer encounters.
