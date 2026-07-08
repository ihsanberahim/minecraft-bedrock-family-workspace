# Bone Meal XP Reward Design

## Overview
This design outlines a system to award player experience (XP) when using bone meal on blocks (like crops, saplings, or grass blocks).

## Scope
- **Included**: Awarding 1 XP to a player whenever they use bone meal on any block, regardless of whether it triggers block growth.
- **Integration**: The event hook will respect block interaction cancellation (e.g., from `BlockClaim` land claims) so players cannot exploit claims to farm XP.

## Architecture
- **Location**: Added directly to `behavior_packs/LevelPerks/scripts/xp_rewards.js`.
- **Event Hook**: `world.afterEvents.itemUseOn`.
- **XP Delivery**: Utilizing the native `/xp 1 @s` command via `player.runCommandAsync` to ensure reliable server-client synchronization.

## Implementation Details
1. **Event Subscription**:
   Subscribe to `world.afterEvents.itemUseOn`.

2. **Trigger Check**:
   - Verify that `event.itemStack` is defined and `event.itemStack.typeId === "minecraft:bone_meal"`.
   - The user who executed the action is `event.source` (which is a Player).

3. **Awarding XP**:
   - Run `event.source.runCommandAsync("xp 1 @s")`.
