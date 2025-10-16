# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Running the Application
- `npm start` or `node src/index.js` - Run the main librus notifier
- `npm test` or `node src/index.js --test` - Run in test mode

### Development Commands
- Check logs: `tail -f logs/info.log` (info) or `tail -f logs/error.log` (errors)
- Manual test run: `node src/index.js`
- Force launchd run: `launchctl start com.librus.notifier`
- Restart launchd service: `launchctl unload ~/Library/LaunchAgents/com.librus.notifier.plist && launchctl load ~/Library/LaunchAgents/com.librus.notifier.plist`

### Installation
- Run `chmod +x install.sh && ./install.sh` to set up the macOS launchd service

## Architecture Overview

This is a Node.js notification system for Polish school platform Librus Synergia that:
- Monitors multiple student accounts for updates (grades, messages, announcements, attendance, calendar)
- Sends Telegram notifications for new items
- Provides daily schedule summaries at 16:00
- Runs on schedule via macOS launchd (Monday-Friday 10:00, 11:30, 13:00, 14:30, 16:00, 19:00; weekends 11:00, 18:00)

### Core Components

**Main Orchestrator (`src/index.js`)**
- Entry point that coordinates all operations
- Handles dual functionality: update checking (always) + schedule sending (16:00 only)
- Manages error handling and process exit codes for blocking vs non-blocking errors

**Data Flow Pipeline**
1. `LibrusClient` - Authenticates and fetches data from Librus API
2. `StateManager` - Compares current vs previous data to detect changes
3. `ReportGenerator` / `ScheduleFormatter` - Formats notifications
4. `Notifier` - Sends via Telegram with retry logic

**State Management (`src/state-manager.js`)**
- Persists JSON state files per account in `state/` directory
- Implements duplicate detection using IDs with fallback composite key generation
- Supports configurable grade age filtering (MAX_GRADE_AGE_DAYS environment variable)
- Handles edge cases like null IDs by creating hash-based unique identifiers

**Data Fetching (`src/librus-client.js`)**
- Wraps `librus-api` library with error handling and retries
- Fetches full message content for unread messages (performance optimization)
- Handles HTML content parsing and cleaning for message bodies
- Creates composite grade IDs when API doesn't provide unique identifiers
- Integrates with SubstitutionScraper for enhanced schedule data

**Advanced Features**
- **Substitution Detection (`src/substitution-scraper.js`)**: Scrapes HTML timetable page to detect teacher substitutions, marking them with 🔄 emoji
- **Grade Filtering**: Configurable timestamp-based filtering to avoid notifications for old grades
- **Message Enhancement**: Fetches full content and properly formats HTML to readable text
- **Smart Error Handling**: Distinguishes between blocking errors (network/auth failures) and non-blocking errors (individual data fetch failures)

### Configuration

**Environment Variables** (`.env` file):
- Account credentials: `ILLIA_USERNAME`, `ILLIA_PASSWORD`, `KOSTIA_USERNAME`, `KOSTIA_PASSWORD`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Optional: `MAX_GRADE_AGE_DAYS` (default: 7), `DETAILED_GRADE_LOGGING` (default: false), `LOG_LEVEL` (default: info)

**Multi-Account Support**:
The system is hardcoded for two accounts (Illia, Kostia) in `src/config.js`. To modify accounts, update the `accounts` array.

### Data Structures

**Grade Objects**: Include subject, value, category, weight, date, teacher, comment with unique ID generation
**Message Objects**: Include sender, subject, body (full HTML-parsed content), date, read status, attachments
**Schedule Objects**: Include lesson number, subject, teacher, room, time with substitution/cancellation flags

### Critical Implementation Details

- **Duplicate Prevention**: Uses Set-based ID comparison with fallback composite key generation for grades without IDs
- **Performance**: Only fetches full message content for unread messages to minimize API calls
- **HTML Processing**: Comprehensive HTML-to-text conversion with proper line break handling
- **Cookie Management**: Complex cookie jar handling for substitution scraping with multiple fallback approaches
- **Error Resilience**: Continues processing other accounts if one fails, only exits with code 1 for blocking errors

### File Structure Significance

- `state/*.json` - Persisted account states for change detection (gitignored)
- `logs/*.log` - Application logs (gitignored)
- `src/` - All source code with clear separation of concerns
- `com.librus.notifier.plist` - macOS launchd configuration for scheduled execution