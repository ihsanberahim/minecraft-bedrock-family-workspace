# Fix LevelPerks Loop and Magic Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify `behavior_packs/LevelPerks/scripts/index.js` to isolate errors for individual players in the run interval loop, extract duration/tick magic numbers, verify with tests, and commit the results.

**Architecture:** 
- Extract `EFFECT_DURATION = 300` and `TICK_INTERVAL = 100` as top-level constants.
- Move the `try-catch` block from wrapping the entire `for` loop to wrapping the inside of the `for` loop (processing of each individual player).
- Run the test suite using Node.js to verify correctness.

**Tech Stack:** JavaScript, Node.js, `@minecraft/server` scripting framework.

## Global Constraints

- Move the `try-catch` inside the player loop to isolate errors.
- Define `EFFECT_DURATION = 300` and `TICK_INTERVAL = 100` as top-level constants.
- Run tests: `node --experimental-vm-modules tests/test_levelperks.js`.
- Commit changes and update report.

---

### Task 1: Refactor Loop and Magic Numbers

**Files:**
- Modify: `behavior_packs/LevelPerks/scripts/index.js`
- Test: `tests/test_levelperks.js`

**Interfaces:**
- `behavior_packs/LevelPerks/scripts/index.js` exports `EFFECT_DURATION`, `TICK_INTERVAL`, `TIER_CONFIG`, `getTier`, and `applyTierEffects`.

- [ ] **Step 1: Refactor code in behavior_packs/LevelPerks/scripts/index.js**
  - Define `EFFECT_DURATION = 300` and `TICK_INTERVAL = 100` at the top level.
  - Update `applyTierEffects` to use `EFFECT_DURATION`.
  - Update `system.runInterval` to use `TICK_INTERVAL`.
  - Move the `try-catch` block inside the `for` loop.

- [ ] **Step 2: Run tests to verify correctness**
  Run: `node --experimental-vm-modules E:\minecraft-bedrock-server-local\tests\test_levelperks.js`
  Expected: PASS

- [ ] **Step 3: Commit the changes**
  Run:
  ```bash
  git add behavior_packs/LevelPerks/scripts/index.js
  git commit -m "refactor: isolate player loop error handling and extract magic numbers as constants in LevelPerks"
  ```

- [ ] **Step 4: Update task-2-report.md**
  Append a "Fix Loop Details" section documenting the changes and verification.

- [ ] **Step 5: Verify git status and final test run**
  Verify everything is clean and tests still pass.
