# LevelPerks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `LevelPerks` behavior pack that grants players permanent Resistance and Regeneration passive effects based on their XP level (every 10 levels up to 50).

**Architecture:** A single `scripts/index.js` runs a `system.runInterval` loop every 100 ticks (5s). Each tick it reads each player's `player.level`, looks up the matching perk tier (0-5), applies the correct potion effects silently, and fires a one-time chat notification when a player crosses into a new tier (tracked via `player.getDynamicProperty("levelperks_tier")`).

**Tech Stack:** Minecraft Bedrock Scripting API (`@minecraft/server` v1.15.0), JavaScript (ES module), no resource pack.

## Global Constraints

- `@minecraft/server` version: exactly `1.15.0`
- `min_engine_version`: `[1, 21, 20]`
- `format_version`: `2`
- `script_eval` capability required in manifest
- Effect durations set to 300 ticks (15s) — longer than the 100-tick refresh interval
- `showParticles: false` on all effects
- Dynamic property key: `"levelperks_tier"` (integer, 0–5)
- Pack directory: `behavior_packs/LevelPerks/`
- No resource pack needed; server-side only

---

### Task 1: Scaffold the Behavior Pack

**Files:**
- Create: `behavior_packs/LevelPerks/manifest.json`
- Create: `behavior_packs/LevelPerks/scripts/index.js` (empty stub)

**Interfaces:**
- Produces: A valid loadable pack that registers with the server with no errors.

- [ ] **Step 1: Create manifest.json**

Create `behavior_packs/LevelPerks/manifest.json` with the following exact content:

```json
{
    "format_version": 2,
    "header": {
        "name": "Level Perks",
        "description": "Grants passive stat boosts (Resistance, Regeneration) based on player XP level.",
        "uuid": "c3f1a2b4-7e8d-4a5f-9c0e-2b3d4e5f6a7b",
        "version": [1, 0, 0],
        "min_engine_version": [1, 21, 20]
    },
    "modules": [
        {
            "type": "script",
            "language": "javascript",
            "uuid": "d4e2b3c5-8f9a-4b6d-0e1f-3c4d5e6f7b8c",
            "entry": "scripts/index.js",
            "version": [1, 0, 0]
        }
    ],
    "capabilities": ["script_eval"],
    "dependencies": [
        {
            "module_name": "@minecraft/server",
            "version": "1.15.0"
        }
    ]
}
```

> Note: The two UUIDs above are placeholders — run `uuidgen` or generate two fresh UUIDs if your server requires unique values. Any valid UUID v4 that is not already used by another pack will work.

- [ ] **Step 2: Create empty script stub**

Create `behavior_packs/LevelPerks/scripts/index.js` with:

```js
import { system, world } from '@minecraft/server';
// LevelPerks — stub
```

- [ ] **Step 3: Register the pack in the world**

Open `worlds/<your-world-name>/world_behavior_packs.json` and add an entry for `LevelPerks`:

```json
{
    "pack_id": "<uuid from manifest header>",
    "version": [1, 0, 0]
}
```

Replace `<uuid from manifest header>` with the exact `uuid` value from `manifest.json` header block.

- [ ] **Step 4: Start the server and confirm the pack loads**

Start the server. In the server console, look for a line that includes `Level Perks` — it should appear in the pack load log without errors. Expected output example:
```
[Scripting] Loaded script: LevelPerks/scripts/index.js
```
No `[Scripting] Error` lines should appear.

- [ ] **Step 5: Commit**

```
git add behavior_packs/LevelPerks/
git commit -m "feat(levelperks): scaffold behavior pack and manifest"
```

---

### Task 2: Implement the Perk Tier Table and Effect Loop

**Files:**
- Modify: `behavior_packs/LevelPerks/scripts/index.js`

**Interfaces:**
- Consumes: `system`, `world` from `@minecraft/server`
- Produces: `getTier(level)` — returns an integer 0–5 given a player level  
  `TIER_CONFIG` — array of 6 objects, each with `threshold`, `resistance` (null | `{amplifier}`) and `regen` (null | `{amplifier}`)  
  `applyTierEffects(player, tierIndex)` — applies the correct effects to a player

- [ ] **Step 1: Write the tier config table and getTier function**

Replace `behavior_packs/LevelPerks/scripts/index.js` with:

