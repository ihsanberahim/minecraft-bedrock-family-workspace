# Golden Shovel Selection Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset a player's pending claim corner selection when they switch their held item away from the Golden Shovel or empty their hand.

**Architecture:** Subscribe to the `playerEquipmentSlotChange` after-event, filter for `Mainhand` updates, and check if a pending selection exists. If the new item is not the Golden Shovel, clear the selection.

**Tech Stack:** Minecraft Bedrock Scripting API (`@minecraft/server` v1.14.0)

## Global Constraints
- Target File: `development_behavior_packs/BlockClaim/scripts/main.js`
- API Version: `@minecraft/server` v1.14.0 (stable)

---

### Task 1: Equipment Slot Change Listener

**Files:**
- Modify: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Consumes: `playerSelection` Map from `main.js`.
- Produces: Clears entries from `playerSelection` when switching items.

- [ ] **Step 1: Implement playerEquipmentSlotChange listener**

Add this code to the bottom of `development_behavior_packs/BlockClaim/scripts/main.js`:

```javascript
world.afterEvents.playerEquipmentSlotChange.subscribe((ev) => {
    // Only monitor changes to the main hand slot
    if (ev.equipmentSlot !== "Mainhand") return;

    const player = ev.player;
    // If the player has a pending selection, check their new held item
    if (playerSelection.has(player.id)) {
        const newItem = ev.newItem;
        if (!newItem || newItem.typeId !== "minecraft:golden_shovel") {
            playerSelection.delete(player.id);
            player.sendMessage("§cClaim selection cancelled (shovel unequipped).");
        }
    }
});
```

- [ ] **Step 2: Commit implementation**

```bash
git add development_behavior_packs/BlockClaim/scripts/main.js
git commit -m "feat: reset claim selection when unequipping golden shovel"
```
