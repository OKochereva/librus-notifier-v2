# Quick Resume Guide

## Current Task
Fix substitution detection in `src/substitution-scraper.js`

## The Problem
Lessons marked with green "zastępstwo" banner on Librus website don't show 🔄 emoji in notifications.

## Last Error
```
[2025-10-15T16:34:35.625Z] [WARN] Substitution detection failed: cookies.map is not a function
```

## Fix to Apply

Open `src/substitution-scraper.js` and replace `detectSubstitutions` method:

```javascript
async detectSubstitutions(client, timetableData) {
  try {
    const jar = client.cookie;
    
    if (!jar) {
      logger.warn('No cookie jar found');
      return this.markAllNormal(timetableData);
    }

    const cookies = jar.getCookies('https://synergia.librus.pl');
    let cookieStr = '';
    
    if (Array.isArray(cookies)) {
      cookieStr = cookies.map(c => `${c.key}=${c.value}`).join('; ');
    } else if (typeof cookies === 'object') {
      // Handle object format
      cookieStr = Object.entries(cookies).map(([key, val]) => `${key}=${val}`).join('; ');
    } else {
      logger.warn('Unexpected cookies format');
      return this.markAllNormal(timetableData);
    }
    
    const html = await this.fetchHTML(cookieStr);
    
    const fs = require('fs');
    fs.writeFileSync('timetable.html', html);
    logger.info('Saved timetable.html');
    
    const substitutionKeys = this.parseHTML(html);
    return this.enhanceTimetable(timetableData, substitutionKeys);
  } catch (error) {
    logger.warn(`Substitution detection failed: ${error.message}`);
    return this.markAllNormal(timetableData);
  }
}
```

## Test Steps

1. Apply fix above
2. Run: `node src/index.js`
3. Check if `timetable.html` created: `ls -la timetable.html`
4. If created, inspect HTML for zastępstwo markers
5. Update `parseHTML()` if needed based on HTML structure
6. Test again until substitutions appear with 🔄

## Everything Else Works
- Schedule tracking ✅
- Tomorrow's lessons ✅
- Telegram notifications ✅
- All data types except substitution flag ✅

## File Locations
- Project: `~/librus-notifier/`
- Config: `~/librus-notifier/.env`
- Plist: `~/Library/LaunchAgents/com.librus.notifier.plist`
- Logs: `~/librus-notifier/logs/`
