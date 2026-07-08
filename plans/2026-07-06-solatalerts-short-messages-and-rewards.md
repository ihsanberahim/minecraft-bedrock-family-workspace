# SolatAlerts Simplified Messages & Join Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify SolatAlerts to remove the `[Solat]` prefix from all notifications, clean up the old offline tracking code, and implement a join-based reward system that awards 10 Experience Bottles to players who join the server $\ge 10$ minutes after a prayer starts (once per prayer per day).

**Architecture:** Hook into the `playerSpawn` event on `initialSpawn: true`. Read player dynamic property `solat_last_reward` to prevent duplicate claiming.

**Tech Stack:** Minecraft Bedrock Server Scripting API (@minecraft/server v1.15.0), Node.js for tests.

## Global Constraints
- Target timezone is Kuala Lumpur (UTC+8).
- Reward is exactly 10 Experience Bottles (vanilla `minecraft:experience_bottle`).
- Reward congratulate message is `§a+10 XP Bottles (prayer break).`
- No `[Solat]` prefix in any alert messages.

---

### Task 1: Remove [Solat] Prefix and Clean Up Old Hooks

**Files:**
- Modify: `behavior_packs/SolatAlerts/scripts/index.js`

**Interfaces:**
- Consumes: None
- Produces: Cleaned `index.js` without the player leave hook or `solat_tracking` warning updates.

- [ ] **Step 1: Clean up warning updates in warningIntervals loop**
  In `behavior_packs/SolatAlerts/scripts/index.js`, remove any code updating `solat_tracking` dynamic property.
  Modify `broadcastReminder` and `broadcastStartAlert` to remove the `[Solat]` prefix:
  ```javascript
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
  ```

- [ ] **Step 2: Remove playerLeave hook**
  Remove the `world.beforeEvents.playerLeave.subscribe` listener completely.

- [ ] **Step 3: Run existing tests to verify failures**
  Run: `node E:\minecraft-bedrock-server-local\tests\test_index.js`
  Expected: FAIL on message assertions containing `[Solat]` and tests checking the old player leave hook.

- [ ] **Step 4: Update tests to match new message formats and clean old leave tests**
  In `tests/test_index.js`, update the regex or string checks to match the new formats without `[Solat]`. Remove references to `playerLeaveSubscribe`.
  Run: `node E:\minecraft-bedrock-server-local\tests\test_index.js`
  Expected: PASS on Test Cases 1-6 (Test Cases 7-12 will still fail or need removal, which we will address in Task 3).

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git -C E:\minecraft-bedrock-server-local add behavior_packs/SolatAlerts/scripts/index.js tests/test_index.js
  git -C E:\minecraft-bedrock-server-local commit -m "feat: remove [Solat] prefix and clean old leave hook"
  ```

---

### Task 2: Implement Join-Based Reward System

**Files:**
- Modify: `behavior_packs/SolatAlerts/scripts/index.js`

**Interfaces:**
- Consumes: `calculatePrayerTimes`, `getPrayerTimestamp`, `getLocalDateString`
- Produces: Updated spawn handler in `index.js` awarding players who join late.

- [ ] **Step 1: Re-implement playerSpawn listener with join reward logic**
  In `behavior_packs/SolatAlerts/scripts/index.js`, replace the playerSpawn listener with the following:
  ```javascript
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
                  }
                  player.setDynamicProperty('solat_last_reward', expectedRewardKey);
              }
          }
      } catch (e) {
          console.error("Error in player join reward processing:", e);
      }
  });
  ```

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git -C E:\minecraft-bedrock-server-local add behavior_packs/SolatAlerts/scripts/index.js
  git -C E:\minecraft-bedrock-server-local commit -m "feat: implement join-based solat reward system"
  ```

---

### Task 3: Implement Automated Tests for Join-Based Rewards

**Files:**
- Modify: `tests/test_index.js`

- [ ] **Step 1: Write test cases in test_index.js**
  Remove the old Test Cases 7-12 and replace them with:
  - **Test Case 7 (Eligible join):** Player joins 15 minutes after Asr starts. Verify 10 Experience Bottles are added to their inventory and `solat_last_reward` is updated to `"Asr-2026-07-06"`.
  - **Test Case 8 (Ineligible join - too early):** Player joins 5 minutes after Asr starts. Verify no bottles are awarded.
  - **Test Case 9 (Ineligible join - already claimed):** Player joins 15 minutes after Asr starts, but has `solat_last_reward` set to `"Asr-2026-07-06"`. Verify no bottles are awarded.

- [ ] **Step 2: Run tests**
  Run: `node E:\minecraft-bedrock-server-local\tests\test_index.js`
  Expected: PASS on all test cases (1 to 9).

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git -C E:\minecraft-bedrock-server-local add tests/test_index.js
  git -C E:\minecraft-bedrock-server-local commit -m "test: implement tests for join-based prayer rewards"
  ```
