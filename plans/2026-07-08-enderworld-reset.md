# Enderworld Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the End (Enderworld) dimension terrain and the dragon fight status for the world `Sanad Server` on the Bedrock Dedicated Server.

**Architecture:** We will safely stop the server process, create a world backup, download the `mcberepair` CLI tool to delete all End dimension chunk keys (dimension `2`) from the LevelDB database, and use a Python script with the `nbtlib` library to edit `level.dat` and reset the dragon fight NBT tags. Finally, we restart the server and verify the reset.

**Tech Stack:** PowerShell, Python 3.11, `nbtlib` library, `mcberepair` utility.

## Global Constraints
- Target World: `worlds/Sanad Server`
- Active Server Process: `bedrock_server.exe`
- Git Commands: Run all git commands using the `-C E:\minecraft-bedrock-server-local` working directory option to target the correct repository.
- File Locations: All specs go into the root `specs/` directory; all plans go into the root `plans/` directory.

---

### Task 1: Server Shutdown and World Backup

**Files:**
- None

**Interfaces:**
- None

- [ ] **Step 1: Stop the Bedrock Dedicated Server**
  
  Run PowerShell to find and stop the active `bedrock_server` process:
  ```powershell
  Get-Process -Name bedrock_server -ErrorAction SilentlyContinue | Stop-Process -Force
  ```
  Expected: The server process exits. Verify it is stopped by running:
  ```powershell
  Get-Process -Name bedrock_server -ErrorAction SilentlyContinue
  ```
  Expected: No process output.

- [ ] **Step 2: Create a full backup of the world directory**
  
  Copy the active world folder `worlds/Sanad Server` to a backup location:
  ```powershell
  Copy-Item -Path "E:\minecraft-bedrock-server-local\worlds\Sanad Server" -Destination "E:\minecraft-bedrock-server-local\worlds\Sanad Server_Backup" -Recurse -Force
  ```
  Expected: The backup folder `worlds/Sanad Server_Backup` is created with identical files.

- [ ] **Step 3: Commit backup creation information (Optional - git status update)**
  
  Since the backup is inside the ignored `worlds/` directory, it won't be staged in git. We can run:
  ```powershell
  git -C E:\minecraft-bedrock-server-local status
  ```
  Expected: Success, showing git repository status.

---

### Task 2: Setup mcberepair Utility

**Files:**
- Create: `scratch/download_mcberepair.ps1`

**Interfaces:**
- None

- [ ] **Step 1: Create a script to download and extract mcberepair**
  
  Create `E:\minecraft-bedrock-server-local\scratch\download_mcberepair.ps1` with the following content:
  ```powershell
  $url = "https://github.com/reedacartwright/mcberepair/releases/download/v0.2.0/mcberepair-0.2.0-win64.zip"
  $zipPath = "E:\minecraft-bedrock-server-local\scratch\mcberepair.zip"
  $destPath = "E:\minecraft-bedrock-server-local\scratch\mcberepair_bin"

  if (!(Test-Path $destPath)) {
      New-Item -ItemType Directory -Path $destPath -Force
  }

  Write-Host "Downloading mcberepair from $url..."
  Invoke-WebRequest -Uri $url -OutFile $zipPath

  Write-Host "Extracting archive..."
  Expand-Archive -Path $zipPath -DestinationPath $destPath -Force

  Write-Host "Cleanup zip file..."
  Remove-Item -Path $zipPath -Force

  Write-Host "Done!"
  ```

- [ ] **Step 2: Execute the download script**
  
  Run the script to download the binary:
  ```powershell
  PowerShell -ExecutionPolicy Bypass -File E:\minecraft-bedrock-server-local\scratch\download_mcberepair.ps1
  ```
  Expected: Success. File `E:\minecraft-bedrock-server-local\scratch\mcberepair_bin\mcberepair.exe` exists.

- [ ] **Step 3: Verify the mcberepair execution**
  
  Run `mcberepair` with no arguments to verify it executes:
  ```powershell
  E:\minecraft-bedrock-server-local\scratch\mcberepair_bin\mcberepair.exe
  ```
  Expected: Output showing usage instructions.

---

### Task 3: Delete End Dimension Chunks

**Files:**
- Create: `scratch/filter_keys.py`

**Interfaces:**
- None

- [ ] **Step 1: List all keys in the LevelDB database**
  
  Run the `listkeys` subcommand to dump all world keys into a TSV file:
  ```powershell
  E:\minecraft-bedrock-server-local\scratch\mcberepair_bin\mcberepair.exe listkeys "E:\minecraft-bedrock-server-local\worlds\Sanad Server" > E:\minecraft-bedrock-server-local\scratch\list.tsv
  ```
  Expected: `scratch/list.tsv` is created and populated.

- [ ] **Step 2: Create a Python script to filter End dimension keys**
  
  Create `E:\minecraft-bedrock-server-local\scratch\filter_keys.py` to parse the TSV and export keys where the Dimension ID is `2` (representing the End):
  ```python
  import csv

  tsv_path = r"E:\minecraft-bedrock-server-local\scratch\list.tsv"
  out_path = r"E:\minecraft-bedrock-server-local\scratch\endkeys.txt"

  count = 0
  with open(tsv_path, "r", encoding="utf-8") as f_in, open(out_path, "w", encoding="utf-8") as f_out:
      # listkeys TSV doesn't have a header, fields are:
      # Key (hex), Length, Type, X, Z, Dimension, SubchunkY...
      reader = csv.reader(f_in, delimiter="\t")
      for row in reader:
          if len(row) >= 6:
              key_hex = row[0]
              dimension = row[5]
              if dimension == "2":
                  f_out.write(key_hex + "\n")
                  count += 1

  print(f"Filtered {count} keys for dimension 2 (The End) and wrote them to {out_path}.")
  ```