```js
import { system, world } from '@minecraft/server';

/**
 * Each entry describes what effects to apply at that tier.
 * null means the effect is not active at this tier.
 * amplifier is 0-indexed (0 = level I, 1 = level II, 2 = level III).
 */
const TIER_CONFIG = [
    // Tier 0: < level 10 — no perks
    { threshold: 0,  resistance: null,            regen: null },
    // Tier 1: >= level 10
    { threshold: 10, resistance: { amplifier: 0 }, regen: null },
    // Tier 2: >= level 20
    { threshold: 20, resistance: { amplifier: 0 }, regen: { amplifier: 0 } },
    // Tier 3: >= level 30
    { threshold: 30, resistance: { amplifier: 1 }, regen: { amplifier: 0 } },
    // Tier 4: >= level 40
    { threshold: 40, resistance: { amplifier: 1 }, regen: { amplifier: 1 } },
    // Tier 5: >= level 50
    { threshold: 50, resistance: { amplifier: 2 }, regen: { amplifier: 1 } },
];

/**
 * Returns the tier index (0-5) that applies for the given XP level.
 * Scans from highest to lowest threshold.
 * @param {number} level
 * @returns {number}
 */
function getTier(level) {
    for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
        if (level >= TIER_CONFIG[i].threshold) return i;
    }
    return 0;
}

/**
 * Applies the passive effects for the given tier to the player.
 * Effects are applied with a 300-tick duration (15s) and no particles.
 * @param {import('@minecraft/server').Player} player
 * @param {number} tierIndex
 */
function applyTierEffects(player, tierIndex) {
    const tier = TIER_CONFIG[tierIndex];
    const effectOptions = { showParticles: false };

    if (tier.resistance) {
        player.addEffect('resistance', 300, { amplifier: tier.resistance.amplifier, ...effectOptions });
    }
    if (tier.regen) {
        player.addEffect('regeneration', 300, { amplifier: tier.regen.amplifier, ...effectOptions });
    }
}

// Main loop — runs every 100 ticks (5 seconds)
system.runInterval(() => {
    try {
        for (const player of world.getPlayers()) {
            const tier = getTier(player.level);
            applyTierEffects(player, tier);
        }
    } catch (e) {
        console.warn('[LevelPerks] Error in effect loop:', e);
    }
}, 100);
```

- [ ] **Step 2: Start the server and join as a player**

Start the server. Join with a player that has level 0. Open the Effects screen (inventory). Confirm no effects are applied.

- [ ] **Step 3: Test tier 1 — grant level 10**

In the server console run:
```
xp 10L <yourname>
```
Wait up to 5 seconds (one tick cycle). Open the Effects screen.  
Expected: **Resistance I** appears. No Regeneration effect.

- [ ] **Step 4: Test tier 2 — grant level 20**

```
xp 10L <yourname>
```
Wait up to 5 seconds. Open the Effects screen.  
Expected: **Resistance I** + **Regeneration I** both appear.

- [ ] **Step 5: Test tier 3 — grant level 30**

```
xp 10L <yourname>
```
Wait up to 5 seconds. Open the Effects screen.  
Expected: **Resistance II** + **Regeneration I** appear.

- [ ] **Step 6: Test tier 4 and 5**

Repeat with `xp 10L <yourname>` twice more. Verify:
- Tier 4 (level 40): Resistance II + Regeneration II
- Tier 5 (level 50): Resistance III + Regeneration II

- [ ] **Step 7: Commit**

```
git add behavior_packs/LevelPerks/scripts/index.js
git commit -m "feat(levelperks): implement perk tier table and effect application loop"
```

---

### Task 3: Implement Tier Change Notifications

**Files:**
- Modify: `behavior_packs/LevelPerks/scripts/index.js`

**Interfaces:**
- Consumes: `getTier(level)` and `TIER_CONFIG` from Task 2  
- Consumes: `player.getDynamicProperty("levelperks_tier")` and `player.setDynamicProperty("levelperks_tier", tier)`
- Produces: One-time chat message when player crosses into a higher tier; silent update on tier decrease

**Perk label mapping** (for human-readable notifications):

| Tier | Resistance label | Regen label |
|------|-----------------|-------------|
| 0    | —               | —           |
| 1    | Protection I (Resistance I) | — |
| 2    | Protection I (Resistance I) | Regeneration I |
| 3    | Protection II (Resistance II) | Regeneration I |
| 4    | Protection II (Resistance II) | Regeneration II |
| 5    | Protection III (Resistance III) | Regeneration II |

- [ ] **Step 1: Add the TIER_LABELS array and notification logic**

