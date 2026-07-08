# Design Spec: Incoming Solat Times Addon

Replace the native, non-functional "Days played" HUD feature with real-world prayer (solat) time notifications tailored for Kuala Lumpur (UTC+8).

## 1. Goal & Context
The server host is located in a different environment, but the target timezone for the player base is Kuala Lumpur, Malaysia. Instead of showing the native "Days played" counter (which is a vanilla number tracking Minecraft in-game days and doesn't map to real life), we will display real-world prayer alerts.

We will build a custom, lightweight behavior pack (**SolatAlerts**) that runs on the server, calculates real-world prayer times using astronomical formulas for Kuala Lumpur coordinates, and broadcasts alerts at 30, 10, and 5 minutes before, as well as at the start of each prayer time.

## 2. Technical Design

### A. Location Parameters
*   **Latitude**: `3.1390` N
*   **Longitude**: `101.6869` E
*   **Timezone**: UTC+8 (Asia/Kuala_Lumpur)
*   **Calculation Angles**:
    *   Fajr: 18.0° (Malaysian JAKIM standard)
    *   Isha: 18.0° (Malaysian JAKIM standard)
    *   Asr: Standard Shafi'i shadow ratio (= 1)
    *   Maghrib/Sunset: 0.833° solar depression (refraction correction) + 2-minute default JAKIM offset buffer.
    *   Dhuhr: Solar transit + 2-minute buffer.

### B. Directory Structure
```text
behavior_packs/
  SolatAlerts/
    manifest.json
    scripts/
      index.js
      prayertimes.js
```

### C. Astronomical Calculation Logic (`prayertimes.js`)
We will implement the standard astronomical calculation of prayer times using:
1.  **Day of the Year ($d$)**: Derived from current UTC time.
2.  **Solar Declination ($\delta$)**:
    $$\delta = 23.45 \cdot \sin\left(\frac{360 \cdot (d - 80)}{370}\right)$$
3.  **Equation of Time ($EoT$)**:
    $$EoT = 9.87 \cdot \sin(2B) - 7.53 \cdot \cos(B) - 1.5 \cdot \sin(B)$$
    Where $B = \frac{360 \cdot (d - 81)}{365}$
4.  **Transit (Dhuhr)**:
    $$\text{Transit} = 12 - \frac{\text{Longitude}}{15} + \text{TimezoneOffset} - \frac{EoT}{60}$$
5.  **Hour Angle ($H$) for Sun Altitude ($\alpha$)**:
    $$\cos(H) = \frac{\sin(\alpha) - \sin(\text{Latitude}) \cdot \sin(\delta)}{\cos(\text{Latitude}) \cdot \cos(\delta)}$$
6.  **Times Calculation**:
    *   $\text{Fajr} = \text{Transit} - H(-18^\circ)/15$
    *   $\text{Dhuhr} = \text{Transit} + \frac{2}{60}$ (2-minute buffer)
    *   $\text{Asr} = \text{Transit} + H(\alpha_{\text{Asr}})/15$, where $\alpha_{\text{Asr}} = \operatorname{atan}\left(\frac{1}{1 + \tan(|\text{Latitude} - \delta|)}\right)$
    *   $\text{Maghrib} = \text{Transit} + H(-0.833^\circ)/15 + \frac{2}{60}$ (2-minute buffer)
    *   $\text{Isha} = \text{Transit} + H(-18^\circ)/15$

### D. Ticker Loop & Notifications (`index.js`)
*   Every 200 ticks (10 seconds), check the current system UTC date and time.
*   Calculate the prayer times for "today" (in UTC+8 time).
*   Format the times and detect boundary crossings:
    *   **30, 10, and 5 Minutes Before**: Print a yellow chat alert (e.g., `§e[Solat] 30 minutes remaining until Asr.`).
    *   **Start Time**:
        *   Send center-screen title: `§aTime for Asr`
        *   Send center-screen subtitle: `§7Please take a break to pray`
        *   Print green chat alert: `§a[Solat] Time for Asr prayer has started.`
        *   Play chime sound `random.levelup` to all players.

## 3. Verification Plan
*   **Dynamic Time Verification**: Add a debugging command `/testsolat` that prints calculated times for today to check if they match Kuala Lumpur times within 1–2 minutes.
*   **Alert Verification**: Add a debug method to accelerate the system time or manually simulate an approaching prayer to confirm that chat notifications, title cards, and sound alerts fire correctly.
