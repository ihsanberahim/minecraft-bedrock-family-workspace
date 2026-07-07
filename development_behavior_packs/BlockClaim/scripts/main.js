import { world, system } from "@minecraft/server";

world.afterEvents.worldInitialize.subscribe((event) => {
    // Initialize dynamic properties for claims and limits
    const def = new DynamicPropertiesDefinition();
    def.defineString("claims", 10000); // Store serialized JSON of claims
    event.propertyRegistry.registerWorldDynamicProperties(def);
});

console.warn("[BlockClaim] Pack loaded.");
