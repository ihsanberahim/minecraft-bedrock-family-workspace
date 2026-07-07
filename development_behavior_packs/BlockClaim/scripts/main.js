import { world, system, DynamicPropertiesDefinition } from "@minecraft/server";

const rewardBlocks = [
    "minecraft:melon_block",
    "minecraft:pumpkin",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:copper_ore",
    "minecraft:deepslate_copper_ore",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:coal_ore",
    "minecraft:deepslate_coal_ore"
];

const cookableMeatAnimals = [
    "minecraft:chicken",
    "minecraft:cow",
    "minecraft:sheep",
    "minecraft:pig",
    "minecraft:rabbit",
    "minecraft:salmon",
    "minecraft:cod"
];

world.afterEvents.worldInitialize.subscribe((event) => {
    // Initialize dynamic properties for claims and limits
    const def = new DynamicPropertiesDefinition();
    def.defineString("claims", 10000); // Store serialized JSON of claims
    event.propertyRegistry.registerWorldDynamicProperties(def);

    const playerDef = new DynamicPropertiesDefinition();
    playerDef.defineNumber("availableClaimBlocks");
    event.propertyRegistry.registerEntityTypeDynamicProperties(playerDef, "minecraft:player");
});

function getPlayerLimit(player) {
    const limit = player.getDynamicProperty("availableClaimBlocks");
    return limit === undefined ? 100 : limit;
}

function addPlayerLimit(player, amount) {
    const current = getPlayerLimit(player);
    player.setDynamicProperty("availableClaimBlocks", current + amount);
    player.onScreenDisplay.setActionBar(`+${amount} Claim Blocks! (Total: ${current + amount})`);
}

world.afterEvents.playerBreakBlock.subscribe((ev) => {
    const block = ev.brokenBlockPermutation;
    const typeId = block.type.id;
    const player = ev.player;

    if (rewardBlocks.includes(typeId) || typeId.includes("_log") || typeId.includes("_wood")) {
        // Simple chance to prevent farming easily, or just give 1
        if (Math.random() < 0.2) addPlayerLimit(player, 1);
    }
});

world.afterEvents.entityDie.subscribe((ev) => {
    const entity = ev.deadEntity;
    const killer = ev.damageSource.damagingEntity;

    if (killer && killer.typeId === "minecraft:player") {
        if (cookableMeatAnimals.includes(entity.typeId)) {
            if (Math.random() < 0.2) addPlayerLimit(killer, 1);
        }
    }
});

console.warn("[BlockClaim] Pack loaded.");
