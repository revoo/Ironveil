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
