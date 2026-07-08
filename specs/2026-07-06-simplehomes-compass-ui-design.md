# Spec: Simple Homes Compass UI Design

Introduce a GUI-based home management system for Minecraft Bedrock Edition using standard Compasses to completely bypass the need for cheat permissions.

## Overview
Players can right-click/use a standard `minecraft:compass` to open an interactive pop-up menu. This menu allows players to set, delete, list, and teleport to unlimited homes.

## User Experience
- Right-clicking (using) a Compass opens the **Simple Homes Menu**.
- **Simple Homes Menu** options:
  - **🏠 Teleport to Home**: Shows a list of all player-saved homes. Selecting one teleports the player there.
  - **📍 Set New Home**: Prompts the player with an input field to name the home (defaults to `home`). Clicking submit saves the home.
  - **❌ Delete a Home**: Shows a list of player-saved homes. Selecting one deletes it.

## Architecture & Components
1. **Event Listener**: Subscribes to `world.afterEvents.itemUse`.
2. **Item Check**: If the item used is `minecraft:compass`, trigger the menu flow.
3. **UI Forms**: Uses `@minecraft/server-ui` library classes (`ActionFormData`, `ModalFormData`).
4. **State Persistence**: Uses `player.getDynamicProperty("homes_data")` and `player.setDynamicProperty("homes_data", ...)` to serialize and save home coordinates and dimensions.
5. **Teleportation**: Uses `player.teleport()` with dimension reference from `world.getDimension()`.

## API Requirements
- `@minecraft/server` v1.15.0 (for player dynamic properties and teleportation)
- `@minecraft/server-ui` v1.3.0 (for forms)
- No cheats are required for players because using an item and opening a UI form is a standard survival feature.
- No Beta APIs are required because `itemUse` is a stable API event.
