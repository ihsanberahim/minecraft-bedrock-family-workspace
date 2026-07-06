import { system, world } from '@minecraft/server';

export const EFFECT_DURATION = 300;
export const TICK_INTERVAL = 100;


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

const TIER_LABELS = [
    null, // tier 0 — no notification
    { level: 10, perks: '§bProtection I §7(Resistance I)' },
    { level: 20, perks: '§bProtection I §7(Resistance I)§7, §bRegeneration I' },
    { level: 30, perks: '§bProtection II §7(Resistance II)§7, §bRegeneration I' },
    { level: 40, perks: '§bProtection II §7(Resistance II)§7, §bRegeneration II' },
    { level: 50, perks: '§bProtection III §7(Resistance III)§7, §bRegeneration II' },
];

/**
 * Checks if the player has moved to a new tier and notifies them if so.
 * Stores last notified tier in the "levelperks_tier" dynamic property.
 * @param {import('@minecraft/server').Player} player
 * @param {number} newTier
 */
function checkAndNotify(player, newTier) {
    const stored = player.getDynamicProperty('levelperks_tier') ?? 0;
    if (newTier === stored) return;

    // Update stored tier (handles both upgrades and downgrades silently)
    player.setDynamicProperty('levelperks_tier', newTier);

    // Only send chat notification when moving UP a tier
    if (newTier > stored && TIER_LABELS[newTier]) {
        const label = TIER_LABELS[newTier];
        player.sendMessage(
            `§a✦ Level Up Perk! §eYou reached Level ${label.level}!\n§7You now have: ${label.perks}`
        );
    }
}

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
        player.addEffect('resistance', EFFECT_DURATION, { amplifier: tier.resistance.amplifier, ...effectOptions });
    }
    if (tier.regen) {
        player.addEffect('regeneration', EFFECT_DURATION, { amplifier: tier.regen.amplifier, ...effectOptions });
    }
}

// Main loop — runs every TICK_INTERVAL ticks
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        try {
            const tier = getTier(player.level);
            applyTierEffects(player, tier);
            checkAndNotify(player, tier);
        } catch (e) {
            console.warn('[LevelPerks] Error in player effect processing:', e);
        }
    }
}, TICK_INTERVAL);
