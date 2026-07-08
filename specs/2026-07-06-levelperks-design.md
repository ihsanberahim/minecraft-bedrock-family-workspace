# LevelPerks — Design Spec

**Date:** 2026-07-06  
**Author:** Brainstorming session  
**Status:** Approved

---

## Overview

`LevelPerks` is a standalone Minecraft Bedrock behavior pack that grants players permanent passive stat boosts based on their XP level. The system rewards progression by unlocking stronger defensive perks (Resistance and Regeneration) at every 10-level milestone, up to level 50.

---

## Goals

- Reward XP level progression with tangible gameplay advantages.
- Keep implementation lightweight and serverside-only (no client resource pack needed).
- Notify players with a single chat message when they unlock a new tier.
- Be fully self-contained in its own behavior pack.

---

## Non-Goals

- No command-based perk viewer (`/stats`, `/levelperks`, etc.).
- No item-based UI trigger.
- No enchantment or equipment manipulation.
- No integration with existing packs (SimpleHomes, SafeStorage, SolatAlerts).

---

## Perk Progression Table

| Tier | Level Threshold | Resistance (Protection) | Regeneration |
|------|----------------|-------------------------|--------------|
| 0    | < 10           | None                    | None         |
| 1    | >= 10          | Resistance I (~20% DR)  | None         |
| 2    | >= 20          | Resistance I (~20% DR)  | Regeneration I (1 HP / 2.5s) |
| 3    | >= 30          | Resistance II (~40% DR) | Regeneration I (1 HP / 2.5s) |
| 4    | >= 40          | Resistance II (~40% DR) | Regeneration II (1 HP / 1.2s) |
| 5    | >= 50          | Resistance III (~60% DR)| Regeneration II (1 HP / 1.2s) |

> **Effect amplifier mapping:** Minecraft `addEffect` uses 0-indexed amplifiers.
> Resistance I = amplifier 0, Resistance II = amplifier 1, Resistance III = amplifier 2.
> Regeneration I = amplifier 0, Regeneration II = amplifier 1.

---

## Architecture

### Behavior Pack Structure

```
behavior_packs/LevelPerks/
+-- manifest.json
+-- pack_icon.png
+-- scripts/
    +-- index.js
```

### manifest.json

- Format version: 2
- Scripting module entry: scripts/index.js
- Dependencies: @minecraft/server version 1.15.0
- min_engine_version: [1, 21, 20]
- Capability: script_eval

### scripts/index.js - Core Logic

**Effect Application Loop:**

- system.runInterval(callback, 100) fires every 100 ticks (5 seconds).
- Iterates over world.getPlayers().
- For each player, reads player.level to determine tier index (0-5).
- Applies matching effects using player.addEffect(effectType, durationTicks, { amplifier }).
  - Effect duration set to 300 ticks (15 seconds) to ensure no gap.
  - showParticles: false for silent effect.

**Tier Change Detection and Notification:**

- Each player has a stored dynamic property: "levelperks_tier" (integer, default 0).
- After computing the new tier, compare with stored value.
- If new tier > stored tier:
  - Send chat message to player.
  - Update "levelperks_tier" to the new tier index.
- If tier decreases (XP loss), silently update stored tier. Effects downgrade on next tick.

---

## Notification Format

When a player crosses into a new tier, they receive a chat message:

Tier 1 (level 10):
  [Perk] You reached Level 10! You now have: Protection I (Resistance I)

Tier 2 (level 20):
  [Perk] You reached Level 20! You now have: Protection I (Resistance I), Regeneration I

---

## Data Persistence

| Dynamic Property Key | Owner  | Type    | Purpose                         |
|----------------------|--------|---------|---------------------------------|
| levelperks_tier      | Player | Integer | Tracks last notified tier (0-5) |

No world-level dynamic properties needed.

---

## Error Handling

- Wrap the interval callback in a try/catch to prevent a single player error from breaking the loop.
- If player.addEffect throws, log via console.warn and continue.

---

## Pack Activation

This pack must be added to the active world world_behavior_packs.json list. No resource pack is required.

---

## Verification Plan

1. Create the pack and activate it on the server.
2. Give test player XP to reach level 10 (/xp 10L @s) and confirm:
   - Chat notification fires once.
   - Resistance I effect appears in the player effects list.
3. Give more XP to reach level 20 and confirm:
   - Second notification fires.
   - Resistance I + Regeneration I both appear.
4. Continue through all 5 tiers.
5. Kill the player (lose XP below threshold) and confirm effects downgrade on next tick with no erroneous notifications.
6. Restart the server and confirm dynamic property persists and no duplicate notifications fire on rejoin.
