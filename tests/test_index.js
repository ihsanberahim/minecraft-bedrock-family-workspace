import { mockState, addMockPlayer } from '@minecraft/server';
import { calculatePrayerTimes, formatTime } from '../behavior_packs/SolatAlerts/scripts/prayertimes.js';

// Coordinates for Kuala Lumpur
const LAT = 3.1390;
const LON = 101.6869;
const TZ = 8;

// Time mocking helpers
const OriginalDate = global.Date;
function setMockTime(isoString) {
    const mockTime = new OriginalDate(isoString).getTime();
    global.Date = class extends OriginalDate {
        constructor(...args) {
            if (args.length === 0) {
                return new OriginalDate(mockTime);
            }
            return new OriginalDate(...args);
        }
        static now() {
            return mockTime;
        }
    };
}
function restoreDate() {
    global.Date = OriginalDate;
}

async function runTests() {
    console.log("Running index.js Ticking & Alert Dispatcher tests...");

    // Add a mock player
    const player = addMockPlayer("Steve");

    // Import the production script (this registers the interval)
    await import('../behavior_packs/SolatAlerts/scripts/index.js');

    // Verify system.runInterval was called
    if (mockState.intervals.length !== 1) {
        throw new Error(`Expected exactly 1 interval registered, got ${mockState.intervals.length}`);
    }

    const { callback, ticks } = mockState.intervals[0];
    if (ticks !== 200) {
        throw new Error(`Expected interval to be 200 ticks, got ${ticks}`);
    }

    // ----------------------------------------------------
    // Test Case 1: 30 minutes before Asr (Asr is 16:44 local time)
    // 30 mins before Asr is 16:14 local, which is 08:14 UTC
    // ----------------------------------------------------
    console.log("Test Case 1: 30 minutes before Asr alert...");
    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-06T08:14:00Z"); // 16:14 UTC+8
    callback();

    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected 1 chat message, got ${mockState.messagesSent.length}`);
    }
    const msg1 = mockState.messagesSent[0].message;
    console.log("Received chat message:", msg1);
    if (!msg1.includes("in 30m") || !msg1.includes("Asr") || !msg1.includes("16:44")) {
        throw new Error(`Invalid chat message for 30m warning: ${msg1}`);
    }

    // Test Case 1b: Duplicate prevention
    console.log("Test Case 1b: Duplicate warning prevention...");
    mockState.reset();
    addMockPlayer("Steve");
    callback(); // run again at the same time
    if (mockState.messagesSent.length !== 0) {
        throw new Error(`Expected 0 chat messages (duplicate prevention), got ${mockState.messagesSent.length}`);
    }

    // ----------------------------------------------------
    // Test Case 2: 10 minutes before Asr (16:34 local, 08:34 UTC)
    // ----------------------------------------------------
    console.log("Test Case 2: 10 minutes before Asr alert...");
    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-06T08:34:00Z");
    callback();

    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected 1 chat message, got ${mockState.messagesSent.length}`);
    }
    const msg2 = mockState.messagesSent[0].message;
    if (!msg2.includes("in 10m") || !msg2.includes("Asr")) {
        throw new Error(`Invalid chat message for 10m warning: ${msg2}`);
    }

    // ----------------------------------------------------
    // Test Case 3: 5 minutes before Asr (16:39 local, 08:39 UTC)
    // ----------------------------------------------------
    console.log("Test Case 3: 5 minutes before Asr alert...");
    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-06T08:39:00Z");
    callback();

    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected 1 chat message, got ${mockState.messagesSent.length}`);
    }
    const msg3 = mockState.messagesSent[0].message;
    if (!msg3.includes("in 5m") || !msg3.includes("Asr")) {
        throw new Error(`Invalid chat message for 5m warning: ${msg3}`);
    }

    // ----------------------------------------------------
    // Test Case 4: Asr Start Alert (16:44 local, 08:44 UTC)
    // ----------------------------------------------------
    console.log("Test Case 4: Asr Start Alert (0m / Title / Subtitle / Sound)...");
    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-06T08:44:00Z");
    callback();

    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected 1 chat message, got ${mockState.messagesSent.length}`);
    }
    const startMsg = mockState.messagesSent[0].message;
    if (!startMsg.includes("started") || !startMsg.includes("Asr")) {
        throw new Error(`Invalid start chat message: ${startMsg}`);
    }

    if (mockState.titlesSet.length !== 1 || mockState.subtitlesSet.length !== 1) {
        throw new Error(`Expected 1 title and subtitle set, got titles=${mockState.titlesSet.length}, subtitles=${mockState.subtitlesSet.length}`);
    }
    if (!mockState.titlesSet[0].title.includes("Asr")) {
        throw new Error(`Title does not contain prayer name: ${mockState.titlesSet[0].title}`);
    }

    if (mockState.soundsPlayed.length !== 1) {
        throw new Error(`Expected 1 sound played, got ${mockState.soundsPlayed.length}`);
    }
    const sound = mockState.soundsPlayed[0];
    if (sound.soundId !== 'random.levelup' || sound.options.volume !== 0.5 || sound.options.pitch !== 1.0) {
        throw new Error(`Invalid sound details: ${JSON.stringify(sound)}`);
    }

    // ----------------------------------------------------
    // Test Case 5: Crossover check within 1 minute (e.g. 16:44:30 local, 08:44:30 UTC)
    // ----------------------------------------------------
    console.log("Test Case 5: Crossover buffer check (within -1 minute limit)...");
    mockState.reset();
    addMockPlayer("Steve");
    // Set time to 30 seconds after 16:44
    setMockTime("2026-07-06T08:44:30Z");
    callback();
    // Since start alert already fired, it should NOT fire again
    if (mockState.messagesSent.length !== 0) {
        throw new Error(`Expected start alert not to refire, got ${mockState.messagesSent.length} messages`);
    }

    // Now test if it wasn't fired, it should fire in the crossover window
    // We change the date slightly to 2026-07-07, Asr on July 7 is 16:44 too.
    // Let's verify Asr on July 7 first:
    const timesJuly7 = calculatePrayerTimes(new OriginalDate("2026-07-07T00:00:00Z"), LAT, LON, TZ);
    const asrTimeJuly7 = formatTime(timesJuly7.asr);
    console.log(`Asr time on July 7: ${asrTimeJuly7}`);

    console.log("Test Case 5b: Crossover fires if not already fired...");
    mockState.reset();
    addMockPlayer("Steve");
    // Set time to July 7, 30 seconds past Asr start
    // Wait, let's calculate exact local time
    // If July 7 Asr local is e.g. 16:44, then 16:44:30 local is 08:44:30 UTC.
    // Let's set mock time to July 7, 08:44:30 UTC
    setMockTime("2026-07-07T08:44:30Z");
    callback();
    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected crossover start alert to fire, got ${mockState.messagesSent.length} messages`);
    }

    // ----------------------------------------------------
    // Test Case 6: Memory Bounding / Clean Up
    // ----------------------------------------------------
    console.log("Test Case 6: Old alerts are deleted...");
    // Let's verify that after date roll-over, the firedAlerts set has cleaned up the July 6 alerts.
    // Wait, how do we verify this? Since firedAlerts is a private set inside index.js, we can't inspect it directly.
    // But we can verify it indirectly:
    // If we set the time back to July 6 16:14:00 (which previously fired), it should NOT fire again if it's still clean,
    // wait, no: if we clean it up when date changes, then if we go back to July 6, it would fire again because it was deleted!
    // Let's test that:
    // 1. Set time to July 6, fire 30m alert. (Fires)
    // 2. Set time to July 7, run callback. (Triggers dateStr change to "2026-07-07", causing July 6 alerts to be deleted from firedAlerts).
    // 3. Set time back to July 6, run callback. (Should fire 30m alert again because it was deleted).
    console.log("Testing memory bounding cleanup...");
    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-06T08:14:00Z");
    callback(); // fires July 6 alert
    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected alert to fire initially`);
    }

    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-07T08:14:00Z"); // Change date to July 7
    callback(); // Runs cleanup on July 6 alerts

    mockState.reset();
    addMockPlayer("Steve");
    setMockTime("2026-07-06T08:14:00Z"); // Go back to July 6
    callback(); // Should fire again since it was deleted
    if (mockState.messagesSent.length !== 1) {
        throw new Error(`Expected alert to fire again after memory cleanup, got ${mockState.messagesSent.length}`);
    }

    restoreDate();
    console.log("PASS: All index.js alerts and ticking logic tests succeeded!");
}

runTests().catch(err => {
    restoreDate();
    console.error("FAIL:", err);
    process.exit(1);
});
