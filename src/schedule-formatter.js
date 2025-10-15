class ScheduleFormatter {
  static formatTomorrowSchedule(accountName, timetableData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayName = tomorrow.toLocaleDateString('pl-PL', { weekday: 'long' });
    const dateStr = tomorrow.toLocaleDateString('pl-PL', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let report = `📚 *PLAN LEKCJI NA JUTRO*\n`;
    report += `📅 ${dayName}, ${dateStr}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `👤 *${accountName.toUpperCase()}*\n\n`;

    // Extract tomorrow's lessons
    const tomorrowLessons = this.extractTomorrowLessons(timetableData, tomorrow);

    if (tomorrowLessons.length === 0) {
      report += `✨ Brak lekcji!\n\n`;
    } else {
      tomorrowLessons.sort((a, b) => a.lessonNo - b.lessonNo);
      
      for (const lesson of tomorrowLessons) {
        report += this.formatLesson(lesson);
      }
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    return report;
  }

  static extractTomorrowLessons(timetableData, tomorrow) {
    const lessons = [];
    
    if (!timetableData || !timetableData.table) return lessons;

    const tomorrowDayIndex = tomorrow.getDay(); // 0=Sunday, 1=Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayKey = dayNames[tomorrowDayIndex];
    
    const dayLessons = timetableData.table[dayKey];
    
    if (!Array.isArray(dayLessons)) return lessons;

    dayLessons.forEach((lesson, index) => {
      if (lesson !== null) {
        lessons.push({
          lessonNo: index + 1,
          subject: lesson.subject || 'Lekcja',
          teacher: lesson.teacher || '',
          room: lesson.room || '',
          time: lesson.time || '',
          substitution: lesson.substitution || lesson.substTeacher || false,
          cancelled: lesson.cancelled || false
        });
      }
    });

    return lessons;
  }

  static getDayKey(dayIndex) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysPl = ['niedziela', 'poniedzialek', 'wtorek', 'sroda', 'czwartek', 'piatek', 'sobota'];
    return days[dayIndex] || daysPl[dayIndex] || dayIndex;
  }

  static normalizeLesson(lesson, defaultLessonNo) {
    return {
      lessonNo: lesson.lessonNo || lesson.number || defaultLessonNo,
      subject: lesson.subject?.name || lesson.subject || lesson.name || 'Lekcja',
      teacher: lesson.teacher?.firstName && lesson.teacher?.lastName 
        ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}`
        : lesson.teacher || '',
      room: lesson.room || lesson.classroom || '',
      timeFrom: lesson.timeFrom || lesson.startTime || '',
      timeTo: lesson.timeTo || lesson.endTime || '',
      substitution: lesson.substitution || false,
      cancelled: lesson.cancelled || false
    };
  }

  static formatLesson(lesson) {
    let emoji = '📖';
    if (lesson.cancelled) emoji = '❌';
    else if (lesson.substitution) emoji = '🔄';

    let text = `   ${emoji} *Lekcja ${lesson.lessonNo}*: ${lesson.subject}\n`;
    
    if (lesson.time) {
      text += `      ⏰ ${lesson.time}\n`;
    }
    
    if (lesson.teacher) {
      text += `      👨‍🏫 ${lesson.teacher}\n`;
    }
    
    if (lesson.room) {
      text += `      🚪 Sala: ${lesson.room}\n`;
    }

    if (lesson.cancelled) {
      text += `      ⚠️ *ODWOŁANA*\n`;
    } else if (lesson.substitution) {
      text += `      ℹ️ Zastępstwo\n`;
    }
    
    text += '\n';
    return text;
  }
}

module.exports = ScheduleFormatter;