- [ ] **Step 3: Run the Python script to extract End keys**
  
  Run the script:
  ```powershell
  python E:\minecraft-bedrock-server-local\scratch\filter_keys.py
  ```
  Expected: Outputs "Filtered X keys..." and creates `E:\minecraft-bedrock-server-local\scratch\endkeys.txt`.

- [ ] **Step 4: Delete the End dimension keys**
  
  Use `mcberepair rmkeys` to delete the chunks from the LevelDB database:
  ```powershell
  Get-Content E:\minecraft-bedrock-server-local\scratch\endkeys.txt | E:\minecraft-bedrock-server-local\scratch\mcberepair_bin\mcberepair.exe rmkeys "E:\minecraft-bedrock-server-local\worlds\Sanad Server"
  ```
  Expected: Success. Keys are removed from the database.

---

### Task 4: Reset Dragon Fight NBT in level.dat

**Files:**
- Create: `scratch/reset_level_dat.py`

**Interfaces:**
- None

- [ ] **Step 1: Install nbtlib library**
  
  Install `nbtlib` using pip:
  ```powershell
  pip install nbtlib
  ```
  Expected: Success.

- [ ] **Step 2: Create a Python script to inspect and reset level.dat**
  
  Create `E:\minecraft-bedrock-server-local\scratch\reset_level_dat.py` to parse Bedrock `level.dat` and reset the dragon fight properties:
  ```python
  import os
  import struct
  import nbtlib
  from nbtlib import File
  from nbtlib.tag import Byte, Int, List, Compound

  level_dat_path = r"E:\minecraft-bedrock-server-local\worlds\Sanad Server\level.dat"

  # 1. Read header and NBT data
  with open(level_dat_path, "rb") as f:
      header = f.read(8)
      if len(header) < 8:
          raise ValueError("File is too short to be a valid Bedrock level.dat")
      version, length = struct.unpack("<II", header)
      print(f"Bedrock Header - Version: {version}, Length in header: {length}")
      
      # Parse NBT payload
      nbt_data = File.parse(f, byteorder="little")

  # 2. Inspect NBT tags
  print("\nRoot NBT structure keys:")
  print(list(nbt_data.keys()))
  
  # Bedrock level.dat root tag is nameless, which nbtlib parses.
  # Let's search recursively for "DragonFight" tag.
  def find_and_reset_dragon_fight(nbt_node, path=""):
      if isinstance(nbt_node, Compound):
          for k, v in list(nbt_node.items()):
              current_path = f"{path}/{k}" if path else k
              if k == "DragonFight":
                  print(f"Found 'DragonFight' tag at path: {current_path}")
                  print("Current values:", v)
                  # Reset properties:
                  # - Set DragonKilled to 0
                  # - Set PreviouslyKilled to 0
                  # - Clear Gateways List
                  v["DragonKilled"] = Byte(0)
                  v["PreviouslyKilled"] = Byte(0)
                  v["Gateways"] = List[Int]([])
                  print("Reset values:", v)
                  return True
              else:
                  if find_and_reset_dragon_fight(v, current_path):
                      return True
      elif isinstance(nbt_node, List):
          for idx, item in enumerate(nbt_node):
              if find_and_reset_dragon_fight(item, f"{path}[{idx}]"):
                  return True
      return False

  found = find_and_reset_dragon_fight(nbt_data)
  if not found:
      print("WARNING: 'DragonFight' tag not found in level.dat. It might regenerate dynamically, or resides in another tag.")
      # Let's inspect if DimensionData exists and add a fresh DragonFight compound to The End (2)
      # if we find DimensionData
  else:
      # 3. Serialize NBT and write it back with the header
      # First, serialize NBT to bytes to calculate the exact new length
      import io
      buf = io.BytesIO()
      nbt_data.write(buf, byteorder="little")
      payload_bytes = buf.getvalue()
      new_length = len(payload_bytes)
      
      print(f"\nNew NBT payload length: {new_length} bytes (Old: {length} bytes)")
      new_header = struct.pack("<II", version, new_length)
      
      # Write header + payload back to level.dat
      with open(level_dat_path, "wb") as f_out:
          f_out.write(new_header)
          f_out.write(payload_bytes)
      print("Successfully updated level.dat NBT data.")
  ```

- [ ] **Step 3: Execute the level.dat reset script**
  
  Run the script:
  ```powershell
  python E:\minecraft-bedrock-server-local\scratch\reset_level_dat.py
  ```
  Expected: Output showing the nameless root keys, finding `DragonFight` tag, modifying values, and writing the file back.

---

### Task 5: Server Restart and Verification

**Files:**
- None

**Interfaces:**
- None

- [ ] **Step 1: Start the Minecraft Bedrock Dedicated Server**
  
  Run the startup script `run-server.ps1`. Since it blocks, we should start it in a separate process/window:
  ```powershell
  Start-Process powershell.exe -ArgumentList "-NoExit", "-File", "E:\minecraft-bedrock-server-local\run-server.ps1"
  ```
  Expected: A new PowerShell window opens and starts the Minecraft server.

- [ ] **Step 2: Verify server is running**
  
  Run:
  ```powershell
  Get-Process -Name bedrock_server -ErrorAction SilentlyContinue
  ```
  Expected: Success, showing the active process running.

- [ ] **Step 3: Cleanup temporary scratch files (except scripts)**
  
  Remove intermediate data files generated:
  ```powershell
  Remove-Item -Path E:\minecraft-bedrock-server-local\scratch\list.tsv, E:\minecraft-bedrock-server-local\scratch\endkeys.txt -ErrorAction SilentlyContinue
  ```
  Expected: Files are deleted.
