// Mathematical helpers
function dtr(deg) { return (deg * Math.PI) / 180.0; }
function rtd(rad) { return (rad * 180.0) / Math.PI; }
function sin(deg) { return Math.sin(dtr(deg)); }
function cos(deg) { return Math.cos(dtr(deg)); }
function tan(deg) { return Math.tan(dtr(deg)); }
function acos(val) { return rtd(Math.acos(val)); }
function atan(val) { return rtd(Math.atan(val)); }

// Calculate prayer times
// Returns decimal hours for each prayer time
export function calculatePrayerTimes(date, latitude, longitude, timezone) {
    // Determine the calendar day of the year (1-366) in UTC+8 timezone
    const localTimeMs = date.getTime() + (timezone * 60 * 60 * 1000);
    const localDate = new Date(localTimeMs);
    const localStart = new Date(Date.UTC(localDate.getUTCFullYear(), 0, 0));
    const diff = localTimeMs - localStart.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const d = Math.floor(diff / oneDay);

    // Declination and Equation of Time calculations
    const B = (360.0 * (d - 81)) / 365.0;
    const EoT = 9.87 * sin(2 * B) - 7.53 * cos(B) - 1.5 * sin(B); // in minutes
    const declination = 23.45 * sin((360.0 * (d - 80)) / 370.0); // in degrees

    // Solar transit (noon)
    const transit = 12.0 - longitude / 15.0 + timezone - EoT / 60.0;

    // Hour angle helper
    function getHourAngle(altitude) {
        const val = (sin(altitude) - sin(latitude) * sin(declination)) / (cos(latitude) * cos(declination));
        if (val < -1 || val > 1) return null;
        return acos(val) / 15.0;
    }

    // 1. Fajr (18 degrees solar depression)
    const hFajr = getHourAngle(-18.0);
    const fajr = hFajr !== null ? transit - hFajr : null;

    // 2. Dhuhr (solar transit + 2 minutes buffer)
    const dhuhr = transit + (2.0 / 60.0);

    // 3. Asr (shadow factor = 1)
    const g = atan(1.0 / (1.0 + tan(Math.abs(latitude - declination))));
    const hAsr = getHourAngle(g);
    const asr = hAsr !== null ? transit + hAsr : null;

    // 4. Maghrib / Sunset (0.833 degrees solar depression + 2 minutes buffer)
    const hSunset = getHourAngle(-0.833);
    const maghrib = hSunset !== null ? transit + hSunset + (2.0 / 60.0) : null;

    // 5. Isha (18 degrees solar depression)
    const hIsha = getHourAngle(-18.0);
    const isha = hIsha !== null ? transit + hIsha : null;

    return { fajr, dhuhr, asr, maghrib, isha };
}

export function formatTime(decimalHours) {
    if (decimalHours === null || isNaN(decimalHours)) return "N/A";
    const totalMinutes = Math.floor(decimalHours * 60 + 0.5);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getLocalDecimalHours(date, timezone) {
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const localDate = new Date(utcMs + (timezone * 60 * 60 * 1000));
    return localDate.getHours() + localDate.getMinutes() / 60.0 + localDate.getSeconds() / 3600.0;
}

export function getLocalDateString(date, timezone) {
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const localDate = new Date(utcMs + (timezone * 60 * 60 * 1000));
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, '0');
    const d = String(localDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
