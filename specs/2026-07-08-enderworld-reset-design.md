# Enderworld Reset Design Spec

Design specification to reset the End (Enderworld) dimension on the Minecraft Bedrock Dedicated Server. This reset will completely regenerate the End terrain and reset the Ender Dragon fight state so players can battle the dragon again.

## Goals
- Stop the Minecraft Bedrock Server process.
- Back up the active world directory (`worlds/Sanad Server`).
- Selectively delete all LevelDB database keys belonging to the End dimension (dimension ID `2`).
- Edit the world's `level.dat` NBT data to reset the Ender Dragon fight state.
- Start the server back up and verify the changes.

## Open Questions & Decisions
- **Enderworld builds:** This will delete all terrain in the End. Any player-built structures, chests, or farms in the End will be deleted. (The user has approved this approach.)

## Design Details

### 1. Stopping the Server
We will stop the running `bedrock_server.exe` process (PID `17040`).

### 2. Creating a World Backup
Before editing any database files, we will copy the entire active world directory `worlds/Sanad Server` to `worlds/Sanad Server_Backup`.

### 3. Deleting End Dimension Chunks
Because Bedrock stores all dimension data in a single LevelDB database under `db/`, we will use the `mcberepair` CLI tool:
- Download the pre-built 64-bit Windows binary of `mcberepair-0.2.0-win64.zip` from GitHub.
- Extract `mcberepair.exe`.
- List all keys in the world database:
  ```powershell
  mcberepair listkeys "worlds/Sanad Server" > list.tsv
  ```
- Filter the TSV using a Python script to select keys corresponding to Dimension `2` (The End) and save them to `endkeys.txt`.
- Remove these keys from the database:
  ```powershell
  mcberepair rmkeys "worlds/Sanad Server" < endkeys.txt
  ```

### 4. Resetting the Dragon Fight State in `level.dat`
To force a natural respawn of the dragon when a player enters the End, we must reset the `DragonFight` tag in `level.dat`.
- We will write a Python script using the `nbtlib` library.
- The script will read `worlds/Sanad Server/level.dat`, skip the 8-byte Bedrock header, and parse the little-endian NBT data.
- It will inspect the NBT tree for keys like `DragonKilled`, `PreviouslyKilled`, `Gateways`, and `ExitPortalLocation` under the End dimension's data and reset/remove them.
- Finally, it will re-serialize the NBT data and write it back along with a corrected 8-byte header containing the updated payload length.

### 5. Verification
- Start the server.
- Connect a player to verify they can enter the End, find a regenerated main island, and fight a freshly spawned Ender Dragon.
