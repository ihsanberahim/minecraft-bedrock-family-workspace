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

    // ----------------------------------------------------
    // Test Case 7: Warning Tracking Dynamic Properties
    // ----------------------------------------------------
    console.log("Test Case 7: Warning tracking sets player dynamic properties...");
    // Let's trigger memory bounding cleanup to clear firedAlerts by setting time to July 7, then July 8, etc.
    // Or we can just use a new date (July 8) so firedAlerts doesn't have any matching keys.
    mockState.reset();
    const trackingPlayer = addMockPlayer("TrackerSteve");
    setMockTime("2026-07-08T08:14:00Z"); // 16:14 UTC+8 on July 8
    callback();

    const rawProp = trackingPlayer.getDynamicProperty("solat_tracking");
    if (!rawProp) {
        throw new Error("Expected solat_tracking property to be set on player");
    }
    const parsedProp = JSON.parse(rawProp);
    if (parsedProp.prayer !== "Asr" || !parsedProp.alerts.includes(30)) {
        throw new Error(`Invalid solat_tracking property contents: ${rawProp}`);
    }
    console.log("solat_tracking contents after 30m alert:", rawProp);

    // Run 10m warning
    setMockTime("2026-07-08T08:34:00Z");
    callback();
    const rawProp2 = trackingPlayer.getDynamicProperty("solat_tracking");
    const parsedProp2 = JSON.parse(rawProp2);
    if (!parsedProp2.alerts.includes(30) || !parsedProp2.alerts.includes(10)) {
        throw new Error(`Expected both 30m and 10m alerts in tracking: ${rawProp2}`);
    }

    // Run 5m warning
    setMockTime("2026-07-08T08:39:00Z");
    callback();
    const rawProp3 = trackingPlayer.getDynamicProperty("solat_tracking");
    const parsedProp3 = JSON.parse(rawProp3);
    if (!parsedProp3.alerts.includes(30) || !parsedProp3.alerts.includes(10) || !parsedProp3.alerts.includes(5)) {
        throw new Error(`Expected 30m, 10m, and 5m alerts in tracking: ${rawProp3}`);
    }

    // ----------------------------------------------------
    // Test Case 8: Leave Hook Sets Logout Time
    // ----------------------------------------------------
    console.log("Test Case 8: Leave hook sets logout timestamp...");
    if (typeof mockState.playerLeaveSubscribe !== 'function') {
        throw new Error("Leave hook was not subscribed correctly");
    }
    const leaveTime = 1772872440000; // Mock logout time
    setMockTime(new Date(leaveTime).toISOString());
    
    const leaveEvent = { player: trackingPlayer };
    mockState.playerLeaveSubscribe(leaveEvent);

    const logoutTimeVal = trackingPlayer.getDynamicProperty('solat_logout_time');
    if (logoutTimeVal !== leaveTime.toString()) {
        throw new Error(`Expected logout time property to be '${leaveTime}', got '${logoutTimeVal}'`);
    }

    // ----------------------------------------------------
    // Test Case 9: Spawn/Login Hook Eligibility & Reward (Eligible Case)
    // ----------------------------------------------------
    console.log("Test Case 9: Eligible player spawn awards bottles & clears tracking...");
    if (typeof mockState.playerSpawnSubscribe !== 'function') {
        throw new Error("Spawn hook was not subscribed correctly");
    }

    // Pre-requisites for eligible player:
    // 1. received warnings (30, 10, 5) -> set in Test Case 7 parsedProp3
    // 2. logged out within 10 minutes of start -> start is 16:44 local (08:44 UTC) = 1772873040000 ms.
    // Let's verify start timestamp in parsedProp3.startTime
    const startTimeVal = parsedProp3.startTime;
    console.log("Prayer start time from tracking:", new Date(startTimeVal).toISOString());

    // Set logout time to 5 minutes after start (which is <= 10 mins after start, so within 10 min window)
    const mockLogoutTime = startTimeVal + (5 * 60 * 1000);
    trackingPlayer.setDynamicProperty('solat_logout_time', mockLogoutTime.toString());

    // Set login/spawn time to 15 minutes after start (which is >= 10 mins after start)
    const mockLoginTime = startTimeVal + (15 * 60 * 1000);
    setMockTime(new Date(mockLoginTime).toISOString());

    // Trigger Spawn
    mockState.addedItems = []; // reset added items check
    const spawnEvent = { player: trackingPlayer, initialSpawn: true };
    mockState.playerSpawnSubscribe(spawnEvent);

    if (mockState.addedItems.length !== 1) {
        throw new Error(`Expected 1 item added to player inventory, got ${mockState.addedItems.length}`);
    }
    const rewardedItem = mockState.addedItems[0].itemStack;
    if (rewardedItem.typeId !== 'minecraft:experience_bottle' || rewardedItem.amount !== 10) {
        throw new Error(`Invalid reward given: type=${rewardedItem.typeId}, amount=${rewardedItem.amount}`);
    }

    // Dynamic property for tracking must be cleared
    const clearedTracking = trackingPlayer.getDynamicProperty('solat_tracking');
    if (clearedTracking !== undefined) {
        throw new Error("Expected solat_tracking property to be cleared after reward check");
    }

    // ----------------------------------------------------
    // Test Case 10: Spawn/Login Hook Ineligibility (Not all warnings received)
    // ----------------------------------------------------
    console.log("Test Case 10: Ineligible player (missing warnings) spawn does not award bottles...");
    const badTrackingPlayer = addMockPlayer("BadSteve");
    // Missing alert 5
    const badTrackingData = { prayer: "Asr", date: "2026-07-06", alerts: [30, 10], startTime: startTimeVal };
    badTrackingPlayer.setDynamicProperty('solat_tracking', JSON.stringify(badTrackingData));
    badTrackingPlayer.setDynamicProperty('solat_logout_time', mockLogoutTime.toString());

    mockState.addedItems = [];
    mockState.playerSpawnSubscribe({ player: badTrackingPlayer, initialSpawn: true });
    if (mockState.addedItems.length !== 0) {
        throw new Error("Ineligible player (missing alerts) received rewards");
    }
    // Dynamic property for tracking must STILL be cleared (per step 3: "Clear tracking to avoid duplicate rewards" at the end of the spawn handler)
    if (badTrackingPlayer.getDynamicProperty('solat_tracking') !== undefined) {
        throw new Error("Expected solat_tracking to be cleared even for ineligible player to prevent rerun");
    }

    // ----------------------------------------------------
    // Test Case 11: Spawn/Login Hook Ineligibility (Logged out too late)
    // ----------------------------------------------------
    console.log("Test Case 11: Ineligible player (logged out too late) spawn does not award bottles...");
    const lateLogoutPlayer = addMockPlayer("LateSteve");
    lateLogoutPlayer.setDynamicProperty('solat_tracking', JSON.stringify({ prayer: "Asr", date: "2026-07-06", alerts: [30, 10, 5], startTime: startTimeVal }));
    // Logout 11 minutes after start (> 10 mins window)
    const lateLogoutTime = startTimeVal + (11 * 60 * 1000);
    lateLogoutPlayer.setDynamicProperty('solat_logout_time', lateLogoutTime.toString());

    mockState.addedItems = [];
    mockState.playerSpawnSubscribe({ player: lateLogoutPlayer, initialSpawn: true });
    if (mockState.addedItems.length !== 0) {
        throw new Error("Ineligible player (logged out too late) received rewards");
    }
    if (lateLogoutPlayer.getDynamicProperty('solat_tracking') !== undefined) {
        throw new Error("Expected solat_tracking to be cleared");
    }

    // ----------------------------------------------------
    // Test Case 12: Spawn/Login Hook Ineligibility (Logged back in too early)
    // ----------------------------------------------------
    console.log("Test Case 12: Ineligible player (logged back in too early) spawn does not award bottles...");
    const earlyLoginPlayer = addMockPlayer("EarlySteve");
    earlyLoginPlayer.setDynamicProperty('solat_tracking', JSON.stringify({ prayer: "Asr", date: "2026-07-06", alerts: [30, 10, 5], startTime: startTimeVal }));
    earlyLoginPlayer.setDynamicProperty('solat_logout_time', mockLogoutTime.toString());
    // Log back in 9 minutes after start (< 10 mins window)
    const earlyLoginTime = startTimeVal + (9 * 60 * 1000);
    setMockTime(new Date(earlyLoginTime).toISOString());

    mockState.addedItems = [];
    mockState.playerSpawnSubscribe({ player: earlyLoginPlayer, initialSpawn: true });
    if (mockState.addedItems.length !== 0) {
        throw new Error("Ineligible player (logged back in too early) received rewards");
    }
    if (earlyLoginPlayer.getDynamicProperty('solat_tracking') !== undefined) {
        throw new Error("Expected solat_tracking to be cleared");
    }

    restoreDate();
    console.log("PASS: All index.js alerts and ticking logic tests succeeded!");
}

runTests().catch(err => {
    restoreDate();
    console.error("FAIL:", err);
    process.exit(1);
});
