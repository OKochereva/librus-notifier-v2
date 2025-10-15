const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class StateManager {
  constructor() {
    this.stateDir = path.join(process.cwd(), 'state');
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

    // Find new grades
    const previousGradeIds = new Set(previousData.grades.map(g => g.id));
    changes.newGrades = currentData.grades.filter(g => !previousGradeIds.has(g.id));

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

    return changes;
  }
}

module.exports = StateManager;