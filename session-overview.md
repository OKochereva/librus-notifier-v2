# Librus Notifier - Session Overview

## Project Status: 90% Complete

### What Works ✅
- ✅ Automated checking at scheduled times (Mon-Fri: 10:00, 11:30, 13:00, 14:30, 16:00, 19:00 | Sat-Sun: 11:00, 18:00)
- ✅ Multi-account tracking (Illia: 12112456, Kostia: 12139172)
- ✅ Change detection for: grades, messages, announcements, calendar events, attendance
- ✅ Tomorrow's lesson plan sent at 16:00
- ✅ Telegram notifications to chat ID: 6396283445
- ✅ State persistence to avoid duplicate alerts
- ✅ Error logging and blocking error alerts
- ✅ launchd scheduling on macOS

### Current Issue ⚠️
**Substitution detection not working** - Need to show "🔄 Zastępstwo" for replaced lessons.

**Problem**: `librus-api` package doesn't expose substitution data in timetable
**Solution in progress**: Custom HTML scraper to detect green "zastępstwo" cells

**Last error**: `cookies.map is not a function`
- Cookie jar exists at `client.cookie`
- `getCookies()` returns object, not array
- Fix attempted but needs testing

### Next Steps
1. Fix cookie handling in `substitution-scraper.js` (handle object vs array)
2. Test HTML fetch: `node src/index.js` should create `timetable.html`
3. Inspect HTML structure to find zastępstwo markers
4. Update `parseHTML()` method to correctly detect substitutions
5. Verify substitutions appear in daily schedule with 🔄 emoji

---

## Project Structure

```
~/librus-notifier/
├── src/
│   ├── index.js                  # Main orchestrator
│   ├── config.js                 # Env vars loader
│   ├── logger.js                 # File + console logging
│   ├── librus-client.js          # API wrapper + schedule fetching
│   ├── state-manager.js          # Change detection
│   ├── report-generator.js       # Format update notifications
│   ├── schedule-formatter.js     # Format tomorrow's lessons
│   ├── notifier.js               # Telegram sender
│   └── substitution-scraper.js   # 🔴 IN PROGRESS - HTML scraper
├── state/                        # JSON state files (gitignored)
├── logs/                         # Log files (gitignored)
├── .env                          # Credentials
├── com.librus.notifier.plist     # launchd config
└── package.json
```

---

## Configuration

### Credentials (.env)
```
ILLIA_USERNAME=12112456
ILLIA_PASSWORD=rihce8-joqpof-devXuk
KOSTIA_USERNAME=12139172
KOSTIA_PASSWORD=h8C(jDJcEkCQ3X76
TELEGRAM_BOT_TOKEN=8355935875:AAEfVxaKN8W9vJpbHrGBrbyWLzzEA_9aHWo
TELEGRAM_CHAT_ID=6396283445
```

### Schedule
**Weekdays (Mon-Fri)**: 10:00, 11:30, 13:00, 14:30, 16:00 (+ tomorrow's plan), 19:00
**Weekends (Sat-Sun)**: 11:00, 18:00

---

## Key Technical Details

### librus-api Structure
- Cookie jar: `client.cookie`
- Methods used:
  - `client.info.getGrades()`
  - `client.inbox.listInbox(5)` (folder 5 = inbox)
  - `client.inbox.listAnnouncements()`
  - `client.calendar.getCalendar()`
  - `client.calendar.getTimetable()`
  - `client.absence.getAbsences()`

### Timetable Structure
```javascript
{
  "hours": ["07:35 - 08:20", ...],
  "table": {
    "Monday": [null, {...}, ...],
    "Tuesday": [...],
    // lesson object: { subject, teacher, room, time }
  }
}
```

### Substitution Detection Strategy
1. Fetch HTML from `https://synergia.librus.pl/przegladaj_plan_lekcji`
2. Parse for green cells: `background-color: rgb(175, 254, 189)` or text "zastępstwo"
3. Map to `Day-LessonIndex` (e.g., "Thursday-2")
4. Add `substitution: true` to matching lessons
5. Formatter displays with 🔄 emoji

---

## Testing Commands

```bash
# Manual run
node src/index.js

# Force schedule mode (16:00)
# Edit src/index.js: const isScheduleTime = true;
node src/index.js

# Check logs
tail -f logs/info.log
tail -f logs/error.log

# Reload launchd
launchctl unload ~/Library/LaunchAgents/com.librus.notifier.plist
launchctl load ~/Library/LaunchAgents/com.librus.notifier.plist

# Check status
launchctl list | grep librus
```

---

## Files Modified in Last Session

1. **com.librus.notifier.plist** - Updated schedule (weekday/weekend split)
2. **src/schedule-formatter.js** - Added calendar event formatting, substitution emoji
3. **src/substitution-scraper.js** - NEW FILE - HTML scraper for substitutions
4. **src/librus-client.js** - Added `fetchCalendar()`, integrated substitution scraper
5. **src/state-manager.js** - Added calendar event tracking
6. **src/report-generator.js** - Added calendar event formatting
7. **src/index.js** - Added 16:00 schedule mode

---

## Known Working Example Output

**Updates notification (09:30, 11:30, 13:00, 14:30, 19:00)**:
- New grades with emoji (⭐ 5, 📝 4, 📄 3, ⚠️ <3)
- New messages with full content
- New calendar events from terminarz
- New attendance records

**Tomorrow's schedule (16:00)**:
- All lessons for next day
- Teacher, room, time
- Should show 🔄 for zastępstwo (not working yet)

---

## Debug Info

Last known state:
- `client.cookie` exists and contains cookie jar
- `getCookies('https://synergia.librus.pl')` returns object (not array)
- Need to handle as: `Object.entries(cookies).map(([key, val]) => ...)`
- HTML fetch not tested yet (waiting for cookie fix)
