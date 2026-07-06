import { system, world } from '@minecraft/server';

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

function handleCommand(player, commandStr) {
    try {
        const args = commandStr.trim().split(/\s+/);
        const cmd = args[0].toLowerCase();
        const homeName = args.slice(1).join(' ').trim() || 'home';

        if (cmd === 'sethome') {
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
        }
        else if (cmd === 'home') {
            const homes = getHomes(player);
            const targetHome = homes[homeName];

            if (!targetHome) {
                player.sendMessage(`§cError: Home "§e${homeName}§c" not found. Use !listhomes to list your saved homes.`);
                return;
            }

            // Teleport player
            player.teleport(
                { x: targetHome.x, y: targetHome.y, z: targetHome.z },
                { dimension: world.getDimension(targetHome.dimension) }
            );
            player.sendMessage(`§aTeleported to home "§e${homeName}§a"!`);
        }
        else if (cmd === 'delhome') {
            const homes = getHomes(player);
            if (!homes[homeName]) {
                player.sendMessage(`§cError: Home "§e${homeName}§c" does not exist.`);
                return;
            }

            delete homes[homeName];
            saveHomes(player, homes);
            player.sendMessage(`§aSuccess: Home "§e${homeName}§a" has been deleted!`);
        }
        else if (cmd === 'listhomes' || cmd === 'homes') {
            const homes = getHomes(player);
            const homeNames = Object.keys(homes);

            if (homeNames.length === 0) {
                player.sendMessage("§eYou don't have any saved homes yet. Set one using: !sethome [name]");
                return;
            }

            player.sendMessage(`§6Your saved homes (${homeNames.length}):`);
            for (const name of homeNames) {
                const h = homes[name];
                const dimFriendly = h.dimension.replace('minecraft:', '');
                player.sendMessage(`§e- ${name} §7(X: ${Math.round(h.x)}, Y: ${Math.round(h.y)}, Z: ${Math.round(h.z)} in ${dimFriendly})`);
            }
        }
        else if (cmd === 'help') {
            player.sendMessage(`§6--- Simple Homes Help ---`);
            player.sendMessage(`§e/scriptevent sh:sethome [name] §7- Set a home (defaults to "home")`);
            player.sendMessage(`§e/scriptevent sh:home [name] §7- Teleport to a saved home`);
            player.sendMessage(`§e/scriptevent sh:delhome [name] §7- Delete a saved home`);
            player.sendMessage(`§e/scriptevent sh:listhomes §7- List all your saved homes`);
        }
        else {
            player.sendMessage(`§cUnknown command. Use "/scriptevent sh:help" for commands.`);
        }
    } catch (error) {
        player.sendMessage(`§cAn error occurred: ${error.message}`);
        console.error("SimpleHomes Command Error: ", error);
    }
}

// Register Chat commands
let chatSendEvent = null;
let isBeforeEvent = false;

if (world.beforeEvents && world.beforeEvents.chatSend) {
    chatSendEvent = world.beforeEvents.chatSend;
    isBeforeEvent = true;
} else if (world.afterEvents && world.afterEvents.chatSend) {
    chatSendEvent = world.afterEvents.chatSend;
}

if (chatSendEvent) {
    chatSendEvent.subscribe((eventData) => {
        const { sender: player, message } = eventData;

        if (!message.startsWith('!')) return;

        if (isBeforeEvent) {
            eventData.cancel = true;
        }

        system.run(() => {
            handleCommand(player, message.slice(1));
        });
    });
} else {
    console.warn("SimpleHomes: Beta APIs are disabled. Standard chat listeners are unavailable. Please use '/scriptevent sh:sethome' in-game.");
}

// Register Script Events as fallback (/scriptevent sethome:name)
if (system.afterEvents && system.afterEvents.scriptEventReceive) {
    system.afterEvents.scriptEventReceive.subscribe((eventData) => {
        const { id, message, sourceEntity } = eventData;
        
        // Ensure the source is a player
        if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;

        const player = sourceEntity;

        if (id === "sh:sethome" || id === "sh:home" || id === "sh:delhome" || id === "sh:listhomes" || id === "sh:help") {
            const cmd = id.split(":")[1];
            const fullCommand = cmd + (message ? " " + message : "");
            handleCommand(player, fullCommand);
        }
    });
}
