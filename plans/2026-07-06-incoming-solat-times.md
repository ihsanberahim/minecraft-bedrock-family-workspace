# Incoming Solat Times Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-world prayer (solat) time reminder system for Kuala Lumpur (UTC+8) on the Minecraft Bedrock Server, replacing the unneeded "Days played" HUD functionality with timely alerts.

**Architecture:** A new standalone Behavior Pack (`SolatAlerts`) containing a dynamic mathematical calculation engine for Islamic prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) based on Kuala Lumpur coordinates. A background ticking loop checks the current time in UTC+8 every 10 seconds, broadcasting reminders at 30, 10, and 5 minutes before each prayer, and a title/sound alert at the prayer time itself.

**Tech Stack:** Minecraft Bedrock Scripting API (`@minecraft/server` v1.15.0), Node.js (for offline math testing).

## Global Constraints
- Target Timezone: UTC+8 (Asia/Kuala_Lumpur)
- Latitude: 3.1390 N, Longitude: 101.6869 E
- Fajr Angle: 18.0°, Isha Angle: 18.0°
- Asr Method: Shafi'i shadow factor = 1
- Maghrib/Dhuhr offset buffer: 2 minutes
- Alerts: 30m, 10m, 5m before (chat warning); 0m start (Title, Subtitle, Chat, and Sound)

---

### Task 1: Scaffolding the SolatAlerts Behavior Pack

**Files:**
- Create: `behavior_packs/SolatAlerts/manifest.json`

**Interfaces:**
- Consumes: None
- Produces: A registered Minecraft Bedrock Behavior Pack header and script module configuration.

- [ ] **Step 1: Create the Behavior Pack manifest.json**

Create `behavior_packs/SolatAlerts/manifest.json` with the following content:
```json
{
    "format_version": 2,
    "header": {
        "name": "Solat Alerts",
        "description": "Calculates and alerts real-world prayer times for Kuala Lumpur (UTC+8).",
        "uuid": "8f3e2d6b-7c1a-4d9e-a8f2-1b3c4d5e6f7a",
        "version": [1, 0, 0],
        "min_engine_version": [ 1, 21, 20 ]
    },
    "modules": [
        {
            "type": "script",
            "language": "javascript",
            "uuid": "9f4e3d7c-8d2b-5e0f-b9a3-2c4d5e6f7a8b",
            "entry": "scripts/index.js",
            "version": [1, 0, 0]
        }
    ],
    "capabilities": [ "script_eval" ],
    "dependencies": [
        {
            "module_name": "@minecraft/server",
            "version": "1.15.0"
        }
    ]
}
```

- [ ] **Step 2: Commit**

```bash
git add behavior_packs/SolatAlerts/manifest.json
git commit -m "feat: scaffold SolatAlerts behavior pack manifest"
```

---

### Task 2: Implementing and Testing the Calculation Engine (`prayertimes.js`)

**Files:**
- Create: `behavior_packs/SolatAlerts/scripts/prayertimes.js`
- Create: `tests/test_prayertimes.js`

**Interfaces:**
- Consumes: None
- Produces: 
  - `calculatePrayerTimes(date, latitude, longitude, timezone)`: returns `{ fajr, dhuhr, asr, maghrib, isha }` as decimal hours
  - `formatTime(decimalHours)`: returns `"HH:MM"`
  - `getLocalDecimalHours(date, timezone)`: returns current time in decimal hours
  - `getLocalDateString(date, timezone)`: returns `"YYYY-MM-DD"`

- [ ] **Step 1: Write the prayer times calculation library**

