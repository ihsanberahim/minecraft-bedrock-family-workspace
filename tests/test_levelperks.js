import { mockState, addMockPlayer } from '@minecraft/server';

// Helper to create mock player with level and addEffect
function createTestPlayer(name, level) {
    const player = addMockPlayer(name);
    player.level = level;
    player.appliedEffects = [];
    player.activeEffects = new Map();
    player.getEffect = function (effectId) {
        return this.activeEffects.get(effectId);
    };
    player.addEffect = function (effectId, duration, options) {
        const amplifier = options?.amplifier ?? 0;
        this.activeEffects.set(effectId, { amplifier, duration });
        this.appliedEffects.push({ effectId, duration, options });
    };
    player.dynamicProperties = {};
    player.getDynamicProperty = function (key) {
        return this.dynamicProperties[key];
    };
    player.setDynamicProperty = function (key, value) {
        this.dynamicProperties[key] = value;
    };
    return player;
}

async function runTests() {
    console.log("Running LevelPerks Tier and Loop Tests...");

    // Reset mock state to clean start
    mockState.reset();

    // 1. Dynamic import of our implementation
    const module = await import('../behavior_packs/LevelPerks/scripts/index.js');

    // 2. Verify system.runInterval was registered correctly
    if (mockState.intervals.length !== 1) {
        throw new Error(`Expected 1 interval registered, got ${mockState.intervals.length}`);
    }

    const { callback, ticks } = mockState.intervals[0];
    if (ticks !== 100) {
        throw new Error(`Expected interval to be 100 ticks, got ${ticks}`);
    }
    console.log("PASS: system.runInterval registered successfully with 100 ticks.");

    // 3. Test getTier function exports directly
    console.log("Testing getTier function...");
    const testCasesGetTier = [
        { level: 0, expected: 0 },
        { level: 5, expected: 0 },
        { level: 10, expected: 1 },
        { level: 15, expected: 1 },
        { level: 20, expected: 2 },
        { level: 29, expected: 2 },
        { level: 30, expected: 3 },
        { level: 35, expected: 3 },
        { level: 40, expected: 4 },
        { level: 45, expected: 4 },
        { level: 50, expected: 5 },
        { level: 100, expected: 5 },
    ];

    for (const { level, expected } of testCasesGetTier) {
        const result = module.getTier(level);
        if (result !== expected) {
            throw new Error(`getTier(${level}) returned ${result}, expected ${expected}`);
        }
    }
    console.log("PASS: getTier tests passed.");

    // 4. Test runInterval callback on multiple players
    console.log("Testing interval callback execution with players of different levels...");
    mockState.reset(); // Clear out players

    const playersData = [
        { name: "P_Level0", level: 0 },
        { name: "P_Level9", level: 9 },
        { name: "P_Level10", level: 10 },
        { name: "P_Level20", level: 20 },
        { name: "P_Level30", level: 30 },
        { name: "P_Level40", level: 40 },
        { name: "P_Level50", level: 50 },
        { name: "P_Level60", level: 60 },
    ];

    const players = playersData.map(p => createTestPlayer(p.name, p.level));

    // Run the callback
    callback();

    // Verify effects applied to each player
    const expectedEffects = {
        "P_Level0": [],
        "P_Level9": [],
        "P_Level10": [
            { effectId: 'resistance', duration: 120, options: { amplifier: 0, showParticles: false } }
        ],
        "P_Level20": [
            { effectId: 'resistance', duration: 120, options: { amplifier: 0, showParticles: false } },
            { effectId: 'regeneration', duration: 120, options: { amplifier: 0, showParticles: false } }
        ],
        "P_Level30": [
            { effectId: 'resistance', duration: 120, options: { amplifier: 1, showParticles: false } },
            { effectId: 'regeneration', duration: 120, options: { amplifier: 0, showParticles: false } }
        ],
        "P_Level40": [
            { effectId: 'resistance', duration: 120, options: { amplifier: 1, showParticles: false } },
            { effectId: 'regeneration', duration: 120, options: { amplifier: 1, showParticles: false } }
        ],
        "P_Level50": [
            { effectId: 'resistance', duration: 120, options: { amplifier: 2, showParticles: false } },
            { effectId: 'regeneration', duration: 120, options: { amplifier: 1, showParticles: false } }
        ],
        "P_Level60": [
            { effectId: 'resistance', duration: 120, options: { amplifier: 2, showParticles: false } },
            { effectId: 'regeneration', duration: 120, options: { amplifier: 1, showParticles: false } }
        ],
    };

    for (const player of players) {
        const expected = expectedEffects[player.name];
        if (player.appliedEffects.length !== expected.length) {
            throw new Error(`Player ${player.name} (level ${player.level}) got ${player.appliedEffects.length} effects, expected ${expected.length}`);
        }
        for (let i = 0; i < expected.length; i++) {
            const exp = expected[i];
            const actual = player.appliedEffects.find(e => e.effectId === exp.effectId);
            if (!actual) {
                throw new Error(`Player ${player.name} missing expected effect: ${exp.effectId}`);
            }
            if (actual.duration !== exp.duration) {
                throw new Error(`Player ${player.name} effect ${exp.effectId} has duration ${actual.duration}, expected ${exp.duration}`);
            }
            if (actual.options.amplifier !== exp.options.amplifier) {
                throw new Error(`Player ${player.name} effect ${exp.effectId} has amplifier ${actual.options.amplifier}, expected ${exp.options.amplifier}`);
            }
            if (actual.options.showParticles !== exp.options.showParticles) {
                throw new Error(`Player ${player.name} effect ${exp.effectId} has showParticles ${actual.options.showParticles}, expected ${exp.options.showParticles}`);
            }
        }
    }

    console.log("PASS: All player tier effects applied correctly in loop!");

    // 5. Test error isolation in loop
    console.log("Testing error isolation in player loop...");
    mockState.reset();

    const badPlayer = createTestPlayer("BadPlayer", 30);
    badPlayer.addEffect = function() {
        throw new Error("Simulated addEffect error");
    };

    const goodPlayer = createTestPlayer("GoodPlayer", 30);

    // Run the callback (suppressing console.warn output to keep logs clean or letting it print to show it caught it)
    const originalWarn = console.warn;
    let warnCalled = false;
    console.warn = (msg, err) => {
        warnCalled = true;
        if (msg.includes("[LevelPerks] Error in player") || msg.includes("[LevelPerks] Error in effect loop")) {
            // expected warn
        } else {
            originalWarn(msg, err);
        }
    };

    try {
        callback();
    } finally {
        console.warn = originalWarn;
    }

    if (!warnCalled) {
        throw new Error("Expected console.warn to be called for the simulated error.");
    }

    if (goodPlayer.appliedEffects.length === 0) {
        throw new Error("GoodPlayer should have received effects even though BadPlayer failed.");
    }
    console.log("PASS: Error isolation verified. BadPlayer failure did not abort loop.");

    // 6. Test Tier Change Notifications and Dynamic Properties
    console.log("Testing tier change notifications and dynamic properties...");
    mockState.reset();

    const notifierPlayer = createTestPlayer("NotifierTestPlayer", 0);

    // Initial check (Level 0)
    callback();
    if (notifierPlayer.getDynamicProperty("levelperks_tier") !== undefined && notifierPlayer.getDynamicProperty("levelperks_tier") !== 0) {
        throw new Error(`Expected levelperks_tier to be undefined or 0 at level 0, got ${notifierPlayer.getDynamicProperty("levelperks_tier")}`);
    }
    if (mockState.messagesSent.length !== 0) {
        throw new Error(`Expected 0 messages sent initially, got ${mockState.messagesSent.length}`);
    }

    // Upgrade to Level 10 (Tier 1)
    notifierPlayer.level = 10;
    callback();
    if (notifierPlayer.getDynamicProperty("levelperks_tier") !== 1) {
        throw new Error(`Expected levelperks_tier to be 1 at level 10, got ${notifierPlayer.getDynamicProperty("levelperks_tier")}`);
    }
    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected exactly 1 message sent on level 10 reached, got ${mockState.messagesSent.length}`);
    }
    let lastMsg = mockState.messagesSent[0];
    if (lastMsg.player !== "NotifierTestPlayer") {
        throw new Error(`Expected message for NotifierTestPlayer, got for ${lastMsg.player}`);
    }
    if (!lastMsg.message.includes("Level 10")) {
        throw new Error(`Expected message to contain 'Level 10', got: ${lastMsg.message}`);
    }

    // Stay at Level 10 (No extra notification)
    callback();
    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected message count to remain 1 when level is unchanged, got ${mockState.messagesSent.length}`);
    }

    // Upgrade to Level 20 (Tier 2)
    notifierPlayer.level = 20;
    callback();
    if (notifierPlayer.getDynamicProperty("levelperks_tier") !== 2) {
        throw new Error(`Expected levelperks_tier to be 2 at level 20, got ${notifierPlayer.getDynamicProperty("levelperks_tier")}`);
    }
    if (mockState.messagesSent.length !== 2) {
        throw new Error(`Expected exactly 2 messages sent after reaching level 20, got ${mockState.messagesSent.length}`);
    }
    lastMsg = mockState.messagesSent[1];
    if (!lastMsg.message.includes("Level 20")) {
        throw new Error(`Expected second message to contain 'Level 20', got: ${lastMsg.message}`);
    }

    // Downgrade to Level 5 (Silent downgrade)
    notifierPlayer.level = 5;
    callback();
    if (notifierPlayer.getDynamicProperty("levelperks_tier") !== 0) {
        throw new Error(`Expected levelperks_tier to be 0 after downgrade to level 5, got ${notifierPlayer.getDynamicProperty("levelperks_tier")}`);
    }
    if (mockState.messagesSent.length !== 2) {
        throw new Error(`Expected messages count to remain 2 (silent downgrade), got ${mockState.messagesSent.length}`);
    }

    // Upgrade back to Level 10 (Tier 1 again - should notify again)
    notifierPlayer.level = 10;
    callback();
    if (notifierPlayer.getDynamicProperty("levelperks_tier") !== 1) {
        throw new Error(`Expected levelperks_tier to be 1 after leveling back up to 10, got ${notifierPlayer.getDynamicProperty("levelperks_tier")}`);
    }
    if (mockState.messagesSent.length !== 3) {
        throw new Error(`Expected exactly 3 messages sent after releveling to 10, got ${mockState.messagesSent.length}`);
    }
    lastMsg = mockState.messagesSent[2];
    if (!lastMsg.message.includes("Level 10")) {
        throw new Error(`Expected third message to contain 'Level 10', got: ${lastMsg.message}`);
    }
    console.log("PASS: Tier change notifications and dynamic property updates verified successfully.");

    // 7. Test Safe Effect Overwriting and Downgrading
    console.log("Testing safe effect overwriting and downgrading scenarios...");
    mockState.reset();

    // -- No Downgrading:
    // A player with an active high-amplifier effect (e.g. Resistance II, duration 3600)
    // does NOT have it overwritten by a lower perk (e.g. Resistance I).
    const playerHighAmp = createTestPlayer("HighAmpPlayer", 10); // Tier 1 provides Resistance I (amplifier 0)
    playerHighAmp.activeEffects.set('resistance', { amplifier: 1, duration: 3600 }); // Resistance II
    callback();
    // It should NOT have added Resistance I (so appliedEffects for resistance should be empty)
    if (playerHighAmp.appliedEffects.some(e => e.effectId === 'resistance')) {
        throw new Error("HighAmpPlayer: active high-amplifier effect was overwritten by lower amplifier effect.");
    }
    console.log("PASS: Active high-amplifier effect was not downgraded.");

    // -- No Downgrading with Short Duration:
    // A player with an active high-amplifier effect with short duration (e.g. Resistance II, duration 100)
    // does NOT have it overwritten/downgraded by a lower perk (e.g. Resistance I).
    const playerHighAmpShort = createTestPlayer("HighAmpShortPlayer", 10); // Tier 1 provides Resistance I (amplifier 0)
    playerHighAmpShort.activeEffects.set('resistance', { amplifier: 1, duration: 100 }); // Resistance II, short duration
    callback();
    // It should NOT have added Resistance I (so appliedEffects for resistance should be empty)
    if (playerHighAmpShort.appliedEffects.some(e => e.effectId === 'resistance')) {
        throw new Error("HighAmpShortPlayer: active high-amplifier effect with short duration was overwritten/downgraded by lower amplifier effect.");
    }
    console.log("PASS: Active high-amplifier effect with short duration was not downgraded.");


    // -- No Overwriting Long-Duration:
    // A player with an active equal-amplifier effect with long duration (e.g. Regeneration I, duration 1200)
    // does NOT have it overwritten.
    const playerLongDuration = createTestPlayer("LongDurationPlayer", 20); // Tier 2 provides Regeneration I (amplifier 0)
    playerLongDuration.activeEffects.set('regeneration', { amplifier: 0, duration: 1200 }); // Regeneration I
    callback();
    // It should NOT have added Regeneration I (appliedEffects for regeneration should be empty)
    if (playerLongDuration.appliedEffects.some(e => e.effectId === 'regeneration')) {
        throw new Error("LongDurationPlayer: active equal-amplifier effect with long duration was overwritten.");
    }
    console.log("PASS: Active equal-amplifier effect with long duration was not overwritten.");

    // -- Successful Refresh:
    // A player with our perk effect that is about to expire (duration <= 120) gets refreshed.
    const playerRefresh = createTestPlayer("RefreshPlayer", 10); // Tier 1 provides Resistance I (amplifier 0)
    playerRefresh.activeEffects.set('resistance', { amplifier: 0, duration: 120 }); // Resistance I about to expire
    callback();
    // It SHOULD have refreshed it (appliedEffects should contain resistance)
    const refreshEffect = playerRefresh.appliedEffects.find(e => e.effectId === 'resistance');
    if (!refreshEffect) {
        throw new Error("RefreshPlayer: expiring effect was not refreshed.");
    }
    if (refreshEffect.duration !== 120) {
        throw new Error(`RefreshPlayer: refreshed effect duration is ${refreshEffect.duration}, expected 120.`);
    }
    console.log("PASS: Expiring effect was successfully refreshed.");

    // -- Instant Upgrade:
    // A player with a lower-amplifier effect (e.g. Resistance I) gets upgraded immediately if their perk tier gives Resistance II.
    const playerUpgrade = createTestPlayer("UpgradePlayer", 30); // Tier 3 provides Resistance II (amplifier 1)
    playerUpgrade.activeEffects.set('resistance', { amplifier: 0, duration: 3600 }); // Resistance I active (high duration)
    callback();
    // It SHOULD have upgraded to Resistance II (appliedEffects should contain resistance with amplifier 1)
    const upgradeEffect = playerUpgrade.appliedEffects.find(e => e.effectId === 'resistance');
    if (!upgradeEffect) {
        throw new Error("UpgradePlayer: lower-amplifier effect was not upgraded.");
    }
    if (upgradeEffect.options.amplifier !== 1) {
        throw new Error(`UpgradePlayer: upgraded amplifier is ${upgradeEffect.options.amplifier}, expected 1.`);
    }
    console.log("PASS: Lower-amplifier effect was immediately upgraded.");

    console.log("All tests passed successfully!");
}


runTests().catch(err => {
    console.error("FAIL:", err);
    process.exit(1);
});
