class UpcomingEventsFormatter {
  static formatUpcomingEvents(accounts, daysAhead = 2) {
    const now = new Date();

    // Create date range as simple date strings (YYYY-MM-DD) to avoid timezone issues
    // Start from tomorrow (not today - we want upcoming events)
    const startDateObj = new Date(now);
    startDateObj.setDate(startDateObj.getDate() + 1);
    const startDateStr = this.formatDateToString(startDateObj);

    // End date is daysAhead from tomorrow (inclusive)
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + (daysAhead - 1));
    const endDateStr = this.formatDateToString(endDateObj);

    let report = `📝 *NADCHODZĄCE SPRAWDZIANY I KARTKÓWKI*\n`;
    report += `📅 Najbliższe ${daysAhead} dni\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let hasAnyEvents = false;

    for (const account of accounts) {
      const upcomingEvents = this.filterUpcomingEvents(
        account.calendar,
        startDateStr,
        endDateStr
      );

      if (upcomingEvents.length > 0) {
        hasAnyEvents = true;
        report += `👤 *${account.name.toUpperCase()}*\n`;

        // Sort by date
        upcomingEvents.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA - dateB;
        });

        for (const event of upcomingEvents) {
          report += this.formatEvent(event);
        }

        report += '\n';
      }
    }

    if (!hasAnyEvents) {
      report += `✨ Brak sprawdzianów i kartkówek w najbliższych ${daysAhead} dniach!\n\n`;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    return report;
  }

  static filterUpcomingEvents(calendar, startDateStr, endDateStr) {
    if (!Array.isArray(calendar)) return [];

    return calendar.filter(event => {
      // Only Kartkówka and Sprawdzian
      if (!event.category) return false;
      const isQuizOrTest =
        event.category.includes('Kartkówka') ||
        event.category.includes('Sprawdzian');

      if (!isQuizOrTest) return false;

      // Check if event is within date range
      if (!event.date) return false;

      // Simple string comparison (YYYY-MM-DD format)
      // Event dates from API are like "2025-10-23" or "2025-10-1"
      const eventDateStr = this.normalizeDateString(event.date);

      // Use <= for endDate to make it inclusive
      return eventDateStr >= startDateStr && eventDateStr <= endDateStr;
    });
  }

  static formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static normalizeDateString(dateStr) {
    // Normalize "2025-10-1" to "2025-10-01" for proper string comparison
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static formatEvent(event) {
    const emoji = this.getEventEmoji(event.category);

    // Parse and clean the title
    const cleanedTitle = this.parseEventTitle(event.title);

    let text = `   ${emoji} *${cleanedTitle}*\n`;

    if (event.date) {
      try {
        const date = new Date(event.date);
        const formatted = date.toLocaleDateString('pl-PL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        text += `      📅 ${formatted}\n`;
      } catch (e) {
        text += `      📅 ${event.date}\n`;
      }
    }

    if (event.category) {
      text += `      🏷️ ${event.category}\n`;
    }

    // Add description if available
    if (event.description && event.description.trim()) {
      const description = event.description.trim();
      // Limit description length to avoid overly long messages
      const maxLength = 200;
      const truncated = description.length > maxLength
        ? description.substring(0, maxLength) + '...'
        : description;
      text += `      📝 ${truncated}\n`;
    }

    text += '\n';
    return text;
  }

  static parseEventTitle(title) {
    if (!title) return 'Wydarzenie';

    // Pattern: "Nr lekcji: 3Język angielski, sprawdzian2a SP"
    // Extract the subject and type parts

    // Remove "Nr lekcji: X" prefix
    let cleaned = title.replace(/Nr lekcji:\s*\d+/i, '');

    // Remove room/class info like "Sala: 21", "5c SP", "2a SP"
    cleaned = cleaned.replace(/Sala:\s*\d+/gi, '');
    cleaned = cleaned.replace(/\d+[a-z]\s*SP/gi, '');

    // Clean up extra spaces and commas
    cleaned = cleaned.replace(/,\s*,/g, ',');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();

    // If title starts with comma, remove it
    if (cleaned.startsWith(',')) {
      cleaned = cleaned.substring(1).trim();
    }

    return cleaned || title;
  }

  static getEventEmoji(category) {
    if (!category) return '📌';

    if (category.includes('Kartkówka')) return '📝';
    if (category.includes('Sprawdzian')) return '📋';

    return '📌';
  }
}

module.exports = UpcomingEventsFormatter;
