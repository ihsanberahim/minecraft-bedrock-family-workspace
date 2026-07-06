import { system, world } from '@minecraft/server';

/**
 * Each entry describes what effects to apply at that tier.
 * null means the effect is not active at this tier.
 * amplifier is 0-indexed (0 = level I, 1 = level II, 2 = level III).
 */
export const TIER_CONFIG = [
    // Tier 0: < level 10 — no perks
    { threshold: 0,  resistance: null,            regen: null },
    // Tier 1: >= level 10
    { threshold: 10, resistance: { amplifier: 0 }, regen: null },
    // Tier 2: >= level 20
    { threshold: 20, resistance: { amplifier: 0 }, regen: { amplifier: 0 } },
    // Tier 3: >= level 30
    { threshold: 30, resistance: { amplifier: 1 }, regen: { amplifier: 0 } },
    // Tier 4: >= level 40
    { threshold: 40, resistance: { amplifier: 1 }, regen: { amplifier: 1 } },
    // Tier 5: >= level 50
    { threshold: 50, resistance: { amplifier: 2 }, regen: { amplifier: 1 } },
];

/**
 * Returns the tier index (0-5) that applies for the given XP level.
 * Scans from highest to lowest threshold.
 * @param {number} level
 * @returns {number}
 */
export function getTier(level) {
    for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
        if (level >= TIER_CONFIG[i].threshold) return i;
    }
    return 0;
}

/**
 * Applies the passive effects for the given tier to the player.
 * Effects are applied with a 300-tick duration (15s) and no particles.
 * @param {import('@minecraft/server').Player} player
 * @param {number} tierIndex
 */
export function applyTierEffects(player, tierIndex) {
    const tier = TIER_CONFIG[tierIndex];
    const effectOptions = { showParticles: false };

    if (tier.resistance) {
        player.addEffect('resistance', 300, { amplifier: tier.resistance.amplifier, ...effectOptions });
    }
    if (tier.regen) {
        player.addEffect('regeneration', 300, { amplifier: tier.regen.amplifier, ...effectOptions });
    }
}

// Main loop — runs every 100 ticks (5 seconds)
system.runInterval(() => {
    try {
        for (const player of world.getAllPlayers()) {
            const tier = getTier(player.level);
            applyTierEffects(player, tier);
        }
    } catch (e) {
        console.warn('[LevelPerks] Error in effect loop:', e);
    }
}, 100);
