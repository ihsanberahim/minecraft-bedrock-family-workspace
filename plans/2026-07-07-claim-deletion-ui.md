# Claim Deletion UI Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirm pop-up menu allowing players to abandon (delete) their claims and receive a refund of their claim blocks by sneaking and right-clicking inside their claim with a Golden Shovel.

**Architecture:** Update `manifest.json` with a dependency on `@minecraft/server-ui`. Import `MessageFormData` in `main.js` and modify the shovel interaction sneak branch to instantiate and show a confirmation dialog. Upon confirmation, filter out the claim, update the persistent claims array, and refund blocks to the player's balance.

**Tech Stack:** Minecraft Bedrock Scripting API (`@minecraft/server` v1.14.0, `@minecraft/server-ui` v1.3.0)

## Global Constraints
- Target Files: 
  - `development_behavior_packs/BlockClaim/manifest.json`
  - `development_behavior_packs/BlockClaim/scripts/main.js`
- API Versions:
  - `@minecraft/server` v1.14.0 (stable)
  - `@minecraft/server-ui` v1.3.0 (stable)

---

### Task 1: Add manifest dependency & UI confirmation popup

**Files:**
- Modify: `development_behavior_packs/BlockClaim/manifest.json`
- Modify: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Consumes: `@minecraft/server-ui` library, `player.isSneaking`, `getClaims`, `saveClaims`, `addPlayerLimit`.
- Produces: Triggers a delete confirmation UI popup and manages deletion state when a player inspects their own claim.

- [ ] **Step 1: Update manifest.json**

Modify `development_behavior_packs/BlockClaim/manifest.json` to add the `@minecraft/server-ui` dependency under the `dependencies` array:

```json
    {
      "module_name": "@minecraft/server-ui",
      "version": "1.3.0"
    }
```

- [ ] **Step 2: Update main.js imports and sneak block interaction logic**

Modify `development_behavior_packs/BlockClaim/scripts/main.js` to:
1. Import `MessageFormData` from `@minecraft/server-ui` at the top.
2. In the `world.afterEvents.itemUse` listener, rewrite the sneak block (`if (player.isSneaking) { ... }`) to build and show the `MessageFormData` pop-up if the claim belongs to the interacting player.

```javascript
// Top of main.js:
import { world, system, ItemStack } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
```

```javascript
// Inside itemUse handler, replace the isSneaking block:
    // Inspect claim if sneaking
    if (player.isSneaking) {
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
        return;
    }
```

- [ ] **Step 3: Commit implementation**

```bash
git --work-tree=e:\minecraft-bedrock-server-local add development_behavior_packs/BlockClaim/manifest.json development_behavior_packs/BlockClaim/scripts/main.js
git --work-tree=e:\minecraft-bedrock-server-local commit -m "feat: add abandon claim confirmation UI popup"
```
