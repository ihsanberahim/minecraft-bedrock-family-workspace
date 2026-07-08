# MCTray Integration Handoff: Enderworld Reset Feature

This document provides the specifications, command references, and NBT layout details required to integrate the **Enderworld (End Dimension) Reset** feature directly into the `MinecraftTrayManager` (MCTray) user interface.

---

## Feature Overview
In Minecraft Bedrock Edition, the Overworld, Nether, and End dimensions are stored in a single LevelDB database, meaning you cannot reset the End by deleting a folder. The reset requires:
1. Stopping the server and disabling the watchdog.
2. Backing up the world files.
3. Deleting all LevelDB database keys for dimension `2` (The End).
4. Resetting the `DragonFight` NBT tags in `level.dat`.
5. Restarting the server and watchdog.

Integrating this into MCTray allows the administrator to trigger this operation with a single click in the UI.

---

## 1. UI Design Suggestions
We suggest adding a **"Reset End Dimension"** button in the Bedrock server management tab.
- **State Constraint**: The button should only be enabled when the Bedrock server is **Stopped** to prevent database locks and corruption.
- **Safety Prompt**: Clicking the button must trigger a confirmation popup: 
  > *"Are you sure you want to reset the End dimension? This will permanently delete the End terrain and all player builds/cheats/farms in the End. (A backup will be created automatically)."*

---

## 2. Step-by-Step C# Execution Logic

### Step A: Stopping Watchdog & Server
1. **Disable Auto-Restart**: Temporarily set a flag in MCTray to prevent the watchdog thread from starting the server when it detects it is offline.
2. **Terminate Process**: If `bedrock_server.exe` is running, stop it and wait for it to exit:
   ```csharp
   // C# code to safely stop server
   var processes = Process.GetProcessesByName("bedrock_server");
   foreach (var p in processes) {
       p.Kill();
       p.WaitForExit();
   }
   ```

### Step B: Create World Backup
Copy the entire `worlds/Sanad Server` directory to `worlds/Sanad Server_Backup` before doing any modifications:
```csharp
string sourceDir = @"E:\minecraft-bedrock-server-local\worlds\Sanad Server";
string backupDir = @"E:\minecraft-bedrock-server-local\worlds\Sanad Server_Backup";

// Helper method to copy directories recursively
CopyDirectory(sourceDir, backupDir, true);
```

### Step C: Delete End Dimension Keys using mcberepair
MCTray can leverage the precompiled `mcberepair.exe` binary located in the server's `scratch/mcberepair_bin/` directory.

1. **Dump Database Keys**: Run `mcberepair.exe listkeys` and redirect output to a file:
   ```cmd
   scratch\mcberepair_bin\mcberepair.exe listkeys "worlds\Sanad Server" > scratch\list.tsv
   ```
2. **Filter End Keys**: Parse `scratch\list.tsv` (UTF-16LE or UTF-8 depending on shell redirection) in C# to find all keys where the **Dimension ID** (the 5th column, index 4) equals `"2"` (representing the End).
   - *C# Parser Logic*:
     ```csharp
     var endKeys = new List<string>();
     var lines = File.ReadAllLines(@"E:\minecraft-bedrock-server-local\scratch\list.tsv");
     foreach (var line in lines) {
         var parts = line.Split('\t');
         if (parts.Length >= 6 && parts[4] == "2") {
             endKeys.Add(parts[0]); // parts[0] is the Hex key
         }
     }
     File.WriteAllLines(@"E:\minecraft-bedrock-server-local\scratch\endkeys.txt", endKeys);
     ```
3. **Remove Keys**: Run `mcberepair.exe rmkeys` passing `endkeys.txt` to standard input:
   ```cmd
   scratch\mcberepair_bin\mcberepair.exe rmkeys "worlds\Sanad Server" < scratch\endkeys.txt
   ```
   - *C# Process Execution*:
     ```csharp
     var psi = new ProcessStartInfo {
         FileName = @"E:\minecraft-bedrock-server-local\scratch\mcberepair_bin\mcberepair.exe",
         Arguments = @"rmkeys ""E:\minecraft-bedrock-server-local\worlds\Sanad Server""",
         RedirectStandardInput = true,
         UseShellExecute = false,
         CreateNoWindow = true
     };
     using (var process = Process.Start(psi)) {
         using (var sw = process.StandardInput) {
             foreach (var key in endKeys) {
                 sw.WriteLine(key);
             }
         }
         process.WaitForExit();
     }
     ```

### Step D: Reset level.dat NBT
To reset the dragon fight, MCTray can either run the Python reset script or perform the edits natively in C#.

#### Option 1: Execute Python script (Easiest)
Run the verified python script:
```csharp
var psi = new ProcessStartInfo {
    FileName = "python.exe",
    Arguments = @"E:\minecraft-bedrock-server-local\scratch\reset_level_dat.py",
    UseShellExecute = false,
    CreateNoWindow = true,
    RedirectStandardOutput = true
};
using (var process = Process.Start(psi)) {
    string output = process.StandardOutput.ReadToEnd();
    process.WaitForExit();
    // Log the output
}
```

#### Option 2: Edit NBT Natively in C#
If you wish to avoid a Python dependency, parse `level.dat` using an NBT library (e.g., [fNbt](https://github.com/greiman/fNbt)):
1. Open `worlds/Sanad Server/level.dat` as a file stream.
2. Read the first **8 bytes** (Header):
   - Bytes 0-3: `uint32` format version (normally 10).
   - Bytes 4-7: `uint32` length of NBT payload.
3. Skip the header and parse the rest of the stream as **nameless Little-Endian non-gzipped NBT**.
4. Access or create the NBT path: `DimensionData` (Compound) -> `2` (Compound) -> `DragonFight` (Compound).
5. Modify or create tags in `DragonFight`:
   - `DragonKilled`: `TAG_Byte` = `0`
   - `PreviouslyKilled`: `TAG_Byte` = `0`
   - `Gateways`: `TAG_List` of `TAG_Int` = `[]` (empty)
6. Serialize NBT payload back to a byte array.
7. Write the 8-byte header back to the file with the **new byte array length** packed in bytes 4-7, followed by the NBT byte array.

---

### Step E: Restart Server & Re-enable Watchdog
1. Enable the watchdog auto-restart toggle in MCTray.
2. Trigger the normal server startup flow.
