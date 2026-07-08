# Mining & Logging XP Rewards Design

## Overview
This design outlines a system to award player experience (XP) for actions that do not naturally drop XP in vanilla Minecraft, as well as enhancing existing XP rewards. Specifically, this targets wood logs, iron/copper/gold ores, and doubles the XP for hunting meat-dropping animals. 

## Scope
- **Included (Mining)**: Awarding XP for breaking any wood block, iron ore, copper ore, and gold ore (including deepslate variants).
- **Included (Hunting)**: Awarding extra XP to effectively "double" the experience when killing animals that drop cookable meat (e.g., cows, pigs, sheep, chickens, rabbits, salmon, cod).
- **Excluded**: Coal and diamond (Vanilla XP drops remain unchanged and not doubled, unless explicitly added to the block list later).

## Architecture
- **Integration**: The functionality will be added directly to the existing `LevelPerks` behavior pack to avoid cluttering the server with multiple small packs.
- **Delivery Method**: The extra XP will be added directly to the player's XP bar using the Script API (`player.addExperience()`). 
- **New File**: A new script `xp_rewards.js` will be created in `behavior_packs/LevelPerks/scripts/`.
- **Entry Point**: The `xp_rewards.js` file will be imported into the existing `LevelPerks/scripts/index.js` file.

## Implementation Details
1. **Configuration Maps**: 
   Two mapping objects will be created at the top of `xp_rewards.js`:
   - `BLOCK_XP`: Maps block identifiers to a granted XP amount. **Note:** Any block that can be used to make weapons or armor (such as iron ore and gold ore) will give the exact same XP amount as the final doubled experience from hunting.
   - `ENTITY_XP`: Maps entity identifiers (e.g., `minecraft:cow`, `minecraft:chicken`) to an extra XP amount to simulate doubling the vanilla drop.

2. **Event Subscriptions**:
   - The script will subscribe to `world.afterEvents.blockBreak` to handle mining.
   - The script will subscribe to `world.afterEvents.entityDie` to handle hunting.

3. **Event Handling (Mining)**:
   When `blockBreak` fires, the script checks the `brokenBlockPermutation.type.id` against the `BLOCK_XP` map. If a match is found, it calls `event.player.addExperience(amount)`.

4. **Event Handling (Hunting)**:
   When `entityDie` fires, the script checks the `deadEntity.typeId` against the `ENTITY_XP` map. It also verifies that `damageSource.damagingEntity` is a valid player. If there's a match, it adds the extra experience directly to that player.
