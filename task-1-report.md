# Task 1 Report: XP Rewards Module

## What I implemented
I implemented the `behavior_packs/LevelPerks/scripts/xp_rewards.js` module. It imports the `world` object from `@minecraft/server`. It defines `BLOCK_XP` to reward 1 XP for logs and copper ores, and 2 XP for iron and gold ores (both regular and deepslate variants). It also defines `ENTITY_XP` to reward 2 XP for various farm animals and fish. The coal and diamond ores are intentionally excluded.

I subscribed to `world.afterEvents.blockBreak` to distribute block breaking XP and `world.afterEvents.entityDie` to distribute hunting XP (making sure that the `damageSource.damagingEntity` is a player).

## Files changed
- `behavior_packs/LevelPerks/scripts/xp_rewards.js` (Added)

## Self-review findings
- Checked against constraints: Coal and diamond are excluded. Weapon/armor ores (Iron, Gold) give 2 XP.
- Entity hunting gives 2 XP and verifies the damage source is a player.
- Logic is encapsulated in a single file as required, waiting to be imported by an `index.js`.

## Issues or concerns
- Assumed standard `@minecraft/server` API usage: `event.brokenBlockPermutation.type.id` for block ID, and `event.deadEntity.typeId` for entity ID, along with `player.addExperience()`. This relies on recent `@minecraft/server` versions, which seems appropriate for modern Bedrock Dedicated Server setups.
