class UpcomingEventsFormatter {
  static formatUpcomingEvents(accounts, daysAhead = 2) {
    const now = new Date();

    // Create date range as simple date strings (YYYY-MM-DD) to avoid timezone issues
    // Start from today (inclusive)
    const startDateStr = this.formatDateToString(now);

    // End date is daysAhead from now (inclusive)
    const endDateObj = new Date(now);
    endDateObj.setDate(endDateObj.getDate() + daysAhead);
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
    let text = `   ${emoji} *${event.title}*\n`;

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

    text += '\n';
    return text;
  }

  static getEventEmoji(category) {
    if (!category) return '📌';

    if (category.includes('Kartkówka')) return '📝';
    if (category.includes('Sprawdzian')) return '📋';

    return '📌';
  }
}

module.exports = UpcomingEventsFormatter;
