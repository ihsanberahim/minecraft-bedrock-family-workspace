# Block Claim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Minecraft Bedrock Behavior Pack that allows players to claim land using a Golden Shovel, with an earnable claim block limit.

**Architecture:** A new behavior pack named `BlockClaim` in `development_behavior_packs`. It uses `@minecraft/server` API for event listening and Dynamic Properties for storage.

**Tech Stack:** Minecraft Bedrock Scripting API (JavaScript/TypeScript).

## Global Constraints

- Must be placed in `development_behavior_packs/BlockClaim`
- Use `@minecraft/server` version `1.14.0` or compatible (based on standard scripting versions).
- All claims stored in `world.setDynamicProperty` and `world.getDynamicProperty`.

---

### Task 1: Behavior Pack Setup

**Files:**
- Create: `development_behavior_packs/BlockClaim/manifest.json`
- Create: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Produces: Base script execution environment.

- [ ] **Step 1: Create manifest.json**

```json
{
  "format_version": 2,
  "header": {
    "name": "Block Claim System",
    "description": "Claim blocks with a Golden Shovel",
    "uuid": "45d17966-3d23-41bb-9ab6-2b449195b05a",
    "version": [1, 0, 0],
    "min_engine_version": [1, 20, 50]
  },
  "modules": [
    {
      "type": "script",
      "language": "javascript",
      "uuid": "3fc0c5e7-28d8-4f27-ba79-19ec6b1d4ef3",
      "entry": "scripts/main.js",
      "version": [1, 0, 0]
    }
  ],
  "dependencies": [
    {
      "module_name": "@minecraft/server",
      "version": "1.14.0"
    }
  ]
}
```

- [ ] **Step 2: Create main.js**

```javascript
import { world, system } from "@minecraft/server";

world.afterEvents.worldInitialize.subscribe((event) => {
    // Initialize dynamic properties for claims and limits
    const def = new DynamicPropertiesDefinition();
    def.defineString("claims", 10000); // Store serialized JSON of claims
    event.propertyRegistry.registerWorldDynamicProperties(def);
});

console.warn("[BlockClaim] Pack loaded.");
```

- [ ] **Step 3: Commit**

```bash
git add development_behavior_packs/BlockClaim/manifest.json development_behavior_packs/BlockClaim/scripts/main.js
git commit -m "feat: setup BlockClaim behavior pack"
```

### Task 2: Claim Limits & Progression

**Files:**
- Modify: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Consumes: `@minecraft/server` event listeners.
- Produces: Tracking and rewarding `availableClaimBlocks` to players.

- [ ] **Step 1: Implement limits reading/writing**

```javascript
function getPlayerLimit(player) {
    const limit = player.getDynamicProperty("availableClaimBlocks");
    return limit === undefined ? 100 : limit;
}

function addPlayerLimit(player, amount) {
    const current = getPlayerLimit(player);
    player.setDynamicProperty("availableClaimBlocks", current + amount);
    player.onScreenDisplay.setActionBar(`+${amount} Claim Blocks! (Total: ${current + amount})`);
}
```

- [ ] **Step 2: Implement earning through Farming/Mining**

```javascript
world.afterEvents.playerBreakBlock.subscribe((ev) => {
    const block = ev.brokenBlockPermutation;
    const typeId = block.type.id;
    const player = ev.player;

    const rewardBlocks = [
        "minecraft:melon_block",
        "minecraft:pumpkin",
        "minecraft:iron_ore",
        "minecraft:deepslate_iron_ore",
        "minecraft:copper_ore",
        "minecraft:deepslate_copper_ore",
        "minecraft:gold_ore",
        "minecraft:deepslate_gold_ore",
        "minecraft:diamond_ore",
        "minecraft:deepslate_diamond_ore",
        "minecraft:coal_ore",
        "minecraft:deepslate_coal_ore"
    ];

    if (rewardBlocks.includes(typeId) || typeId.includes("_log") || typeId.includes("_wood")) {
        // Simple chance to prevent farming easily, or just give 1
        if (Math.random() < 0.2) addPlayerLimit(player, 1);
    }
});
```

- [ ] **Step 3: Implement earning through Hunting**

```javascript
world.afterEvents.entityDie.subscribe((ev) => {
    const entity = ev.deadEntity;
    const killer = ev.damageSource.damagingEntity;

    if (killer && killer.typeId === "minecraft:player") {
        const cookableMeatAnimals = [
            "minecraft:chicken",
            "minecraft:cow",
            "minecraft:sheep",
            "minecraft:pig",
            "minecraft:rabbit",
            "minecraft:salmon",
            "minecraft:cod"
        ];
        if (cookableMeatAnimals.includes(entity.typeId)) {
            if (Math.random() < 0.2) addPlayerLimit(killer, 1);
        }
    }
});
```

- [ ] **Step 4: Commit**

