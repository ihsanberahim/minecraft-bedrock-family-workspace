# SolatAlerts Short Messages & Prayer Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify SolatAlerts behavior pack to shorten messages and award 10 XP bottles to players who go offline for at least 10 minutes starting at prayer time.

**Architecture:** Use player dynamic properties (`solat_tracking`, `solat_logout_time`) to persist prayer warning attendance and logout time. Hook into playerLeave and playerSpawn events to calculate eligibility and add items.

**Tech Stack:** Minecraft Bedrock Server Scripting API (@minecraft/server v1.15.0), Node.js for tests.

## Global Constraints
- Target timezone is Kuala Lumpur (UTC+8).
- Reward is exactly 10 Experience Bottles (vanilla `minecraft:experience_bottle`).
- Eligibility window: logout before or at $T_{start} + 10$ minutes, login at or after $T_{start} + 10$ minutes.

---

### Task 1: Shorten Alert Messages & Implement getPrayerTimestamp Helper

**Files:**
- Modify: `behavior_packs/SolatAlerts/scripts/index.js`
- Modify: `behavior_packs/SolatAlerts/scripts/prayertimes.js`

**Interfaces:**
- Consumes: None
- Produces: `getPrayerTimestamp(date, decimalHours, timezone)` returning epoch milliseconds or null.

- [ ] **Step 1: Implement getPrayerTimestamp in prayertimes.js**
  Add the helper function to `behavior_packs/SolatAlerts/scripts/prayertimes.js`:
  ```javascript
  export function getPrayerTimestamp(date, decimalHours, timezone) {
      if (decimalHours === null || isNaN(decimalHours)) return null;
      const localTimeMs = date.getTime() + (timezone * 60 * 60 * 1000);
      const localDate = new Date(localTimeMs);
      const y = localDate.getUTCFullYear();
      const m = localDate.getUTCMonth();
      const d = localDate.getUTCDate();
      const localDayStartUTC = Date.UTC(y, m, d);
      return localDayStartUTC + (decimalHours * 3600000) - (timezone * 3600000);
  }
  ```
  Ensure it is exported.

- [ ] **Step 2: Update index.js reminding and starting alert formats**
  Update the broadcast messages in `behavior_packs/SolatAlerts/scripts/index.js`:
  ```javascript
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
  ```

- [ ] **Step 3: Run existing tests to verify failure**
  Run tests: `node E:\minecraft-bedrock-server-local\tests\test_index.js`
  Expected: Failure because tests assert the old text format.

- [ ] **Step 4: Update test assertions in test_index.js and run them**
  Modify the text assertions in `tests/test_index.js`:
  - Change `.includes("30 minutes remaining")` to `.includes("in 30m")` or similar.
  - Change `.includes("started")` to check the updated message.
  Run: `node E:\minecraft-bedrock-server-local\tests\test_index.js`
  Expected: PASS.

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git -C E:\minecraft-bedrock-server-local add behavior_packs/SolatAlerts/scripts/index.js behavior_packs/SolatAlerts/scripts/prayertimes.js tests/test_index.js
  git -C E:\minecraft-bedrock-server-local commit -m "feat: shorten alert messages and add timestamp helper"
  ```

---

### Task 2: Implement Warning Tracking and Logout/Spawn Hooks

**Files:**
- Modify: `behavior_packs/SolatAlerts/scripts/index.js`

**Interfaces:**
- Consumes: `getPrayerTimestamp(date, decimalHours, timezone)`

- [ ] **Step 1: Update warning checker to update `solat_tracking` property**
  In the warning ticker loop of `behavior_packs/SolatAlerts/scripts/index.js`, when a warning reminder (30, 10, or 5 mins) fires, update the dynamic property of online players:
  ```javascript
  // Inside warning block where broadcastReminder is called:
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
  ```

- [ ] **Step 2: Add Leave Hook**
  Subscribe to player leave events in `behavior_packs/SolatAlerts/scripts/index.js` to store the logout timestamp:
  ```javascript
  world.beforeEvents.playerLeave.subscribe(event => {
      try {
          event.player.setDynamicProperty('solat_logout_time', Date.now().toString());
      } catch (e) {
          console.error("Error setting logout time: ", e);
      }
  });
  ```

- [ ] **Step 3: Add Spawn/Login Hook to check eligibility & award reward**
  Import `ItemStack` at the top of `behavior_packs/SolatAlerts/scripts/index.js`:
  ```javascript
  import { system, world, ItemStack } from '@minecraft/server';
  ```
  Subscribe to player spawn events to process eligibility and award bottles:
  ```javascript
  world.afterEvents.playerSpawn.subscribe(event => {
      const player = event.player;
      if (!event.initialSpawn) return; // Only process on first login/join

      try {
          const rawTracking = player.getDynamicProperty('solat_tracking');
          const rawLogout = player.getDynamicProperty('solat_logout_time');
          if (!rawTracking || !rawLogout) return;

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
          
          // Clear tracking to avoid duplicate rewards
          player.setDynamicProperty('solat_tracking', undefined);
      } catch (e) {
          console.error("Error processing login reward: ", e);
      }
  });
  ```

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git -C E:\minecraft-bedrock-server-local add behavior_packs/SolatAlerts/scripts/index.js
  git -C E:\minecraft-bedrock-server-local commit -m "feat: implement warning tracking and login/logout hooks"
  ```

---

### Task 3: Implement Automated Tests for Tracker and Reward

**Files:**
- Modify: `tests/test_index.js`

- [ ] **Step 1: Write test case for offline prayer reward eligibility**
  Add mock support for dynamic properties and events to `tests/test_index.js` if not already present, and test all eligibility logic:
  - Test case: Player receives 30m, 10m, and 5m warning, logs out, logs back in after 10 mins. Assert `ItemStack` added to inventory.
  - Test case: Player logs in too early (<10 mins). Assert no reward.
  - Test case: Player missed 30m warning. Assert no reward.

- [ ] **Step 2: Run tests**
  Run: `node E:\minecraft-bedrock-server-local\tests\test_index.js`
  Expected: PASS.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git -C E:\minecraft-bedrock-server-local add tests/test_index.js
  git -C E:\minecraft-bedrock-server-local commit -m "test: add tests for offline prayer reward system"
  ```
