class ReportGenerator {
  static generate(allUpdates) {
    const now = new Date();
    const dateStr = now.toLocaleString('pl-PL', { 
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let report = `📚 *RAPORT ZMIAN W LIBRUS*\n`;
    report += `📅 ${dateStr}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const accountUpdate of allUpdates) {
      report += this.formatAccountSection(accountUpdate);
    }

    return report;
  }

  static formatAccountSection({ accountName, updates }) {
    let section = `👤 *${accountName.toUpperCase()}*\n`;
    section += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (updates.newGrades && updates.newGrades.length > 0) {
      section += `📊 *NOWE OCENY (${updates.newGrades.length})*\n\n`;
      for (const grade of updates.newGrades) {
        section += this.formatGrade(grade);
      }
    }

    if (updates.newMessages && updates.newMessages.length > 0) {
      // Separate messages and notes
      const regularMessages = updates.newMessages.filter(m => !m.isNote);
      const notes = updates.newMessages.filter(m => m.isNote);

      if (regularMessages.length > 0) {
        section += `📨 *NOWE WIADOMOŚCI (${regularMessages.length})*\n\n`;
        for (const message of regularMessages) {
          section += this.formatMessage(message);
        }
      }

      if (notes.length > 0) {
        section += `📝 *NOWE UWAGI (${notes.length})*\n\n`;
        for (const note of notes) {
          section += this.formatMessage(note);
        }
      }
    }

    if (updates.newAnnouncements && updates.newAnnouncements.length > 0) {
      section += `📢 *NOWE OGŁOSZENIA (${updates.newAnnouncements.length})*\n\n`;
      for (const announcement of updates.newAnnouncements) {
        section += this.formatAnnouncement(announcement);
      }
    }

    if (updates.scheduleChanges && updates.scheduleChanges.length > 0) {
      section += `📅 *ZMIANY W PLANIE*\n\n`;
      for (const change of updates.scheduleChanges) {
        section += `   • ${change.description}\n`;
      }
      section += '\n';
    }

    if (updates.newAttendance && updates.newAttendance.length > 0) {
      section += `✅ *NOWE FREKWENCJE (${updates.newAttendance.length})*\n\n`;
      for (const att of updates.newAttendance) {
        section += this.formatAttendance(att);
      }
    }

    if (updates.newCalendarEvents && updates.newCalendarEvents.length > 0) {
      section += `📅 *NOWE WYDARZENIA (${updates.newCalendarEvents.length})*\n\n`;
      for (const event of updates.newCalendarEvents) {
        section += this.formatCalendarEvent(event);
      }
    }

    section += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    return section;
  }

  static formatGrade(grade) {
    const emoji = this.getGradeEmoji(grade.value);
    let text = `   ${emoji} *${grade.subject}* - Ocena: *${grade.value}*\n`;
    text += `      Kategoria: ${grade.category || 'N/A'}\n`;
    text += `      Waga: ${grade.weight || 'N/A'}\n`;
    text += `      Data: ${this.formatDate(grade.date)}\n`;
    if (grade.teacher) {
      text += `      Nauczyciel: ${grade.teacher}\n`;
    }
    if (grade.comment) {
      text += `      Komentarz: "${grade.comment}"\n`;
    }
    text += '\n';
    return text;
  }

  static formatMessage(message) {
    let text = `   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `   *Od:* ${message.from}\n`;
    text += `   *Temat:* ${message.subject}\n`;
    text += `   *Data:* ${this.formatDate(message.date)}\n`;
    if (message.hasAttachments) {
      text += `   📎 *Załączniki:* ${message.attachments.length}\n`;
    }
    text += `\n`;
    text += this.formatMessageBody(message.body);
    text += `   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    return text;
  }

  static formatMessageBody(body) {
    if (!body || body.trim() === '') {
      return '   [Brak treści wiadomości]\n\n';
    }

    // Convert HTML to readable text with proper line breaks
    const cleanBody = body
      .replace(/<\/p>/gi, '\n\n')     // End of paragraph becomes double newline
      .replace(/<br\s*\/?>/gi, '\n')  // Line breaks become single newline
      .replace(/<\/div>/gi, '\n')     // End of div becomes newline
      .replace(/<[^>]*>/g, '')        // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ')        // Convert non-breaking spaces
      .replace(/&amp;/g, '&')         // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    // Split into lines and clean up spacing
    const lines = cleanBody.split('\n');
    let formatted = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        formatted += `   ${trimmedLine}\n`;
      } else if (formatted.endsWith('\n') && !formatted.endsWith('\n\n')) {
        // Add empty line for paragraph breaks, but don't create multiple empty lines
        formatted += '\n';
      }
    }

    formatted += '\n';
    return formatted;
  }

  static formatAnnouncement(announcement) {
    // Ensure we have required fields with fallbacks
    const title = announcement.title || announcement.subject || 'Ogłoszenie';
    const date = announcement.date || announcement.startDate || 'Brak daty';
    const author = announcement.author || announcement.user || '';

    let text = `   *${title}*\n`;
    text += `   📅 Data: ${this.formatDate(date)}\n`;
    if (author) {
      text += `   👤 Autor: ${author}\n`;
    }
    text += `\n`;

    const content = (announcement.content || announcement.body || '').replace(/<[^>]*>/g, '').trim();
    if (content) {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          text += `   ${line.trim()}\n`;
        }
      }
    }
    text += '\n';
    return text;
  }

  static formatAttendance(att) {
    let text = `   • ${this.formatDate(att.date)} - Lekcja ${att.lessonNo}: `;
    text += `${att.type} (${att.subject})\n`;
    return text;
  }

  static formatCalendarEvent(event) {
    const emoji = this.getEventEmoji(event.category);
    let text = `   ${emoji} *${event.title}*\n`;

    if (event.date) {
      // Format date nicely
      try {
        const date = new Date(event.date);
        const formatted = date.toLocaleDateString('pl-PL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        text += `   📅 ${formatted}\n`;
      } catch (e) {
        text += `   📅 ${event.date}\n`;
      }
    }

    if (event.category) {
      text += `   🏷️ ${event.category}\n`;
    }

    if (event.description) {
      text += `   📝 ${event.description}\n`;
    }

    text += '\n';
    return text;
  }

  static getEventEmoji(category) {
    if (!category) return '📌';

    if (category.includes('Kartkówka')) return '📝';
    if (category.includes('Sprawdzian')) return '📋';
    if (category.includes('Nieobecność')) return '👤';
    if (category.includes('Zastępstwo')) return '🔄';

    return '📌';
  }

  static formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pl-PL', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateStr;
    }
  }

  static getGradeEmoji(grade) {
    const value = parseInt(grade);
    if (value >= 5) return '⭐';
    if (value >= 4) return '📝';
    if (value >= 3) return '📄';
    return '⚠️';
  }
}

module.exports = ReportGenerator;