Create `behavior_packs/SolatAlerts/scripts/prayertimes.js` with the following implementation:
```javascript
// Mathematical helpers
function dtr(deg) { return (deg * Math.PI) / 180.0; }
function rtd(rad) { return (rad * 180.0) / Math.PI; }
function sin(deg) { return Math.sin(dtr(deg)); }
function cos(deg) { return Math.cos(dtr(deg)); }
function tan(deg) { return Math.tan(dtr(deg)); }
function acos(val) { return rtd(Math.acos(val)); }
function atan(val) { return rtd(Math.atan(val)); }

// Calculate prayer times
// Returns decimal hours for each prayer time
export function calculatePrayerTimes(date, latitude, longitude, timezone) {
    // Determine the calendar day of the year (1-366) in UTC+8 timezone
    const localTimeMs = date.getTime() + (timezone * 60 * 60 * 1000);
    const localDate = new Date(localTimeMs);
    const localStart = new Date(Date.UTC(localDate.getUTCFullYear(), 0, 0));
    const diff = localTimeMs - localStart.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const d = Math.floor(diff / oneDay);

    // Declination and Equation of Time calculations
    const B = (360.0 * (d - 81)) / 365.0;
    const EoT = 9.87 * sin(2 * B) - 7.53 * cos(B) - 1.5 * sin(B); // in minutes
    const declination = 23.45 * sin((360.0 * (d - 80)) / 370.0); // in degrees

    // Solar transit (noon)
    const transit = 12.0 - longitude / 15.0 + timezone - EoT / 60.0;

    // Hour angle helper
    function getHourAngle(altitude) {
        const val = (sin(altitude) - sin(latitude) * sin(declination)) / (cos(latitude) * cos(declination));
        if (val < -1 || val > 1) return null;
        return acos(val) / 15.0;
    }

    // 1. Fajr (18 degrees solar depression)
    const hFajr = getHourAngle(-18.0);
    const fajr = hFajr !== null ? transit - hFajr : null;

    // 2. Dhuhr (solar transit + 2 minutes buffer)
    const dhuhr = transit + (2.0 / 60.0);

    // 3. Asr (shadow factor = 1)
    const g = atan(1.0 / (1.0 + tan(Math.abs(latitude - declination))));
    const hAsr = getHourAngle(g);
    const asr = hAsr !== null ? transit + hAsr : null;

    // 4. Maghrib / Sunset (0.833 degrees solar depression + 2 minutes buffer)
    const hSunset = getHourAngle(-0.833);
    const maghrib = hSunset !== null ? transit + hSunset + (2.0 / 60.0) : null;

    // 5. Isha (18 degrees solar depression)
    const hIsha = getHourAngle(-18.0);
    const isha = hIsha !== null ? transit + hIsha : null;

    return { fajr, dhuhr, asr, maghrib, isha };
}

export function formatTime(decimalHours) {
    if (decimalHours === null || isNaN(decimalHours)) return "N/A";
    const totalMinutes = Math.floor(decimalHours * 60 + 0.5);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getLocalDecimalHours(date, timezone) {
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const localDate = new Date(utcMs + (timezone * 60 * 60 * 1000));
    return localDate.getHours() + localDate.getMinutes() / 60.0 + localDate.getSeconds() / 3600.0;
}

export function getLocalDateString(date, timezone) {
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const localDate = new Date(utcMs + (timezone * 60 * 60 * 1000));
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, '0');
    const d = String(localDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
```

- [ ] **Step 2: Create a unit test file for Node.js**

Create `tests/test_prayertimes.js` with tests asserting correct calculation for a specific day (July 6, 2026):
```javascript
import { calculatePrayerTimes, formatTime } from '../behavior_packs/SolatAlerts/scripts/prayertimes.js';

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
    
    console.log("PASS: All sanity checks succeeded!");
}

runTests();
```

- [ ] **Step 3: Run the tests**

Run: `node tests/test_prayertimes.js`
Expected output:
```text
Running prayer times calculations test...
Calculated Times for July 6, 2026:
...
PASS: All sanity checks succeeded!
```

- [ ] **Step 4: Commit**

```bash
git add behavior_packs/SolatAlerts/scripts/prayertimes.js tests/test_prayertimes.js
git commit -m "feat: implement mathematical prayer times calculation and tests"
```

