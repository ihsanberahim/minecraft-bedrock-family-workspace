import { system, world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

function getHomes(player) {
    try {
        const homesStr = player.getDynamicProperty("homes_data");
        if (homesStr) {
            return JSON.parse(homesStr);
        }
    } catch (e) {
        console.warn("Failed to parse homes for player: " + player.name, e);
    }
    return {};
}

function saveHomes(player, homes) {
    try {
        player.setDynamicProperty("homes_data", JSON.stringify(homes));
    } catch (e) {
        console.error("Failed to save homes for player: " + player.name, e);
    }
}

function showMainMenu(player) {
    const form = new ActionFormData()
        .title("Simple Homes Menu")
        .body("Select an action:")
        .button("🏠 Teleport to Home")
        .button("📍 Set New Home")
        .button("❌ Delete a Home");

    form.show(player).then((response) => {
        if (response.canceled) return;
        
        const selection = response.selection;
        if (selection === 0) {
            showTeleportMenu(player);
        } else if (selection === 1) {
            showSetHomeMenu(player);
        } else if (selection === 2) {
            showDeleteMenu(player);
        }
    }).catch((err) => {
        console.error("Error showing main menu: ", err);
    });
}

function showTeleportMenu(player) {
    const homes = getHomes(player);
    const homeNames = Object.keys(homes);

    if (homeNames.length === 0) {
        player.sendMessage("§eYou don't have any saved homes yet. Use the compass to set one!");
        return;
    }

    const form = new ActionFormData()
        .title("Teleport to Home")
        .body("Choose a home to teleport to:");

    for (const name of homeNames) {
        const h = homes[name];
        const dimFriendly = h.dimension.replace('minecraft:', '');
        form.button(`🏠 ${name}\n(${dimFriendly})`);
    }

    form.show(player).then((response) => {
        if (response.canceled) return;

        const homeName = homeNames[response.selection];
        const targetHome = homes[homeName];

        if (targetHome) {
            player.teleport(
                { x: targetHome.x, y: targetHome.y, z: targetHome.z },
                { dimension: world.getDimension(targetHome.dimension) }
            );
            player.sendMessage(`§aTeleported to home "§e${homeName}§a"!`);
        }
    }).catch((err) => {
        console.error("Error showing teleport menu: ", err);
    });
}

function showSetHomeMenu(player) {
    const form = new ModalFormData()
        .title("Set New Home")
        .textField("Enter a name for this home location:", "e.g., base, cave, castle", "home");

    form.show(player).then((response) => {
        if (response.canceled) return;

        const homeName = response.formValues[0].trim() || 'home';
        const location = player.location;
        const dimension = player.dimension.id;
        const homes = getHomes(player);

        homes[homeName] = {
            x: Math.round(location.x * 100) / 100,
            y: Math.round(location.y * 100) / 100,
            z: Math.round(location.z * 100) / 100,
            dimension: dimension
        };

        saveHomes(player, homes);
        player.sendMessage(`§aSuccess: Home "§e${homeName}§a" has been set at current position!`);
    }).catch((err) => {
        console.error("Error showing set home menu: ", err);
    });
}

// Function to show delete menu
function showDeleteMenu(player) {
    const homes = getHomes(player);
    const homeNames = Object.keys(homes);

    if (homeNames.length === 0) {
        player.sendMessage("§eYou don't have any saved homes yet.");
        return;
    }

    const form = new ActionFormData()
        .title("Delete a Home")
        .body("Select a home to delete:");

    for (const name of homeNames) {
        form.button(`❌ ${name}`);
    }

    form.show(player).then((response) => {
        if (response.canceled) return;

        const homeName = homeNames[response.selection];
        delete homes[homeName];
        saveHomes(player, homes);
        player.sendMessage(`§aSuccess: Home "§e${homeName}§a" has been deleted!`);
    }).catch((err) => {
        console.error("Error showing delete menu: ", err);
    });
}

// Listen for itemUse events to trigger the UI menu
world.afterEvents.itemUse.subscribe((eventData) => {
    const { source: player, itemStack } = eventData;

    if (itemStack && itemStack.typeId === "minecraft:compass") {
        system.run(() => {
            showMainMenu(player);
        });
    }
});
