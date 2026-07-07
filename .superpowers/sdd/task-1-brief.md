### Task 1: Behavior Pack Setup

**Files:**
- Create: `development_behavior_packs/BlockClaim/manifest.json`
- Create: `development_behavior_packs/BlockClaim/scripts/main.js`

**Interfaces:**
- Produces: Base script execution environment.

- [ ] **Step 1: Create manifest.json**

```json
{
  "format_version": 2,
  "header": {
    "name": "Block Claim System",
    "description": "Claim blocks with a Golden Shovel",
    "uuid": "45d17966-3d23-41bb-9ab6-2b449195b05a",
    "version": [1, 0, 0],
    "min_engine_version": [1, 20, 50]
  },
  "modules": [
    {
      "type": "script",
      "language": "javascript",
      "uuid": "3fc0c5e7-28d8-4f27-ba79-19ec6b1d4ef3",
      "entry": "scripts/main.js",
      "version": [1, 0, 0]
    }
  ],
  "dependencies": [
    {
      "module_name": "@minecraft/server",
      "version": "1.14.0"
    }
  ]
}
```

- [ ] **Step 2: Create main.js**

```javascript
import { world, system } from "@minecraft/server";

world.afterEvents.worldInitialize.subscribe((event) => {
    // Initialize dynamic properties for claims and limits
    const def = new DynamicPropertiesDefinition();
    def.defineString("claims", 10000); // Store serialized JSON of claims
    event.propertyRegistry.registerWorldDynamicProperties(def);
});

console.warn("[BlockClaim] Pack loaded.");
```

- [ ] **Step 3: Commit**

```bash
git add development_behavior_packs/BlockClaim/manifest.json development_behavior_packs/BlockClaim/scripts/main.js
git commit -m "feat: setup BlockClaim behavior pack"
```
