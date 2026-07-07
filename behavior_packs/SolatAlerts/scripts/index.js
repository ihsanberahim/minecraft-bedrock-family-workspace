import { system, world, ItemStack } from '@minecraft/server';
import { calculatePrayerTimes, formatTime, getLocalDecimalHours, getLocalDateString, getPrayerTimestamp } from './prayertimes.js';

const LATITUDE = 3.1390;
const LONGITUDE = 101.6869;
const TIMEZONE = 8; // UTC+8 for Kuala Lumpur

// Tracks fired alerts for the day to avoid duplicates
// Key format: YYYY-MM-DD-PRAYER-ALERT_TYPE
// Example: "2026-07-06-Asr-30" or "2026-07-06-Maghrib-0"
const firedAlerts = new Set();

function broadcastReminder(prayerName, minutesRemaining, formattedTime) {
    const message = `§e${prayerName} in ${minutesRemaining}m (${formattedTime})`;
    for (const player of world.getAllPlayers()) {
        player.sendMessage(message);
    }
}

function broadcastStartAlert(prayerName) {
    const chatMsg = `§a${prayerName} started.`;
    const title = `§aTime for ${prayerName}`;
    const subtitle = `§7Please take a break to pray`;

    for (const player of world.getAllPlayers()) {
        player.sendMessage(chatMsg);
        player.onScreenDisplay.setTitle(title, { subtitle: subtitle });
        player.playSound('random.levelup', { volume: 0.5, pitch: 1.0 });
    }
}

function checkPrayerTimes() {
    try {
        const now = new Date();
        const dateStr = getLocalDateString(now, TIMEZONE);
        const currentHours = getLocalDecimalHours(now, TIMEZONE);

        // Get prayer times for today
        const times = calculatePrayerTimes(now, LATITUDE, LONGITUDE, TIMEZONE);
        const prayerList = [
            { name: "Fajr", time: times.fajr },
            { name: "Dhuhr", time: times.dhuhr },
            { name: "Asr", time: times.asr },
            { name: "Maghrib", time: times.maghrib },
            { name: "Isha", time: times.isha }
        ];

        for (const prayer of prayerList) {
            if (prayer.time === null) continue;

            const diffHours = prayer.time - currentHours;
            const diffMinutes = Math.floor(diffHours * 60 + 0.5);

            // Check warning intervals (30, 10, 5)
            const warningIntervals = [30, 10, 5];
            for (const mins of warningIntervals) {
                if (diffMinutes === mins) {
                    const alertKey = `${dateStr}-${prayer.name}-${mins}`;
                    if (!firedAlerts.has(alertKey)) {
                        firedAlerts.add(alertKey);
                        broadcastReminder(prayer.name, mins, formatTime(prayer.time));
                    }
                }
            }

            // Check start time (0 minutes or crossed over up to 1 minute to avoid missing)
            const diffMinsExact = diffHours * 60;
            if (diffMinsExact <= 0 && diffMinsExact >= -1.0) {
                const alertKey = `${dateStr}-${prayer.name}-0`;
                if (!firedAlerts.has(alertKey)) {
                    firedAlerts.add(alertKey);
                    broadcastStartAlert(prayer.name);
                }
            }
        }

        // Clean up old alerts from previous days to keep Set memory bounded
        for (const key of firedAlerts) {
            if (!key.startsWith(dateStr)) {
                firedAlerts.delete(key);
            }
        }

    } catch (error) {
        console.error("Error in Solat alerts tick: ", error);
    }
}

// Tick loop: execute check every 200 ticks (10 seconds)
system.runInterval(() => {
    checkPrayerTimes();
}, 200);



console.warn("Solat Alerts Pack loaded successfully!");
