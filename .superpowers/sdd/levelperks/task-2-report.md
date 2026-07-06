# Task 2 Report: Implement the Perk Tier Table and Effect Loop

## Implementation Details

1. **Perk Tier Table (`TIER_CONFIG`)**:
   - Defined `TIER_CONFIG` in `behavior_packs/LevelPerks/scripts/index.js` containing thresholds for level-based tier progression (Tiers 0 through 5).
   - Each tier config specifies thresholds and corresponding amplifiers for `resistance` and `regeneration` (or `null` if not active).

2. **Get Tier Logic (`getTier`)**:
   - Implemented `getTier(level)` function, scanning descending thresholds to determine the correct tier index (0-5) corresponding to player's XP level.

3. **Passive Effect Application (`applyTierEffects`)**:
   - Implemented `applyTierEffects(player, tierIndex)` which maps the active effects for a player's tier, calling `player.addEffect` with duration 300 (15 seconds) and `{ showParticles: false }`.

4. **Ticking Loop**:
   - Registered an interval loop using `system.runInterval` running every 100 ticks (5 seconds).
   - Correctly handles player retrieval using the actual `@minecraft/server` API method `world.getAllPlayers()` (instead of the plan's `world.getPlayers()`).

## Testing & Verification

1. **Test Runner (`tests/test_levelperks.js`)**:
   - Created a custom mock environment testing harness.
   - Dynamically imports production script code `behavior_packs/LevelPerks/scripts/index.js`.
   - Mocks Player object and prototypes with `.level` property and `addEffect` method tracking applied effects.
   - Verifies system.runInterval configuration (100 ticks).
   - Validates correct tier mapping for all boundary and intermediate XP levels (0, 5, 10, 15, 20, 29, 30, 35, 40, 45, 50, 100).
   - Validates that passive effects (duration, amplifiers, showParticles options) are correctly applied to players in the loop.

2. **Test Command & Execution**:
   - Executed: `node --experimental-vm-modules e:\minecraft-bedrock-server-local\tests\test_levelperks.js`
   - All tests passed successfully with output:
     ```
     Running LevelPerks Tier and Loop Tests...
     PASS: system.runInterval registered successfully with 100 ticks.
     Testing getTier function...
     PASS: getTier tests passed.
     Testing interval callback execution with players of different levels...
     PASS: All player tier effects applied correctly in loop!
     All tests passed successfully!
     ```

## Commits
- `267e715 feat(levelperks): implement perk tier table, effect loop, and node tests`

## Fix Loop Details

### Changes Applied
1. **Loop Error Isolation**:
   - Relocated the `try-catch` block in `system.runInterval` inside the player iteration loop in [index.js](file:///E:/minecraft-bedrock-server-local/behavior_packs/LevelPerks/scripts/index.js).
   - This ensures that if processing or applying effects to one player fails, it does not abort the loop or prevent subsequent players from receiving their perks.

2. **Magic Numbers Constants**:
   - Defined `EFFECT_DURATION = 300` and `TICK_INTERVAL = 100` as top-level constants.
   - Refactored `applyTierEffects` to use `EFFECT_DURATION`.
   - Refactored `system.runInterval` configuration to use `TICK_INTERVAL`.

3. **Robust Testing**:
   - Expanded the test suite in [test_levelperks.js](file:///E:/minecraft-bedrock-server-local/tests/test_levelperks.js) to include a new test case (`Testing error isolation in player loop...`).
   - This mock test ensures that when a player's `addEffect` throws an error, the error is isolated, caught, and subsequent players continue to successfully receive their perk effects.

### Test Results
All tests passed successfully:
```
Running LevelPerks Tier and Loop Tests...
PASS: system.runInterval registered successfully with 100 ticks.
Testing getTier function...
PASS: getTier tests passed.
Testing interval callback execution with players of different levels...
PASS: All player tier effects applied correctly in loop!
Testing error isolation in player loop...
PASS: Error isolation verified. BadPlayer failure did not abort loop.
All tests passed successfully!
```

