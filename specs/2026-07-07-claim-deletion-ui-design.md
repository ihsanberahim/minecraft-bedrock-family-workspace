# Claim Deletion UI Popup Design

This document details the design for allowing players to abandon (delete) their claims using a confirm pop-up menu by sneaking and right-clicking a block in their claimed area with a Golden Shovel.

## Requirement
- Sneak + right-click with Golden Shovel inside a claim owned by the player -> Display a confirm UI popup.
- UI popup title: "Abandon Claim"
- UI popup body: "Are you sure you want to abandon this claim?\nThis will refund <area> blocks to your limit."
- Button 1: "Cancel"
- Button 2: "Delete"
- If the player clicks "Delete", delete the claim, refund the claim blocks, and send a message.
- If they click "Cancel" or close the UI, do nothing.
- Sneak + right-click in someone else's claim -> message stating who owns it.
- Sneak + right-click on unclaimed land -> message stating it is unclaimed.

## Design

### Dependencies
Update `manifest.json` to include `@minecraft/server-ui`.

```json
{
  "module_name": "@minecraft/server-ui",
  "version": "1.3.0"
}
```

### Script Implementation
We will import `MessageFormData` from `@minecraft/server-ui` in `main.js` and modify the sneak section of the Golden Shovel interaction handler:

```javascript
import { MessageFormData } from "@minecraft/server-ui";

// Inside itemUse handler, if player.isSneaking is true:
const claims = getClaims();
const pos = targetBlock.location;
const claim = claims.find(c => pos.x >= c.minX && pos.x <= c.maxX && pos.z >= c.minZ && pos.z <= c.maxZ && c.dimension === player.dimension.id);

if (claim) {
    if (claim.ownerId === player.id) {
        const width = (claim.maxX - claim.minX) + 1;
        const depth = (claim.maxZ - claim.minZ) + 1;
        const area = width * depth;

        const confirmUi = new MessageFormData()
            .title("Abandon Claim")
            .body(`Are you sure you want to abandon this claim?\nThis will refund ${area} blocks to your limit.`)
            .button1("Cancel")
            .button2("Delete");

        confirmUi.show(player).then(result => {
            if (result.selection === 1) {
                // Remove the claim
                const updatedClaims = claims.filter(c => c.id !== claim.id);
                saveClaims(updatedClaims);
                addPlayerLimit(player, area);
                player.sendMessage(`§aClaim abandoned! ${area} blocks refunded.`);
            }
        });
    } else {
        player.sendMessage(`§aThis area is claimed by ${claim.ownerName}.`);
    }
} else {
    player.sendMessage(`§eThis area is unclaimed.`);
}
```

## Verification Plan
1. Stand inside your own claim and sneak + right-click with the Golden Shovel.
2. Verify the "Abandon Claim" popup appears.
3. Click "Cancel" and verify the claim is NOT deleted and your blocks are not refunded.
4. Sneak + right-click again and click "Delete". Verify the claim is deleted, blocks are refunded, and you receive the confirmation message.
5. Attempt to interact inside the deleted area. Verify it is now unclaimed and editable.
