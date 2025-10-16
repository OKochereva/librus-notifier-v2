const Librus = require('librus-api');
const logger = require('./logger');
const SubstitutionScraper = require('./substitution-scraper');

class LibrusClient {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.client = new Librus();
  }

  async login() {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Login attempt ${attempt}/${maxRetries} for user ${this.username}`);
        await this.client.authorize(this.username, this.password);
        logger.info(`Login successful for ${this.username}`);
        return true;
      } catch (error) {
        lastError = error;
        logger.warn(`Login attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          await this.sleep(30000); // Wait 30s before retry
        }
      }
    }

    throw new Error(`Login failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  async fetchAllData() {
    try {
      logger.info(`Fetching data for ${this.username}...`);

      const [grades, messages, announcements, attendance, calendar] = await Promise.all([
        this.fetchGrades(),
        this.fetchMessages(),
        this.fetchAnnouncements(),
        this.fetchAttendance(),
        this.fetchCalendar()
      ]);

      const schedule = await this.fetchSchedule();

      return {
        timestamp: new Date().toISOString(),
        grades,
        messages,
        announcements,
        schedule,
        attendance,
        calendar
      };
    } catch (error) {
      logger.error(`Error fetching data: ${error.message}`);
      throw error;
    }
  }

  async fetchGrades() {
    try {
      const data = await this.client.info.getGrades();
      const grades = [];

      // The API returns an array of subjects, each with semester data
      if (Array.isArray(data)) {
        logger.info(`Processing ${data.length} subjects for grades`);

        for (const subject of data) {
          const subjectName = subject.name || 'Unknown';

          // Each subject has a semester array
          if (Array.isArray(subject.semester)) {
            for (const semesterData of subject.semester) {
              // Each semester has a grades array
              if (Array.isArray(semesterData.grades)) {
                for (const grade of semesterData.grades) {
                  // Parse the info field to extract details
                  const info = this.parseGradeInfo(grade.info);

                  // Create a unique identifier for grades without IDs
                  const uniqueId = grade.id || this.createGradeId({
                    subject: subjectName,
                    value: grade.value,
                    date: info.date || 'Unknown',
                    teacher: info.teacher || '',
                    comment: info.comment || ''
                  });

                  grades.push({
                    id: uniqueId,
                    subject: subjectName,
                    value: grade.value,
                    category: info.category || 'Unknown',
                    weight: info.weight || 'Unknown',
                    date: info.date || 'Unknown',
                    teacher: info.teacher || '',
                    comment: info.comment || ''
                  });
                }
              }
            }
          }
        }
      }

      logger.info(`Total grades extracted: ${grades.length}`);
      return grades;
    } catch (error) {
      logger.warn(`Failed to fetch grades: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      return [];
    }
  }

  parseGradeInfo(infoString) {
    if (!infoString) return {};

    const info = {};

    // Extract category: "Kategoria: kartkówka"
    const categoryMatch = infoString.match(/Kategoria:\s*(.+?)(?:\n|$)/);
    if (categoryMatch) info.category = categoryMatch[1].trim();

    // Extract date: "Data: 2025-10-08 (śr.)"
    const dateMatch = infoString.match(/Data:\s*(.+?)(?:\n|$)/);
    if (dateMatch) info.date = dateMatch[1].trim();

    // Extract teacher: "Nauczyciel: Moździerz Tomasz"
    const teacherMatch = infoString.match(/Nauczyciel:\s*(.+?)(?:\n|$)/);
    if (teacherMatch) info.teacher = teacherMatch[1].trim();

    // Extract weight: "Waga: 5"
    const weightMatch = infoString.match(/Waga:\s*(.+?)(?:\n|$)/);
    if (weightMatch) info.weight = weightMatch[1].trim();

    // Extract comment (everything after "Komentarz:")
    const commentMatch = infoString.match(/Komentarz:\s*(.+)$/s);
    if (commentMatch) info.comment = commentMatch[1].trim();

    return info;
  }

  createGradeId(gradeData) {
    // Create a unique identifier based on grade properties
    const { subject, value, date, teacher, comment } = gradeData;
    const dataString = `${subject}-${value}-${date}-${teacher}-${comment.substring(0, 50)}`;

    // Simple hash function to create a unique ID
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `custom_${Math.abs(hash)}`;
  }

  createAnnouncementId(announcementData) {
    // Create a unique identifier based on announcement properties
    const { title, content, date, author } = announcementData;
    const dataString = `${title}-${date}-${author}-${content.substring(0, 100)}`;

    // Simple hash function to create a unique ID
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `ann_${Math.abs(hash)}`;
  }

  async fetchMessages() {
    try {
      const INBOX_FOLDER = 5; // Standard inbox folder ID
      const messageHeaders = await this.client.inbox.listInbox(INBOX_FOLDER);

      if (!Array.isArray(messageHeaders)) return [];

      const messages = [];

      // Fetch full content for unread messages (since those are what we notify about)
      for (const header of messageHeaders) {
        try {
          let body = '';
          let attachments = [];
          let hasAttachments = false;

          // Only fetch full content for unread messages to optimize performance
          if (!header.read) {
            try {
              const fullMessage = await this.client.inbox.getMessage(INBOX_FOLDER, header.id);
              body = fullMessage.content || '';
              attachments = fullMessage.files || [];
              hasAttachments = (fullMessage.files?.length || 0) > 0;

              // Add a small delay to avoid overwhelming the server
              await this.sleep(200);

            } catch (msgError) {
              logger.warn(`Failed to fetch full content for unread message ${header.id}: ${msgError.message}`);
              // Continue with empty body for this message
            }
          }

          messages.push({
            id: header.id,
            from: header.user || 'Unknown',
            subject: header.title || 'No Subject',
            body: body,
            date: header.date,
            isRead: header.read || false,
            hasAttachments: hasAttachments,
            attachments: attachments
          });

        } catch (msgError) {
          logger.warn(`Failed to process message ${header.id}: ${msgError.message}`);

          // Fallback: use header data only
          messages.push({
            id: header.id,
            from: header.user || 'Unknown',
            subject: header.title || 'No Subject',
            body: '',
            date: header.date,
            isRead: header.read || false,
            hasAttachments: false,
            attachments: []
          });
        }
      }

      const unreadCount = messages.filter(m => !m.isRead).length;
      const withContentCount = messages.filter(m => m.body).length;
      logger.info(`Fetched ${messages.length} messages (${unreadCount} unread, ${withContentCount} with content)`);
      return messages;

    } catch (error) {
      logger.warn(`Failed to fetch messages: ${error.message}`);
      return [];
    }
  }

  async fetchAnnouncements() {
    try {
      const announcements = await this.client.inbox.listAnnouncements();

      if (!Array.isArray(announcements)) {
        logger.warn('Announcements API returned non-array data');
        return [];
      }

      const processed = announcements.map(ann => {
        const title = ann.subject || ann.title || '';
        const content = ann.content || ann.body || '';
        const date = ann.date || ann.startDate || '';
        const author = ann.author || ann.user || '';

        // Create a unique identifier for announcements without IDs
        const uniqueId = ann.id || this.createAnnouncementId({
          title,
          content,
          date,
          author
        });

        const processed = {
          id: uniqueId,
          title,
          content,
          date,
          author
        };

        // Log if we're missing critical fields
        if (!processed.title) {
          logger.warn(`Announcement ${uniqueId} missing title. Raw fields: ${Object.keys(ann).join(', ')}`);
        }
        if (!processed.date) {
          logger.warn(`Announcement ${uniqueId} missing date. Raw fields: ${Object.keys(ann).join(', ')}`);
        }

        return processed;
      });

      logger.info(`Fetched ${processed.length} announcements`);
      return processed;
    } catch (error) {
      logger.warn(`Failed to fetch announcements: ${error.message}`);
      return [];
    }
  }

  async fetchSchedule() {
    try {
      const timetable = await this.client.calendar.getTimetable();
      
      // Enhance with substitution detection
      const scraper = new SubstitutionScraper();
      const enhanced = await scraper.detectSubstitutions(this.client, timetable);
      
      return enhanced || [];
    } catch (error) {
      logger.warn(`Failed to fetch schedule: ${error.message}`);
      return [];
    }
  }

  async fetchAttendance() {
    try {
      const absences = await this.client.absence.getAbsences();
      
      if (!Array.isArray(absences)) return [];
      
      return absences.map(att => ({
        id: att.id,
        date: att.date,
        lessonNo: att.lessonNo || att.number,
        type: att.type?.name || att.type,
        subject: att.subject || att.lesson?.subject
      }));
    } catch (error) {
      logger.warn(`Failed to fetch attendance: ${error.message}`);
      return [];
    }
  }

  async fetchCalendar() {
    try {
      const calendar = await this.client.calendar.getCalendar();
      
      if (!Array.isArray(calendar)) return [];
      
      return calendar.map(event => ({
        id: event.id,
        title: event.title || event.name,
        description: event.description || event.content || '',
        date: event.date || event.startDate,
        dateFrom: event.dateFrom,
        dateTo: event.dateTo,
        category: event.category || event.type,
        addedBy: event.addedBy || event.author || ''
      }));
    } catch (error) {
      logger.warn(`Failed to fetch calendar: ${error.message}`);
      return [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LibrusClient;