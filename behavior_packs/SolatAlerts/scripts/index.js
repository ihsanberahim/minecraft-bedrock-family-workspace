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
    const message = `§e[Solat] ${prayerName} in ${minutesRemaining}m (${formattedTime})`;
    for (const player of world.getAllPlayers()) {
        player.sendMessage(message);
    }
}

function broadcastStartAlert(prayerName) {
    const chatMsg = `§a[Solat] ${prayerName} started.`;
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
                        // Update player warning tracking properties
                        for (const player of world.getAllPlayers()) {
                            let tracking = { prayer: prayer.name, date: dateStr, alerts: [], startTime: getPrayerTimestamp(now, prayer.time, TIMEZONE) };
                            try {
                                const raw = player.getDynamicProperty('solat_tracking');
                                if (raw) {
                                    const parsed = JSON.parse(raw);
                                    if (parsed.prayer === prayer.name && parsed.date === dateStr) {
                                        tracking = parsed;
                                    }
                                }
                            } catch (e) {}

                            if (!tracking.alerts.includes(mins)) {
                                tracking.alerts.push(mins);
                                player.setDynamicProperty('solat_tracking', JSON.stringify(tracking));
                            }
                        }
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

// Leave Hook: store logout timestamp
world.beforeEvents.playerLeave.subscribe(event => {
    try {
        event.player.setDynamicProperty('solat_logout_time', Date.now().toString());
    } catch (e) {
        console.error("Error setting logout time: ", e);
    }
});

// Spawn/Login Hook: check eligibility & award reward
world.afterEvents.playerSpawn.subscribe(event => {
    const player = event.player;
    if (!event.initialSpawn) return; // Only process on first login/join

    try {
        const rawTracking = player.getDynamicProperty('solat_tracking');
        const rawLogout = player.getDynamicProperty('solat_logout_time');
        if (!rawTracking) return;

        // Clear tracking to avoid duplicate rewards/checks
        player.setDynamicProperty('solat_tracking', undefined);

        if (!rawLogout) return;

        const tracking = JSON.parse(rawTracking);
        const logoutTime = parseInt(rawLogout, 10);
        const loginTime = Date.now();

        // Check if player received all 3 alerts (30, 10, 5)
        const receivedAll = [30, 10, 5].every(val => tracking.alerts.includes(val));
        if (!receivedAll) return;

        const startTime = tracking.startTime;
        if (!startTime) return;

        const tenMinsMs = 10 * 60 * 1000;
        // Must log out within 10 minutes of start, and log in at least 10 minutes after start
        if (logoutTime <= startTime + tenMinsMs && loginTime >= startTime + tenMinsMs) {
            // Award 10 experience bottles
            const inventory = player.getComponent('inventory');
            if (inventory && inventory.container) {
                const item = new ItemStack('minecraft:experience_bottle', 10);
                const remaining = inventory.container.addItem(item);
                if (remaining) {
                    player.dimension.spawnItem(remaining, player.location);
                }
                player.sendMessage(`§a✦ Thank you for taking a break to pray! You received 10 Experience Bottles. §a✦`);
                player.playSound('random.levelup', { volume: 0.5, pitch: 1.2 });
            }
        }
    } catch (e) {
        console.error("Error processing login reward: ", e);
    }
});

console.warn("Solat Alerts Pack loaded successfully!");
