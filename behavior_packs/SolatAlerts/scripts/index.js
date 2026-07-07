import { system, world, ItemStack, DynamicPropertiesDefinition } from '@minecraft/server';
import { calculatePrayerTimes, formatTime, getLocalDecimalHours, getLocalDateString, getPrayerTimestamp } from './prayertimes.js';

const LATITUDE = 3.1390;
const LONGITUDE = 101.6869;
const TIMEZONE = 8; // UTC+8 for Kuala Lumpur

// Register dynamic properties for player
world.beforeEvents.worldInitialize.subscribe(event => {
    try {
        const def = new DynamicPropertiesDefinition();
        def.defineString('solat_last_reward', 30);
        event.registerPlayerDynamicProperties(def);
    } catch (e) {
        console.error("Error registering player dynamic properties:", e);
    }
});

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

world.afterEvents.playerSpawn.subscribe(event => {
    const player = event.player;
    if (!event.initialSpawn) return; // Only trigger when first joining the server

    try {
        const now = new Date();
        const dateStr = getLocalDateString(now, TIMEZONE);

        // Get prayer times for today
        const times = calculatePrayerTimes(now, LATITUDE, LONGITUDE, TIMEZONE);
        const prayerList = [
            { name: "Fajr", time: times.fajr },
            { name: "Dhuhr", time: times.dhuhr },
            { name: "Asr", time: times.asr },
            { name: "Maghrib", time: times.maghrib },
            { name: "Isha", time: times.isha }
        ];

        // Determine the latest prayer that started
        let latestPrayer = null;
        let latestStartTime = 0;

        const currentMs = now.getTime();

        for (const prayer of prayerList) {
            const startTimeMs = getPrayerTimestamp(now, prayer.time, TIMEZONE);
            if (startTimeMs && currentMs >= startTimeMs) {
                if (startTimeMs > latestStartTime) {
                    latestStartTime = startTimeMs;
                    latestPrayer = prayer;
                }
            }
        }

        if (!latestPrayer) return;

        // Check if current time is at least 10 minutes past the start time
        const tenMinutesMs = 10 * 60 * 1000;
        if (currentMs >= latestStartTime + tenMinutesMs) {
            // Check if already rewarded for this prayer on this day
            const expectedRewardKey = `${latestPrayer.name}-${dateStr}`;
            const lastReward = player.getDynamicProperty('solat_last_reward');

            if (lastReward !== expectedRewardKey) {
                // Award 10 experience bottles
                const inventory = player.getComponent('inventory');
                if (inventory && inventory.container) {
                    const item = new ItemStack('minecraft:experience_bottle', 10);
                    const remaining = inventory.container.addItem(item);
                    if (remaining) {
                        player.dimension.spawnItem(remaining, player.location);
                    }
                    player.sendMessage(`§a+10 XP Bottles (prayer break).`);
                    player.playSound('random.levelup', { volume: 0.5, pitch: 1.2 });
                    player.setDynamicProperty('solat_last_reward', expectedRewardKey);
                }
            }
        }
    } catch (e) {
        console.error("Error in player join reward processing:", e);
    }
});

console.warn("Solat Alerts Pack loaded successfully!");