Add the following to `behavior_packs/LevelPerks/scripts/index.js`, **after** the `TIER_CONFIG` array and **before** `getTier`:

```js
const TIER_LABELS = [
    null, // tier 0 — no notification
    { level: 10, perks: '§bProtection I §7(Resistance I)' },
    { level: 20, perks: '§bProtection I §7(Resistance I)§7, §bRegeneration I' },
    { level: 30, perks: '§bProtection II §7(Resistance II)§7, §bRegeneration I' },
    { level: 40, perks: '§bProtection II §7(Resistance II)§7, §bRegeneration II' },
    { level: 50, perks: '§bProtection III §7(Resistance III)§7, §bRegeneration II' },
];

/**
 * Checks if the player has moved to a new tier and notifies them if so.
 * Stores last notified tier in the "levelperks_tier" dynamic property.
 * @param {import('@minecraft/server').Player} player
 * @param {number} newTier
 */
function checkAndNotify(player, newTier) {
    const stored = player.getDynamicProperty('levelperks_tier') ?? 0;
    if (newTier === stored) return;

    // Update stored tier (handles both upgrades and downgrades silently)
    player.setDynamicProperty('levelperks_tier', newTier);

    // Only send chat notification when moving UP a tier
    if (newTier > stored && TIER_LABELS[newTier]) {
        const label = TIER_LABELS[newTier];
        player.sendMessage(
            `§a✦ Level Up Perk! §eYou reached Level ${label.level}!\n§7You now have: ${label.perks}`
        );
    }
}
```

- [ ] **Step 2: Update the main loop to call checkAndNotify**

Find the loop inside `system.runInterval` in `index.js`. Replace its body with:

```js
system.runInterval(() => {
    try {
        for (const player of world.getPlayers()) {
            const tier = getTier(player.level);
            applyTierEffects(player, tier);
            checkAndNotify(player, tier);
        }
    } catch (e) {
        console.warn('[LevelPerks] Error in effect loop:', e);
    }
}, 100);
```

- [ ] **Step 3: Test notification on tier 1**

Reset your test player to level 0:
```
xp -1000L <yourname>
```
(or use `/xp set 0` if your server supports it)

Grant level 10:
```
xp 10L <yourname>
```
Expected: Chat message appears:  
`✦ Level Up Perk! You reached Level 10!`  
`You now have: Protection I (Resistance I)`

- [ ] **Step 4: Verify notification fires only once**

Wait 30 seconds without changing XP. Confirm the notification does **not** repeat.

- [ ] **Step 5: Verify tier downgrade is silent**

Kill the player (or `/xp -1000L <yourname>`) to drop below level 10. Confirm:
- No notification appears in chat.
- Resistance I effect disappears within 5 seconds.

- [ ] **Step 6: Test notification on all 5 tiers**

Grant XP in steps (10L each time), verifying each notification message appears exactly once per tier.

- [ ] **Step 7: Restart the server and verify no duplicate on rejoin**

After reaching tier 3, stop and restart the server. Rejoin. Confirm:
- No tier notification fires.
- Resistance II + Regeneration I effects are still applied within 5 seconds.

- [ ] **Step 8: Commit**

```
git add behavior_packs/LevelPerks/scripts/index.js
git commit -m "feat(levelperks): add tier-change chat notifications"
```

---

### Task 4: Final Integration and Activation

**Files:**
- Verify: `behavior_packs/LevelPerks/manifest.json`
- Verify: `behavior_packs/LevelPerks/scripts/index.js`
- Verify: `worlds/<world-name>/world_behavior_packs.json`

- [ ] **Step 1: Full end-to-end test**

Start the server. Have a test player grind from level 0 to level 50 (grant with `/xp`). Verify the full perk progression table:

| Level | Expected Resistance | Expected Regen |
|-------|---------------------|----------------|
| 0–9   | None                | None           |
| 10    | Resistance I        | None           |
| 20    | Resistance I        | Regeneration I |
| 30    | Resistance II       | Regeneration I |
| 40    | Resistance II       | Regeneration II|
| 50    | Resistance III      | Regeneration II|

- [ ] **Step 2: Confirm pack does not interfere with SafeStorage or SimpleHomes**

With all three packs active, verify:
- Compass still opens the SimpleHomes menu.
- Locked chests still prompt for passwords.
- No console errors from `[LevelPerks]` during normal gameplay.

- [ ] **Step 3: Final commit**

```
git add behavior_packs/LevelPerks/
git commit -m "feat(levelperks): complete level-based passive perks system"
```
