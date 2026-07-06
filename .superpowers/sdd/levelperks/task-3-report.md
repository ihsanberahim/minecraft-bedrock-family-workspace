# Task 3 Report: Implement Tier Change Notifications

## Implementation Details

1. **Perk Label Mapping (`TIER_LABELS`)**:
   - Defined `TIER_LABELS` in `behavior_packs/LevelPerks/scripts/index.js` containing readable perk labels for tiers 1 through 5, matching the requested specification:
     - Tier 0: `null` (no notification)
     - Tier 1: Level 10 - `§bProtection I §7(Resistance I)`
     - Tier 2: Level 20 - `§bProtection I §7(Resistance I)§7, §bRegeneration I`
     - Tier 3: Level 30 - `§bProtection II §7(Resistance II)§7, §bRegeneration I`
     - Tier 4: Level 40 - `§bProtection II §7(Resistance II)§7, §bRegeneration II`
     - Tier 5: Level 50 - `§bProtection III §7(Resistance III)§7, §bRegeneration II`

2. **Perk Upgrade Notification (`checkAndNotify`)**:
   - Implemented `checkAndNotify(player, newTier)` in `index.js`.
   - Retrieves the last stored tier from the player's dynamic property `"levelperks_tier"` (defaulting to 0).
   - If the player's new tier matches the stored tier, the function returns immediately.
   - Updates `"levelperks_tier"` dynamic property to the new tier.
   - If `newTier > stored` (meaning the player upgraded to a higher tier), sends a level up chat message to the player via `player.sendMessage()`.
   - Downgrades are handled silently (only updating the stored dynamic property without sending any message).

3. **Ticking Loop Update**:
   - Updated the loop inside `system.runInterval` to call `checkAndNotify(player, tier)` for each player.
   - Crucially, `checkAndNotify` is invoked inside the player iteration loop's `try-catch` block (preserving Task 2 error isolation).
   - Retained the `world.getAllPlayers()` method to retrieve active players.

## Testing & Verification

1. **Test Harness Extension (`tests/test_levelperks.js`)**:
   - Extended `createTestPlayer` to mock dynamic properties:
     - Initializes `player.dynamicProperties = {}`.
     - Implements `player.getDynamicProperty(key)` and `player.setDynamicProperty(key, value)`.
   - Added a dedicated test suite section `Testing tier change notifications and dynamic properties...` which runs the following checks:
     - **Initial Setup (Level 0)**: Verifies dynamic property is undefined/0, and no messages are sent.
     - **Level Upgrade (Level 10)**: Verifies that reaching Level 10 triggers exactly 1 message containing "Level 10" and updates `"levelperks_tier"` to `1`.
     - **Stable Level (Level 10 again)**: Verifies that no additional messages are sent on the subsequent ticks if level is unchanged.
     - **Level Upgrade (Level 20)**: Verifies that upgrading to Level 20 sends a new message containing "Level 20" and updates `"levelperks_tier"` to `2`.
     - **Level Downgrade (Level 5)**: Verifies that downgrading to level 5 does not send any message (silent downgrade) and resets `"levelperks_tier"` to `0`.
     - **Re-Upgrade (Level 10 again)**: Verifies that leveling back up to 10 sends the message again.

2. **Test Command & Execution**:
   - Executed the test suite in Node:
     ```bash
     node --experimental-vm-modules E:\minecraft-bedrock-server-local\tests\test_levelperks.js
     ```
   - Output:
     ```
     Running LevelPerks Tier and Loop Tests...
     PASS: system.runInterval registered successfully with 100 ticks.
     Testing getTier function...
     PASS: getTier tests passed.
     Testing interval callback execution with players of different levels...
     PASS: All player tier effects applied correctly in loop!
     Testing error isolation in player loop...
     PASS: Error isolation verified. BadPlayer failure did not abort loop.
     Testing tier change notifications and dynamic properties...
     PASS: Tier change notifications and dynamic property updates verified successfully.
     All tests passed successfully!
     ```

## Commits
- `ca0c789 feat(levelperks): add tier-change chat notifications and test coverage`
