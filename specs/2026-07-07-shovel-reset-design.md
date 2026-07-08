# Golden Shovel Selection Reset Design

This document details the design for resetting a player's pending claim selection (Corner 1) when they switch their held item away from the Golden Shovel.

## Requirement
When a player has selected Corner 1 using a Golden Shovel, they must complete the claim by selecting Corner 2 using the same shovel. If they switch to any other item in their hotbar, or clear their main hand (empty hand), the pending Corner 1 selection must be wiped, requiring them to start the selection process again.

## Design

### Event Subscriptions
We will hook into the `PlayerEquipmentSlotChangeAfterEvent`:
- **Event**: `world.afterEvents.playerEquipmentSlotChange`
- **Condition**: 
  - The slot being modified is `EquipmentSlot.Mainhand`.
  - The player has an active selection tracked in the `playerSelection` map.
  - The new item stack is either `undefined` (empty hand) or its `typeId` is not `minecraft:golden_shovel`.

### Logic Flow

```javascript
world.afterEvents.playerEquipmentSlotChange.subscribe((ev) => {
    // Only monitor main hand changes
    if (ev.equipmentSlot !== "Mainhand") return;

    const player = ev.player;
    // Check if this player has a pending selection
    if (playerSelection.has(player.id)) {
        const newItem = ev.newItem;
        if (!newItem || newItem.typeId !== "minecraft:golden_shovel") {
            playerSelection.delete(player.id);
            player.sendMessage("§cClaim selection cancelled (shovel unequipped).");
        }
    }
});
```

## Verification Plan
1. Right-click a block with the Golden Shovel. Verify Corner 1 is set.
2. Scroll to a different slot in the hotbar (e.g. empty hand or sword).
3. Verify chat message says "Claim selection cancelled (shovel unequipped)".
4. Attempt to right-click another block. It should set Corner 1 again instead of completing the claim.