---

### Task 3: Implementing the Ticking Loop and Alert Dispatcher (`index.js`)

**Files:**
- Create: `behavior_packs/SolatAlerts/scripts/index.js`

**Interfaces:**
- Consumes: `calculatePrayerTimes`, `formatTime`, `getLocalDecimalHours`, `getLocalDateString` from `prayertimes.js`
- Produces: Set interval ticks executing alerts on `@minecraft/server` players.

- [ ] **Step 1: Write index.js with Minecraft Scripting API hooks**

Create `behavior_packs/SolatAlerts/scripts/index.js` with the ticking logic:
```javascript
import { system, world } from '@minecraft/server';
import { calculatePrayerTimes, formatTime, getLocalDecimalHours, getLocalDateString } from './prayertimes.js';

const LATITUDE = 3.1390;
const LONGITUDE = 101.6869;
const TIMEZONE = 8; // UTC+8 for Kuala Lumpur

// Tracks fired alerts for the day to avoid duplicates
// Key format: YYYY-MM-DD-PRAYER-ALERT_TYPE
// Example: "2026-07-06-Asr-30" or "2026-07-06-Maghrib-0"
const firedAlerts = new Set();

function broadcastReminder(prayerName, minutesRemaining, formattedTime) {
    const message = `§e[Solat] ${minutesRemaining} minutes remaining until ${prayerName} (${formattedTime}).`;
    for (const player of world.getAllPlayers()) {
        player.sendMessage(message);
    }
}

function broadcastStartAlert(prayerName) {
    const chatMsg = `§a[Solat] Time for ${prayerName} prayer has started.`;
    const title = `§aTime for ${prayerName}`;
    const subtitle = `§7Please take a break to pray`;

    for (const player of world.getAllPlayers()) {
        // Send Chat
        player.sendMessage(chatMsg);
        // Show Title & Subtitle
        player.onScreenDisplay.setTitle(title);
        player.onScreenDisplay.setSubtitle(subtitle);
        // Play Chime Sound
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
            if (diffMinutes <= 0 && diffMinutes >= -1) {
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
```

- [ ] **Step 2: Commit**

```bash
git add behavior_packs/SolatAlerts/scripts/index.js
git commit -m "feat: implement background loop and Minecraft API player alert dispatching"
```

---

### Task 4: Activating and Verifying the Pack

**Files:**
- Modify: `worlds/Sanad Server/world_behavior_packs.json`

**Interfaces:**
- Consumes: SolatAlerts Behavior Pack
- Produces: Activated Behavior Pack in server worlds runtime.

- [ ] **Step 1: Register behavior pack in Sanad Server configuration**

Read the existing `worlds/Sanad Server/world_behavior_packs.json` and append the new Behavior pack registration details for Solat Alerts (`8f3e2d6b-7c1a-4d9e-a8f2-1b3c4d5e6f7a` version `1.0.0`):
```json
[
    {
        "pack_id": "a0ea6b37-368b-44af-9ffd-8070ad4bcc49",
        "version": [0, 0, 9]
    },
    {
        "pack_id": "5cfa7975-d142-4b77-8495-3bc21ea4b207",
        "version": [1, 0, 0]
    },
    {
        "pack_id": "8f3e2d6b-7c1a-4d9e-a8f2-1b3c4d5e6f7a",
        "version": [1, 0, 0]
    }
]
```

- [ ] **Step 2: Start server to verify script loading**

Run the PowerShell startup script to launch the server and check if the content logs indicate success:
Run: `.\run-server.ps1`
Expected output in console:
`Solat Alerts Pack loaded successfully!`

- [ ] **Step 3: Commit**

```bash
git add "worlds/Sanad Server/world_behavior_packs.json"
git commit -m "chore: enable SolatAlerts behavior pack in Sanad Server world configuration"
```
