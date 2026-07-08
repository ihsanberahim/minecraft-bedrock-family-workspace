# Mining & Logging XP Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system that grants experience to players for mining logs/ores and hunting meat-dropping animals, integrated into the existing LevelPerks pack.

**Architecture:** Create a new `xp_rewards.js` script containing the block/entity XP mappings and event subscriptions (`world.afterEvents.blockBreak` and `world.afterEvents.entityDie`). Import this script into the main `index.js` file of the `LevelPerks` behavior pack.

**Tech Stack:** Minecraft Bedrock Script API (`@minecraft/server`).

## Global Constraints

- Exclude Coal and Diamond ores from custom XP drops.
- Weapon/armor ores (Iron, Gold) must give the same XP amount as the doubled hunting XP (+2).
- Only player entities should receive XP from hunting.

---

### Task 1: Create the XP Rewards Module

**Files:**
- Create: `behavior_packs/LevelPerks/scripts/xp_rewards.js`

**Interfaces:**
- Consumes: `@minecraft/server` (`world` object)
- Produces: Subscribes to block break and entity die events.

- [ ] **Step 1: Write the implementation**

Since Bedrock Script API lacks a standard external unit test runner (like pytest), we will implement the logic directly and verify it in-game.

Create `behavior_packs/LevelPerks/scripts/xp_rewards.js`:

```javascript
import { world } from '@minecraft/server';

// Configuration Maps
// Iron and Gold ores match the hunting XP amount (2).
const BLOCK_XP = {
    'minecraft:log': 1,
    'minecraft:log2': 1,
    'minecraft:cherry_log': 1,
    'minecraft:mangrove_log': 1,
    'minecraft:crimson_stem': 1,
    'minecraft:warped_stem': 1,
    'minecraft:copper_ore': 1,
    'minecraft:deepslate_copper_ore': 1,
    'minecraft:iron_ore': 2,
    'minecraft:deepslate_iron_ore': 2,
    'minecraft:gold_ore': 2,
    'minecraft:deepslate_gold_ore': 2,
};

// Extra XP to simulate doubled vanilla drops
const ENTITY_XP = {
    'minecraft:cow': 2,
    'minecraft:pig': 2,
    'minecraft:sheep': 2,
    'minecraft:chicken': 2,
    'minecraft:rabbit': 2,
    'minecraft:salmon': 2,
    'minecraft:cod': 2,
};

// Handle Mining
world.afterEvents.blockBreak.subscribe((event) => {
    const blockId = event.brokenBlockPermutation.type.id;
    const amount = BLOCK_XP[blockId];
    if (amount) {
        event.player.addExperience(amount);
    }
});

// Handle Hunting
world.afterEvents.entityDie.subscribe((event) => {
    const entityId = event.deadEntity.typeId;
    const amount = ENTITY_XP[entityId];
    
    // Ensure the damager exists and is a player
    if (amount && event.damageSource.damagingEntity && event.damageSource.damagingEntity.typeId === 'minecraft:player') {
        event.damageSource.damagingEntity.addExperience(amount);
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add behavior_packs/LevelPerks/scripts/xp_rewards.js
git commit -m "feat: add xp_rewards script with block and entity mappings"
```

---

### Task 2: Integrate XP Rewards into LevelPerks

**Files:**
- Modify: `behavior_packs/LevelPerks/scripts/index.js`

**Interfaces:**
- Consumes: `xp_rewards.js` module.

- [ ] **Step 1: Write the implementation**

Modify `behavior_packs/LevelPerks/scripts/index.js` to import the new script. Add the following line at the very top of the file, above the other imports:

```javascript
import './xp_rewards.js';
```

- [ ] **Step 2: Run test to verify it passes (In-Game Verification)**

Since this is a Minecraft server script, you will need to start the Bedrock Dedicated Server (`run-server.ps1` or `bedrock_server.exe`), join the game, and verify:
1. Breaking an Oak Log grants +1 XP.
2. Breaking Iron Ore grants +2 XP.
3. Killing a Cow grants +2 XP directly to the player, on top of any vanilla orbs dropped.

- [ ] **Step 3: Commit**

```bash
git add behavior_packs/LevelPerks/scripts/index.js
git commit -m "feat: import xp_rewards into main LevelPerks script"
```
