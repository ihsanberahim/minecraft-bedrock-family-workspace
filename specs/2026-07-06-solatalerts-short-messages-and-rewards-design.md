# Design Spec: SolatAlerts Shorter Messages & Prayer Rewards

**Date:** 2026-07-06 (Updated 2026-07-07)  
**Status:** Approved  

---

## 1. Goal & Context

The goal is to modify the `SolatAlerts` behavior pack to:
1. Shorten chat alerts and remove the `[Solat]` prefix to make notifications less intrusive.
2. Offer a reward of 10 vanilla Experience Bottles (`minecraft:experience_bottle`) to players who log in or join the server at least 10 minutes after a prayer starts, up to once per prayer per day.

---

## 2. Proposed Changes

### A. Message Formats (Without `[Solat]` Prefix)
*   **Warning reminders (30, 10, 5 mins before start):**
    `§e${prayerName} in ${minutesRemaining}m (${formattedTime})`
*   **Prayer Start Alert (0 mins / start of prayer):**
    `§a${prayerName} started.`
*   **Reward congratulations message:**
    `§a+10 XP Bottles (prayer break).`

---

### B. Login/Join Reward Logic
We will use a player dynamic property to track rewards:

1.  **Dynamic Property:**
    | Property Key | Type | Description |
    | :--- | :--- | :--- |
    | `solat_last_reward` | String | Format: `"{PRAYER_NAME}-{DATE}"`. Tracks the last prayer reward claimed (e.g., `"Asr-2026-07-07"`). |

2.  **Spawn Event (`world.afterEvents.playerSpawn`):**
    - Trigger when a player joins the server (`initialSpawn: true`).
    - Calculate today's prayer times for Kuala Lumpur (UTC+8).
    - Find the **latest prayer** that has already started relative to the current time.
    - Check if the current time is **at least 10 minutes after** that prayer's start time.
    - Read the player's `solat_last_reward` dynamic property.
    - If it is not equal to `"{PRAYER_NAME}-{DATE}"` (meaning they haven't received it yet for this prayer):
      - Award 10 `minecraft:experience_bottle` to the player's inventory (or spawn them at their location if full).
      - Send chat message: `§a+10 XP Bottles (prayer break).`
      - Play levelup sound `random.levelup` to the player.
      - Save `solat_last_reward` to `"{PRAYER_NAME}-{DATE}"`.

---

## 3. Verification Plan

### Automated Tests
*   Run tests using `node E:\minecraft-bedrock-server-local\tests\test_index.js`.
*   Assert:
    1. Warning reminders and start alerts have no `[Solat]` prefix.
    2. Players joining/spawning $\ge 10$ minutes after a prayer start receive 10 XP bottles if they haven't claimed it yet.
    3. Players joining too early (<10 mins past start) do not receive the reward.
    4. Players joining multiple times during the same prayer window only receive the reward once.
