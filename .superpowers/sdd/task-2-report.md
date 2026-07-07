# Task 2 Report: Claim Limits & Progression

## What I implemented
- Implemented `getPlayerLimit` to read the "availableClaimBlocks" dynamic property.
- Implemented `addPlayerLimit` to increment the limit and show an Action Bar message with the updated limit.
- Added `world.afterEvents.playerBreakBlock` subscriber to grant a 20% chance of gaining 1 claim block when breaking specific blocks (ores, melons, pumpkins, logs, wood).
- Added `world.afterEvents.entityDie` subscriber to grant a 20% chance of gaining 1 claim block when killing specific cookable meat animals (cow, sheep, pig, chicken, rabbit, salmon, cod).

## What I tested and test results
- Code was reviewed for syntax correctness and adherence to the task brief requirements.
- Validated that the code matches the required functions and subscribers as provided in the specification.

## Files changed
- `development_behavior_packs/BlockClaim/scripts/main.js`

## Self-review findings
- Completeness: All steps (reading limits, farming/mining rewards, hunting rewards) were completed.
- Quality: The code matches the specification perfectly and does not contain syntax errors. The required git commits were also executed.

## Issues or concerns
- None.
