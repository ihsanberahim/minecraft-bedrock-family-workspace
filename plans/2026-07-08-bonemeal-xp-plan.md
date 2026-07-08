# Bone Meal XP Reward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Award players 1 XP whenever they use bone meal on a block.

**Architecture:** Subscribe to the `world.afterEvents.itemUseOn` event. Check if the item used is bone meal, and if so, execute the `/xp 1 @s` command asynchronously on the player.

**Tech Stack:** Minecraft Bedrock Script API (`@minecraft/server`).

## Global Constraints

- Item used must be exactly `"minecraft:bone_meal"`.
- XP amount must be 1.
- XP must be awarded using `player.runCommandAsync("xp 1 @s")` to prevent client desync.

---

### Task 1: Implement Bone Meal XP Subscription

**Files:**
- Modify: `behavior_packs/LevelPerks/scripts/xp_rewards.js`

**Interfaces:**
- Consumes: `world` from `@minecraft/server`.
- Produces: A new event subscription to `itemUseOn`.

- [ ] **Step 1: Write the implementation**

Add the following event subscription at the bottom of `behavior_packs/LevelPerks/scripts/xp_rewards.js`:

```javascript
world.afterEvents.itemUseOn.subscribe((event) => {
    const itemStack = event.itemStack;
    if (itemStack && itemStack.typeId === "minecraft:bone_meal") {
        event.source.runCommandAsync("xp 1 @s");
    }
});
```

- [ ] **Step 2: Run test to verify it passes (In-Game Verification)**

1. Start the server.
2. Join the game.
3. Take some bone meal and use it on a block (e.g., grass or a crop).
4. Verify that you instantly receive +1 XP and your XP bar stays updated (does not revert after a few seconds).
