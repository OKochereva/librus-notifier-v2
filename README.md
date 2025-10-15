# 📚 Librus Notifier - Home Edition

Automated Librus Synergia monitor running on your Mac. Get instant Telegram notifications for grades, messages, and schedule changes.

## ✨ Features

- ✅ Runs by schedule (Monday-Friday 10:00, 11:30, 13:00, 14:30, 16:00, 19:00; Saturday-Sunday 11:00, 18:00)
- ✅ Multi-account support (Illia & Kostia)
- ✅ Tomorrow's lesson plan at 16:00
- ✅ **Substitution detection with 🔄 emoji for replaced lessons**
- ✅ Tracks: grades, messages, announcements, calendar events, attendance
- ✅ Full message content
- ✅ Smart change detection (no duplicates)
- ✅ Silent when no updates
- ✅ Telegram notifications
- ✅ Error alerts for blocking issues
- ✅ Automatic retry logic

---

## 🚀 Quick Setup (5 minutes)

### 1. Install Node.js (if not installed)
```bash
brew install node
```

### 2. Create project
```bash
mkdir -p ~/librus-notifier/{src,state,logs,scripts}
cd ~/librus-notifier
```

### 3. Save all files
Copy the artifacts I provided to these locations:
- `package.json` → root
- `.env` → root
- `.gitignore` → root
- `src/config.js`
- `src/logger.js`
- `src/librus-client.js`
- `src/state-manager.js`
- `src/report-generator.js`
- `src/schedule-formatter.js`
- `src/notifier.js`
- `src/index.js`
- `com.librus.notifier.plist` → root
- `install.sh` → root

### 4. Make install script executable
```bash
chmod +x install.sh
```

### 5. Run installation
```bash
./install.sh
```

---

## 🧪 Testing

### Test manually
```bash
node src/index.js
```

You should see:
- Login attempts
- Data fetching
- State comparison
- Telegram notification (if changes found)

### Check launchd status
```bash
launchctl list | grep librus
```

Should show `com.librus.notifier` with PID.

### View logs
```bash
# Real-time logs
tail -f logs/info.log

# Error logs
tail -f logs/error.log

# launchd output
tail -f logs/stdout.log
tail -f logs/stderr.log
```

---

## 📅 Schedule

| Time | Description |
|------|-------------|
| 09:30 AM | Morning check (grades, messages, events) |
| 13:00 PM | Midday check |
| 16:00 PM | **Tomorrow's lesson plan** + updates check |
| 20:00 PM | Evening check |

**Note:** If Mac is asleep, the job runs when it wakes up.

---

## 🔧 Management

### Disable notifier
```bash
launchctl unload ~/Library/LaunchAgents/com.librus.notifier.plist
```

### Enable notifier
```bash
launchctl load ~/Library/LaunchAgents/com.librus.notifier.plist
```

### Force run now
```bash
launchctl start com.librus.notifier
```

### Restart after changes
```bash
launchctl unload ~/Library/LaunchAgents/com.librus.notifier.plist
launchctl load ~/Library/LaunchAgents/com.librus.notifier.plist
```

---

## 🐛 Troubleshooting

### No notifications?
1. Check logs: `tail -f logs/info.log`
2. Test manually: `node src/index.js`
3. Verify credentials in `.env`
4. Check Telegram bot token

### Login failed?
- Verify credentials at https://portal.librus.pl/rodzina/synergia/loguj
- Update `.env` if password changed
- Check logs for detailed error

### launchd not running?
```bash
# Check if loaded
launchctl list | grep librus

# Reload
launchctl unload ~/Library/LaunchAgents/com.librus.notifier.plist
launchctl load ~/Library/LaunchAgents/com.librus.notifier.plist
```

### Telegram alerts not working?
1. Verify bot token: `echo $TELEGRAM_BOT_TOKEN`
2. Send `/start` to your bot
3. Check chat ID is correct

---

## 🚨 Error Alerts

You'll receive Telegram alerts for:
- ❌ Login failures (after 2 retries)
- ❌ Network completely down
- ❌ Telegram send failures (after 3 retries)

You WON'T receive alerts for:
- ✅ Temporary timeouts (handled by retry)
- ✅ No changes found (expected)
- ✅ Missing state files (uses defaults)

---

## 📊 What Gets Tracked

| Category | Details |
|----------|---------|
| **Grades** | Subject, value, weight, teacher, comments |
| **Messages** | Full content, sender, date, attachments |
| **Announcements** | School news and important updates |
| **Calendar Events** | New events from terminarz (school calendar) |
| **Schedule** | Changes to timetable |
| **Attendance** | New attendance records |
| **Tomorrow's Lessons** | Daily lesson plan at 16:00 with substitution markers |
| **Substitutions** | Teacher replacements marked with 🔄 emoji |

---

## 🔐 Security

- ✅ Credentials stored in `.env` (gitignored)
- ✅ State files local only
- ✅ Passwords sanitized in logs
- ✅ No data transmitted to third parties

---

## 📁 File Structure

```
librus-notifier/
├── .env                    # Your credentials
├── package.json
├── com.librus.notifier.plist
├── install.sh
│
├── src/
│   ├── index.js           # Main orchestrator
│   ├── config.js          # Load environment
│   ├── logger.js          # Logging system
│   ├── librus-client.js   # API wrapper
│   ├── state-manager.js   # Change detection
│   ├── report-generator.js # Format reports
│   ├── schedule-formatter.js # Format lesson plans
│   ├── substitution-scraper.js # HTML scraper for substitutions
│   └── notifier.js        # Telegram sender
│
├── state/                 # Persisted state (gitignored)
│   ├── 12112456.json      # Illia's state
│   └── 12139172.json      # Kostia's state
│
└── logs/                  # Logs (gitignored)
    ├── info.log
    ├── error.log
    ├── stdout.log
    └── stderr.log
```

---

## 📝 Example Output

### Updates Report (09:30, 13:00, 20:00)
```
📚 RAPORT ZMIAN W LIBRUS
📅 14 października 2025, 14:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ILLIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 NOWE OCENY (1)
   ⭐ Matematyka - Ocena: 5
      Kategoria: Sprawdzian
      Waga: 5
      Data: 14.10.2025, 10:30
      Nauczyciel: Anna Kowalska
      Komentarz: "Świetna praca!"

📅 NOWE WYDARZENIA (1)
   📌 Wycieczka do muzeum
      Od: 20.10.2025, 08:00
      Do: 20.10.2025, 15:00
      Kategoria: Wycieczka
```

### Tomorrow's Schedule (16:00)
```
📚 PLAN LEKCJI NA JUTRO
📅 czwartek, 16 października 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ILLIA

   📖 Lekcja 1: Matematyka
      ⏰ 08:00 - 08:45
      👨‍🏫 Anna Kowalska
      🚪 Sala: 201

   🔄 Lekcja 2: Polski
      ⏰ 08:55 - 09:40
      👨‍🏫 Jan Nowak
      🚪 Sala: 105
      ℹ️ Zastępstwo
```

---

## ⚖️ Legal

- For **personal use** only
- Uses unofficial `librus-api` library
- Not endorsed by Librus
- Use at your own risk

---

## 🆘 Support

- Check logs first: `tail -f logs/error.log`
- Test manually: `node src/index.js`
- Verify `.env` credentials
- Restart launchd agent

---

## 📜 License

MIT - Free to use and modify