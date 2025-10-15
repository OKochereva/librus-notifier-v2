const logger = require('./logger');

class SubstitutionScraper {
  async detectSubstitutions(client, timetableData) {
  try {
    const jar = client.cookie;
    
    if (!jar) {
      logger.warn('No cookie jar found');
      return this.markAllNormal(timetableData);
    }

    const cookies = jar.getCookies('https://synergia.librus.pl');
    let cookieStr = '';
    
    if (Array.isArray(cookies)) {
      cookieStr = cookies.map(c => `${c.key}=${c.value}`).join('; ');
    } else {
      // cookies is an object
      cookieStr = Object.entries(cookies).map(([key, val]) => `${key}=${val}`).join('; ');
    }
    
    const html = await this.fetchHTML(cookieStr);
    
    const fs = require('fs');
    fs.writeFileSync('timetable.html', html);
    logger.info('Saved timetable.html');
    
    const substitutionKeys = this.parseHTML(html);
    return this.enhanceTimetable(timetableData, substitutionKeys);
  } catch (error) {
    logger.warn(`Substitution detection failed: ${error.message}`);
    return this.markAllNormal(timetableData);
  }
}

  fetchHTML(cookieStr) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const options = {
        hostname: 'synergia.librus.pl',
        path: '/przegladaj_plan_lekcji',
        headers: {
          'Cookie': cookieStr,
          'User-Agent': 'Mozilla/5.0'
        }
      };

      https.get(options, res => {
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => resolve(html));
      }).on('error', reject);
    });
  }

  parseHTML(html) {
    const subs = new Set();
    
    // Look for the actual green background color used by Librus
    // They use: background-color: rgb(175, 254, 189); or similar
    const lines = html.split('\n');
    
    let currentDay = null;
    let lessonNo = 0;
    
    logger.info('parsehtml');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect day headers (Monday, Tuesday, etc.)
      if (line.includes('<th') && (line.includes('Poniedziałek') || line.includes('Monday'))) {
        currentDay = 'Monday';
        lessonNo = 0;
      } else if (line.includes('<th') && (line.includes('Wtorek') || line.includes('Tuesday'))) {
        currentDay = 'Tuesday';
        lessonNo = 0;
      } else if (line.includes('<th') && (line.includes('Środa') || line.includes('Wednesday'))) {
        currentDay = 'Wednesday';
        lessonNo = 0;
      } else if (line.includes('<th') && (line.includes('Czwartek') || line.includes('Thursday'))) {
        currentDay = 'Thursday';
        lessonNo = 0;
      } else if (line.includes('<th') && (line.includes('Piątek') || line.includes('Friday'))) {
        currentDay = 'Friday';
        lessonNo = 0;
      } else if (line.includes('<th') && (line.includes('Sobota') || line.includes('Saturday'))) {
        currentDay = 'Saturday';
        lessonNo = 0;
      } else if (line.includes('<th') && (line.includes('Niedziela') || line.includes('Sunday'))) {
        currentDay = 'Sunday';
        lessonNo = 0;
      }
      
      // Detect lesson cells with zastępstwo
      if (line.includes('<td') && currentDay) {
        logger.info('line line.includes(<td)');

        const isSubstitution = line.includes('zastępstwo') || 
                              line.includes('rgb(175, 254, 189)') ||
                              line.includes('#affe') ||
                              line.includes('#AFFE');
        
        if (isSubstitution) {
          const key = `${currentDay}-${lessonNo}`;
          subs.add(key);
          logger.info(`Detected substitution: ${key}`);
        }
        
        lessonNo++;
      }
    }
    
    logger.info(`Total substitutions found: ${subs.size}`);
    return subs;
  }

  enhanceTimetable(timetableData, substitutionKeys) {
    if (!timetableData || !timetableData.table) return timetableData;

    for (const [day, lessons] of Object.entries(timetableData.table)) {
      lessons.forEach((lesson, idx) => {
        if (lesson) {
          const key = `${day}-${idx}`;
          lesson.substitution = substitutionKeys.has(key);
        }
      });
    }

    return timetableData;
  }

  markAllNormal(timetableData) {
    if (!timetableData || !timetableData.table) return timetableData;

    for (const lessons of Object.values(timetableData.table)) {
      lessons.forEach(lesson => {
        if (lesson) lesson.substitution = false;
      });
    }

    return timetableData;
  }
}

module.exports = SubstitutionScraper;