# Design Spec: SolatAlerts Shorter Messages & Prayer Rewards

**Date:** 2026-07-06  
**Status:** Approved  

---

## 1. Goal & Context

The goal is to modify the existing `SolatAlerts` behavior pack to:
1. Shorten the chat alert text messages to make them cleaner and less obtrusive.
2. Encourage real-life prayer breaks by offering a reward of 10 vanilla Experience Bottles (`minecraft:experience_bottle`) to players who:
   - Are online to receive the 30-minute, 10-minute, and 5-minute pre-prayer warnings.
   - Go offline (log out) around the start of the prayer.
   - Remain offline for at least 10 minutes from the prayer start time.
   - Log back in later (reward granted on spawn/login).

---

## 2. Proposed Changes

### A. Shorter Alert Messages
*   **Warning reminders (30, 10, 5 mins before start):**
    `§e[Solat] ${prayerName} in ${minutesRemaining}m (${formattedTime})`
*   **Prayer Start Alert (0 mins / start of prayer):**
    `§a[Solat] ${prayerName} started.`

---

### B. Tracking Player Eligibility
We will track player alert attendance and logout details using native Minecraft player Dynamic Properties:

1.  **Dynamic Properties Table:**
    | Property Key | Type | Description |
    | :--- | :--- | :--- |
    | `solat_tracking` | String (JSON) | Tracks the current prayer name, date, and received warnings list. E.g., `{"prayer":"Asr","date":"2026-07-06","alerts":[30,10,5]}` |
    | `solat_logout_time` | String/Number | Epoch millisecond timestamp of the player's last logout. |

2.  **Tracking Alerts:**
    When the warning ticker loop in `index.js` sends a 30m, 10m, or 5m warning:
    - For each online player, inspect their `solat_tracking` property.
    - If the prayer name or date is different, reset the property.
    - Append the warning interval (30, 10, or 5) to the `alerts` array if not already present.
    - Re-save `solat_tracking`.

3.  **Logout Event (`world.beforeEvents.playerLeave`):**
    - Capture the exact logout timestamp using `Date.now()`.
    - Save this value to the player's `solat_logout_time` dynamic property.

4.  **Spawn Event (`world.afterEvents.playerSpawn`):**
    - Retrieve the player's `solat_tracking` and `solat_logout_time`.
    - Check if they are eligible:
      - Has `alerts` containing all three warning intervals: `30`, `10`, and `5`.
      - Let $T_{start}$ be the exact timestamp (in milliseconds) of the prayer start on that day.
      - Let $T_{logout}$ be the player's `solat_logout_time`.
      - Let $T_{login}$ be `Date.now()`.
      - **Condition:**
        1. Player has received all 3 warnings (`30, 10, 5`) for the tracked prayer.
        2. $T_{logout} \le T_{start} + 10 \text{ minutes}$ (logged out before or within 10 minutes of start).
        3. $T_{login} \ge T_{start} + 10 \text{ minutes}$ (logs back in at least 10 minutes after start).
    - If eligible:
      - Award 10 `minecraft:experience_bottle` to the player's inventory (or spawn them at the player's location if inventory is full).
      - Send a message to the player: `§a✦ Thank you for taking a break to pray! You received 10 Experience Bottles. §a✦`
      - Clear/reset `solat_tracking` to prevent double-claiming.

---

## 3. Verification Plan

### Automated Tests
*   Run the suite using `node E:\minecraft-bedrock-server-local\tests\test_index.js`.
*   Update `test_index.js` to assert:
    1. Warning reminders are shortened correctly.
    2. Players receiving 30m, 10m, and 5m warnings are tracked.
    3. Player logout and login times are checked against the prayer start time.
    4. 10 XP bottles are awarded if the player is offline for $\ge 10$ minutes starting from the prayer time.
    5. No bottles are awarded if the offline duration is less than 10 minutes or they missed warnings.

### Manual Verification
*   Log in to the Minecraft server.
*   Wait for the warnings to trigger.
*   Log out when the prayer starts.
*   Wait 10 minutes, log back in, and verify that 10 bottles of enchanting are added to the inventory.
