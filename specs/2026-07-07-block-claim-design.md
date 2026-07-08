# Golden Shovel Block Claim System Design

## Overview
A Minecraft Bedrock behavior pack that allows players to claim land using a Golden Shovel, protecting their builds and chests from being broken or interacted with by other players. Claims are restricted by a configurable block limit per player.

## Architecture & Components

### 1. Interaction System (Golden Shovel)
- **Tool:** Golden Shovel (`minecraft:golden_shovel`).
- **Claim Creation:**
  - **Action:** Right-click (interact) with a block.
  - **State Machine:** 
    - 1st click sets `Corner A`.
    - 2nd click sets `Corner B` and attempts to finalize the claim.
  - **Validation:** 
    - The new claim cannot overlap with any existing claims.
    - The area (width * depth) must not exceed the player's available claim block limit.
  - **Feedback:** Success/Error messages shown via action bar, accompanied by particle outlines (e.g., `minecraft:villager_happy` or similar) marking the claim boundaries briefly.
- **Claim Inspection:**
  - **Action:** Sneak + Right-click a block with the Golden Shovel.
  - **Feedback:** Displays the owner of the claim at that location, or states that it is unclaimed.
- **State Reset:** If a player sets Corner A but switches away from the Golden Shovel or waits too long, the selection state is cleared.

### 2. Protection Logic (Event Interception)
- **Events Subscribed:**
  - `PlayerBreakBlockBeforeEvent`
  - `PlayerPlaceBlockBeforeEvent`
  - `PlayerInteractWithBlockBeforeEvent`
- **Logic:** 
  - For each event, determine the block position.
  - Query the claims database for a claim encompassing that position.
  - If a claim exists and the interacting player is NOT the owner, set `event.cancel = true`.
  - Send an action bar message: "This area is claimed by [OwnerName]."

### 3. Data Storage, Limits & Progression
- **Storage Medium:** World Dynamic Properties (`world.setDynamicProperty`). 
- **Data Structure:**
  - A JSON array/dictionary of claim objects: `{ id, ownerId, ownerName, minX, minZ, maxX, maxZ, dimension }`.
- **Player Limits:**
  - Each player has a dynamic property tracking `availableClaimBlocks` (default 100).
  - When a claim is made, the 2D area (X * Z) is deducted from `availableClaimBlocks`.
- **Earning Claim Blocks:**
  - Players can naturally increase their `availableClaimBlocks` limit by performing specific gameplay actions. A small amount of claim blocks (e.g., +1 to +5) is awarded for:
    - **Farming:** Planting seeds, breaking fully-grown watermelons or pumpkins.
    - **Mining/Logging:** Breaking any wood block, or coal, iron, copper, gold, and diamond ores.
    - **Hunting:** Killing any animal that drops cookable meat (e.g., chickens, cows, sheep, pigs, rabbits, salmon, cod).
  - The system will listen to `PlayerPlaceBlockAfterEvent`, `PlayerBreakBlockAfterEvent`, and `EntityDieAfterEvent` to track these actions and reward the player dynamically with an action bar notification.

## Error Handling & Edge Cases
- **Overlapping Claims:** Before finalizing, the system will do an AABB intersection check against all existing claims in the dimension.
- **Large Claims:** To prevent massive lag, there should be a maximum area a player can claim at once.
- **Y-Axis Handling:** Claims protect from the bottom of the world to the top of the world (Y is ignored in intersection logic).

## Testing Plan
- Test claim creation with valid/invalid sizes.
- Test that breaking, placing, and interacting (opening chests) is blocked for non-owners but allowed for owners.
- Test that the block limits decrement correctly and prevent claiming when exhausted.