```bash
git add development_behavior_packs/BlockClaim/scripts/main.js
git commit -m "feat: implement claim block earning progression"
```

### Task 3: Golden Shovel Interaction

**Files:**
- Modify: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Consumes: limits API
- Produces: Creates claim data in world properties.

- [ ] **Step 1: Setup interaction state tracking**

```javascript
const playerSelection = new Map();

function getClaims() {
    const raw = world.getDynamicProperty("claims");
    return raw ? JSON.parse(raw) : [];
}

function saveClaims(claimsArray) {
    world.setDynamicProperty("claims", JSON.stringify(claimsArray));
}
```

- [ ] **Step 2: Intercept Golden Shovel interaction**

```javascript
world.afterEvents.itemUseOn.subscribe((ev) => {
    const player = ev.source;
    if (ev.itemStack.typeId !== "minecraft:golden_shovel") return;
    
    // Inspect claim if sneaking
    if (player.isSneaking) {
        const claims = getClaims();
        const pos = ev.block.location;
        const claim = claims.find(c => pos.x >= c.minX && pos.x <= c.maxX && pos.z >= c.minZ && pos.z <= c.maxZ && c.dimension === player.dimension.id);
        
        if (claim) {
            player.sendMessage(`§aThis area is claimed by ${claim.ownerName}.`);
        } else {
            player.sendMessage(`§eThis area is unclaimed.`);
        }
        return;
    }

    // Set corners
    const pos = ev.block.location;
    let state = playerSelection.get(player.id) || { cornerA: null };

    if (!state.cornerA) {
        state.cornerA = pos;
        playerSelection.set(player.id, state);
        player.sendMessage(`§bCorner 1 set at ${pos.x}, ${pos.y}, ${pos.z}. Use shovel on another block for Corner 2.`);
    } else {
        const cornerB = pos;
        const cornerA = state.cornerA;
        playerSelection.delete(player.id);
        
        const minX = Math.min(cornerA.x, cornerB.x);
        const minZ = Math.min(cornerA.z, cornerB.z);
        const maxX = Math.max(cornerA.x, cornerB.x);
        const maxZ = Math.max(cornerA.z, cornerB.z);
        
        const width = (maxX - minX) + 1;
        const depth = (maxZ - minZ) + 1;
        const area = width * depth;
        
        const limit = getPlayerLimit(player);
        if (area > limit) {
            player.sendMessage(`§cClaim too large! Need ${area} blocks, but you only have ${limit}.`);
            return;
        }

        // Check overlaps
        const claims = getClaims();
        const overlap = claims.some(c => c.dimension === player.dimension.id && 
            minX <= c.maxX && maxX >= c.minX && minZ <= c.maxZ && maxZ >= c.minZ);
            
        if (overlap) {
            player.sendMessage(`§cYour claim overlaps with an existing claim!`);
            return;
        }

        // Deduct limit and save
        player.setDynamicProperty("availableClaimBlocks", limit - area);
        claims.push({
            id: Date.now().toString(),
            ownerId: player.id,
            ownerName: player.name,
            minX, minZ, maxX, maxZ,
            dimension: player.dimension.id
        });
        saveClaims(claims);
        player.sendMessage(`§aSuccessfully claimed ${area} blocks!`);
    }
});
```

- [ ] **Step 3: Commit**

```bash
git add development_behavior_packs/BlockClaim/scripts/main.js
git commit -m "feat: golden shovel claim creation and inspection"
```

### Task 4: Protection Logic

**Files:**
- Modify: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Consumes: Claim data.

- [ ] **Step 1: Intercept block breaking, placing, and interacting**

```javascript
function canEdit(player, pos) {
    const claims = getClaims();
    const claim = claims.find(c => pos.x >= c.minX && pos.x <= c.maxX && pos.z >= c.minZ && pos.z <= c.maxZ && c.dimension === player.dimension.id);
    
    if (!claim) return true; // Unclaimed
    if (claim.ownerId === player.id) return true; // Owner
    return false; // Not owner
}

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    if (!canEdit(ev.player, ev.block.location)) {
        ev.cancel = true;
        system.run(() => {
             ev.player.onScreenDisplay.setActionBar(`§cYou don't have permission to build here.`);
        });
    }
});

world.beforeEvents.playerPlaceBlock.subscribe((ev) => {
    if (!canEdit(ev.player, ev.block.location)) {
        ev.cancel = true;
        system.run(() => {
             ev.player.onScreenDisplay.setActionBar(`§cYou don't have permission to build here.`);
        });
    }
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (!canEdit(ev.player, ev.block.location)) {
        ev.cancel = true;
        system.run(() => {
             ev.player.onScreenDisplay.setActionBar(`§cYou don't have permission to interact here.`);
        });
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add development_behavior_packs/BlockClaim/scripts/main.js
git commit -m "feat: enforce block protection inside claims"
```
