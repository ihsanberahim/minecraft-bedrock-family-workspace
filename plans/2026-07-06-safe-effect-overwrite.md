# Safe Effect Overwrite Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix active potion/beacon effect overwriting and downgrading in LevelPerks, update tests to mock `getEffect` and cover all edge cases, and run verification.

**Architecture:** Implement helper function `applyEffectSafely` which uses `player.getEffect` to check existing effects and only overwrites if the current effect is absent, about to expire (duration <= 120 ticks), or has a lower amplifier. Set `EFFECT_DURATION = 120` ticks. Update mock player in tests to support `getEffect` and maintain active effects state.

**Tech Stack:** JavaScript (ES Modules), Minecraft Bedrock Scripting API, Node.js (test harness).

## Global Constraints

- Bedrock's `Entity.addEffect()` overwrites active effects of the same type even if the active effect has a higher amplifier or longer duration.
- Change `EFFECT_DURATION` to `120` (6 seconds).

---

### Task 1: Update LevelPerks Code

**Files:**
- Modify: `behavior_packs/LevelPerks/scripts/index.js`

**Interfaces:**
- Produces: `applyTierEffects(player, tierIndex)` which safely applies perks.
- Produces: `EFFECT_DURATION = 120`.

- [ ] **Step 1: Write `applyEffectSafely` helper and update `applyTierEffects`**
  Modify [index.js](file:///e:/minecraft-bedrock-server-local/behavior_packs/LevelPerks/scripts/index.js) to:
  ```javascript
  function applyEffectSafely(player, effectId, tierEffect) {
      if (!tierEffect) return;
      const active = player.getEffect(effectId);
      const targetAmplifier = tierEffect.amplifier;

      if (!active || 
          active.duration <= EFFECT_DURATION || 
          active.amplifier < targetAmplifier) {
          player.addEffect(effectId, EFFECT_DURATION, { amplifier: targetAmplifier, showParticles: false });
      }
  }

  export function applyTierEffects(player, tierIndex) {
      const tier = TIER_CONFIG[tierIndex];
      applyEffectSafely(player, 'resistance', tier.resistance);
      applyEffectSafely(player, 'regeneration', tier.regen);
  }
  ```
- [ ] **Step 2: Update `EFFECT_DURATION` to `120`**
  Modify [index.js](file:///e:/minecraft-bedrock-server-local/behavior_packs/LevelPerks/scripts/index.js):
  ```javascript
  export const EFFECT_DURATION = 120;
  ```

---

### Task 2: Update Test Harness

**Files:**
- Modify: `tests/test_levelperks.js`

- [ ] **Step 1: Implement `player.getEffect` and update `player.addEffect` in `createTestPlayer`**
  Modify [test_levelperks.js](file:///e:/minecraft-bedrock-server-local/tests/test_levelperks.js):
  ```javascript
  function createTestPlayer(name, level) {
      const player = addMockPlayer(name);
      player.level = level;
      player.appliedEffects = [];
      player.activeEffects = new Map();
      player.getEffect = function (effectId) {
          return this.activeEffects.get(effectId);
      };
      player.addEffect = function (effectId, duration, options) {
          const amplifier = options?.amplifier ?? 0;
          this.activeEffects.set(effectId, { amplifier, duration });
          this.appliedEffects.push({ effectId, duration, options });
      };
      player.dynamicProperties = {};
      player.getDynamicProperty = function (key) {
          return this.dynamicProperties[key];
      };
      player.setDynamicProperty = function (key, value) {
          this.dynamicProperties[key] = value;
      };
      return player;
  }
  ```
- [ ] **Step 2: Update expected values in the existing tests for `EFFECT_DURATION = 120`**
  Update the `expectedEffects` mapping in [test_levelperks.js](file:///e:/minecraft-bedrock-server-local/tests/test_levelperks.js) from `duration: 300` to `duration: 120`.

- [ ] **Step 3: Add new test cases to verify effect overwrite and downgrade scenarios**
  Add a section to [test_levelperks.js](file:///e:/minecraft-bedrock-server-local/tests/test_levelperks.js):
  - **No Downgrading**: A player with an active high-amplifier effect (e.g. Resistance II with duration 3600) does NOT have it overwritten by a lower perk (e.g. Resistance I).
  - **No Overwriting Long-Duration**: A player with an active equal-amplifier effect with long duration (e.g. Regeneration I with duration 1200) does NOT have it overwritten.
  - **Successful Refresh**: A player with our perk effect that is about to expire (duration <= 120) gets refreshed.
  - **Instant Upgrade**: A player with a lower-amplifier effect (e.g. Resistance I) gets upgraded immediately if their perk tier gives Resistance II.

- [ ] **Step 4: Run Node.js tests and verify PASS**
  Run command: `node --experimental-vm-modules e:/minecraft-bedrock-server-local/tests/test_levelperks.js`

---

### Task 3: Server Boot Test & Commit

- [ ] **Step 1: Perform the server boot test**
  Run server to ensure no startup errors.
- [ ] **Step 2: Commit the changes**
  Run git commands to commit the files.
- [ ] **Step 3: Update `e:\minecraft-bedrock-server-local\.superpowers\sdd\levelperks\task-4-report.md`**
  Append a "Safe Effect Overwrite Fix" section to the task-4-report.md file.
