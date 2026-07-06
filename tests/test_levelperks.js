import { mockState, addMockPlayer } from '@minecraft/server';

// Helper to create mock player with level and addEffect
function createTestPlayer(name, level) {
    const player = addMockPlayer(name);
    player.level = level;
    player.appliedEffects = [];
    player.addEffect = function (effectId, duration, options) {
        this.appliedEffects.push({ effectId, duration, options });
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
            { effectId: 'resistance', duration: 300, options: { amplifier: 0, showParticles: false } }
        ],
        "P_Level20": [
            { effectId: 'resistance', duration: 300, options: { amplifier: 0, showParticles: false } },
            { effectId: 'regeneration', duration: 300, options: { amplifier: 0, showParticles: false } }
        ],
        "P_Level30": [
            { effectId: 'resistance', duration: 300, options: { amplifier: 1, showParticles: false } },
            { effectId: 'regeneration', duration: 300, options: { amplifier: 0, showParticles: false } }
        ],
        "P_Level40": [
            { effectId: 'resistance', duration: 300, options: { amplifier: 1, showParticles: false } },
            { effectId: 'regeneration', duration: 300, options: { amplifier: 1, showParticles: false } }
        ],
        "P_Level50": [
            { effectId: 'resistance', duration: 300, options: { amplifier: 2, showParticles: false } },
            { effectId: 'regeneration', duration: 300, options: { amplifier: 1, showParticles: false } }
        ],
        "P_Level60": [
            { effectId: 'resistance', duration: 300, options: { amplifier: 2, showParticles: false } },
            { effectId: 'regeneration', duration: 300, options: { amplifier: 1, showParticles: false } }
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
    console.log("All tests passed successfully!");
}

runTests().catch(err => {
    console.error("FAIL:", err);
    process.exit(1);
});
