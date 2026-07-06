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
