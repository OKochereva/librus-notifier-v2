const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class StateManager {
  constructor(config = null) {
    this.stateDir = path.join(process.cwd(), 'state');
    this.config = config;
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  getStatePath(username) {
    return path.join(this.stateDir, `${username}.json`);
  }

  load(username) {
    const statePath = this.getStatePath(username);
    
    if (!fs.existsSync(statePath)) {
      logger.info(`No previous state found for ${username}, starting fresh`);
      return this.emptyState();
    }

    try {
      const data = fs.readFileSync(statePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.warn(`Failed to load state for ${username}: ${error.message}`);
      return this.emptyState();
    }
  }

  save(username, data) {
    const statePath = this.getStatePath(username);
    
    try {
      fs.writeFileSync(statePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      logger.error(`Failed to save state for ${username}: ${error.message}`);
      return false;
    }
  }

  emptyState() {
    return {
      grades: [],
      messages: [],
      announcements: [],
      schedule: [],
      attendance: []
    };
  }

  findChanges(previousData, currentData) {
    const changes = {
      hasChanges: false,
      totalCount: 0,
      newGrades: [],
      newMessages: [],
      newAnnouncements: [],
      scheduleChanges: [],
      newAttendance: []
    };

    // Find new grades with timestamp filtering
    const previousGradeIds = new Set(previousData.grades.map(g => g.id));
    const allNewGrades = currentData.grades.filter(g => !previousGradeIds.has(g.id));

    // Apply timestamp filtering for grades if configured
    changes.newGrades = this.filterGradesByDate(allNewGrades);

    // Find new unread messages
    const previousMessageIds = new Set(previousData.messages.map(m => m.id));
    changes.newMessages = currentData.messages.filter(
      m => !previousMessageIds.has(m.id) && !m.isRead
    );

    // Find new announcements
    const previousAnnouncementIds = new Set(previousData.announcements.map(a => a.id));
    changes.newAnnouncements = currentData.announcements.filter(
      a => !previousAnnouncementIds.has(a.id)
    );

    // Only track non-schedule changes during regular updates
    // Schedule updates are handled separately at 16:00
    changes.scheduleChanges = [];

    // Find new attendance records
    const previousAttendanceIds = new Set(previousData.attendance.map(a => a.id));
    changes.newAttendance = currentData.attendance.filter(
      a => !previousAttendanceIds.has(a.id)
    );

    // Calculate totals
    changes.totalCount =
      changes.newGrades.length +
      changes.newMessages.length +
      changes.newAnnouncements.length +
      changes.scheduleChanges.length +
      changes.newAttendance.length;

    changes.hasChanges = changes.totalCount > 0;

    // Log filtering decisions if detailed logging is enabled
    if (this.config?.gradeNotifications?.detailedLogging) {
      this.logFilteringDecisions(allNewGrades, changes.newGrades);
    }

    return changes;
  }

  filterGradesByDate(grades) {
    // If no config or filtering disabled, return all grades
    if (!this.config?.gradeNotifications?.maxGradeAgeDays ||
        this.config.gradeNotifications.maxGradeAgeDays === 0) {
      return grades;
    }

    const maxAgeMs = this.config.gradeNotifications.maxGradeAgeDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    return grades.filter(grade => {
      const gradeDate = this.parseGradeDate(grade.date);

      if (!gradeDate) {
        // If we can't parse the date, include the grade to be safe
        logger.warn(`Could not parse grade date: ${grade.date} for grade ${grade.id}`);
        return true;
      }

      return gradeDate >= cutoffDate;
    });
  }

  parseGradeDate(dateString) {
    if (!dateString || dateString === 'Unknown') {
      return null;
    }

    // Handle format like "2025-10-16 (czw.)" or "2025-10-14 (wt.)"
    const dateMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }

    // Fallback: try to parse the string directly
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  logFilteringDecisions(allNewGrades, filteredGrades) {
    const filtered = allNewGrades.length - filteredGrades.length;

    if (filtered > 0) {
      logger.info(`Grade filtering: ${allNewGrades.length} new grades found, ${filtered} filtered out due to age, ${filteredGrades.length} will be notified`);

      const filteredOut = allNewGrades.filter(grade => !filteredGrades.includes(grade));
      for (const grade of filteredOut) {
        logger.info(`Filtered out grade: ${grade.subject} - ${grade.value} (date: ${grade.date}) - too old`);
      }
    } else {
      logger.info(`Grade filtering: ${allNewGrades.length} new grades found, all within notification window`);
    }
  }
}

module.exports = StateManager;