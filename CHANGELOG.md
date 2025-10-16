# Changelog

All notable changes to the Librus notification system will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed
- **[2025-10-16]** Fixed announcement notifications not being detected due to missing unique IDs
  - Added `createAnnouncementId()` method in `LibrusClient` to generate unique IDs based on content hash
  - Enhanced announcement formatting with emoji icons (📅 for date, 👤 for author) and robust fallback logic
  - Added debug logging for missing announcement fields
  - Reset state files to regenerate proper announcement IDs
  - Location: `src/librus-client.js`, `src/report-generator.js`

### Added
- **[2025-10-16]** Enhanced announcement processing and formatting
  - Fallback logic for missing title (`announcement.subject || 'Ogłoszenie'`)
  - Fallback logic for missing date (`announcement.startDate || 'Brak daty'`)
  - Visual improvements with emoji icons in announcement notifications
  - Debug logging to identify API response field availability

## Previous Changes (Historical)

### Fixed
- **[Previous Session]** Fixed duplicate grade notifications issue
  - Added `createGradeId()` method for grades without proper IDs
  - Implemented timestamp-based grade filtering with configurable age limits
  - Enhanced state-based duplicate prevention

- **[Previous Session]** Fixed message notifications showing only metadata without content
  - Modified `fetchMessages()` to retrieve full message content for unread messages
  - Enhanced HTML-to-text conversion with proper line break handling
  - Added performance optimization to only fetch content for unread messages

### Added
- **[Previous Session]** Grade filtering configuration
  - `MAX_GRADE_AGE_DAYS` environment variable (default: 7 days)
  - `DETAILED_GRADE_LOGGING` environment variable for debug information
  - Configurable timestamp-based filtering in `StateManager`

- **[Previous Session]** Enhanced message content processing
  - Full HTML parsing and cleaning for message bodies
  - Proper line break conversion and formatting
  - Error handling for failed message content retrieval

### Enhanced
- **[Previous Session]** Substitution detection system
  - Advanced HTML scraping for teacher substitutions
  - Cookie jar handling with multiple fallback approaches
  - Visual markers (🔄 emoji) for substituted lessons

---

## Notes

- **State File Management**: When fixing ID generation issues, state files may need to be cleared and regenerated to ensure proper change detection
- **API Dependencies**: This system relies on the unofficial `librus-api` library which may change without notice
- **Error Handling**: The system distinguishes between blocking errors (network/auth failures) and non-blocking errors (individual data fetch failures)