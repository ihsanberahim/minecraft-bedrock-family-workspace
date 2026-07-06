import { calculatePrayerTimes, formatTime, getLocalDecimalHours, getLocalDateString } from '../behavior_packs/SolatAlerts/scripts/prayertimes.js';

// Coordinates for Kuala Lumpur
const LAT = 3.1390;
const LON = 101.6869;
const TZ = 8;

function runTests() {
    console.log("Running prayer times calculations test...");
    
    // July 6, 2026
    const testDate = new Date(Date.UTC(2026, 6, 6, 4, 0, 0)); // July 6
    const times = calculatePrayerTimes(testDate, LAT, LON, TZ);
    
    console.log("Calculated Times for July 6, 2026:");
    console.log(`Fajr: ${formatTime(times.fajr)}`);
    console.log(`Dhuhr: ${formatTime(times.dhuhr)}`);
    console.log(`Asr: ${formatTime(times.asr)}`);
    console.log(`Maghrib: ${formatTime(times.maghrib)}`);
    console.log(`Isha: ${formatTime(times.isha)}`);

    // Verify Dhuhr is around 13:10 to 13:25
    if (times.dhuhr < 13.1 || times.dhuhr > 13.4) {
        throw new Error("FAIL: Dhuhr time is outside reasonable range.");
    }
    // Verify Asr is around 16:30 to 16:55
    if (times.asr < 16.5 || times.asr > 16.9) {
        throw new Error("FAIL: Asr time is outside reasonable range.");
    }
    // Verify Maghrib is around 19:15 to 19:35
    if (times.maghrib < 19.2 || times.maghrib > 19.6) {
        throw new Error("FAIL: Maghrib time is outside reasonable range.");
    }
    
    // Test formatTime edge cases
    console.log("Testing formatTime...");
    if (formatTime(null) !== "N/A") throw new Error("FAIL: formatTime(null) should be N/A");
    if (formatTime(NaN) !== "N/A") throw new Error("FAIL: formatTime(NaN) should be N/A");
    if (formatTime(12.0) !== "12:00") throw new Error(`FAIL: formatTime(12.0) got ${formatTime(12.0)}`);
    if (formatTime(0.0) !== "00:00") throw new Error(`FAIL: formatTime(0.0) got ${formatTime(0.0)}`);
    if (formatTime(23.99) !== "23:59") throw new Error(`FAIL: formatTime(23.99) got ${formatTime(23.99)}`);
    if (formatTime(12.5) !== "12:30") throw new Error(`FAIL: formatTime(12.5) got ${formatTime(12.5)}`);

    // Test getLocalDecimalHours
    console.log("Testing getLocalDecimalHours...");
    // Let's create a date corresponding to July 6, 2026 12:00:00 UTC (noon UTC)
    const testDateHours = new Date(Date.UTC(2026, 6, 6, 12, 0, 0));
    // For TZ=8, local time is 20:00:00, so decimal hours should be 20.0
    const localHoursTZ8 = getLocalDecimalHours(testDateHours, 8);
    if (Math.abs(localHoursTZ8 - 20.0) > 0.001) {
        throw new Error(`FAIL: getLocalDecimalHours (TZ=8) should be 20.0, got ${localHoursTZ8}`);
    }
    // For TZ=-5 (EST), local time is 07:00:00, so decimal hours should be 7.0
    const localHoursTZMinus5 = getLocalDecimalHours(testDateHours, -5);
    if (Math.abs(localHoursTZMinus5 - 7.0) > 0.001) {
        throw new Error(`FAIL: getLocalDecimalHours (TZ=-5) should be 7.0, got ${localHoursTZMinus5}`);
    }

    // Test getLocalDateString
    console.log("Testing getLocalDateString...");
    // Let's create a date near midnight UTC: July 6, 2026 23:00:00 UTC
    const dateNearMidnight = new Date(Date.UTC(2026, 6, 6, 23, 0, 0));
    // For TZ=8, local time is July 7, 2026 07:00:00, so date string should be "2026-07-07"
    const dateStrTZ8 = getLocalDateString(dateNearMidnight, 8);
    if (dateStrTZ8 !== "2026-07-07") {
        throw new Error(`FAIL: getLocalDateString (TZ=8) should be 2026-07-07, got ${dateStrTZ8}`);
    }
    // For TZ=-5, local time is July 6, 2026 18:00:00, so date string should be "2026-07-06"
    const dateStrTZMinus5 = getLocalDateString(dateNearMidnight, -5);
    if (dateStrTZMinus5 !== "2026-07-06") {
        throw new Error(`FAIL: getLocalDateString (TZ=-5) should be 2026-07-06, got ${dateStrTZMinus5}`);
    }

    console.log("PASS: All sanity checks succeeded!");
}

runTests();
