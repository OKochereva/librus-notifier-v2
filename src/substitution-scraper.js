const logger = require('./logger');

class SubstitutionScraper {
  async detectSubstitutions(client, timetableData) {
  try {
    const jar = client.cookie;

    if (!jar) {
      logger.warn('No cookie jar found');
      return this.markAllNormal(timetableData);
    }

    // Debug: inspect the jar object itself
    logger.info(`Cookie jar type: ${typeof jar}`);
    logger.info(`Cookie jar constructor: ${jar.constructor?.name}`);
    logger.info(`Cookie jar methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(jar)).join(', ')}`);

    // Try different approaches to get cookies
    let cookieStr = '';

    // Approach 1: Try toJSON/serialize to see all cookies
    if (typeof jar.toJSON === 'function') {
      logger.info('Trying toJSON method');
      const jarData = jar.toJSON();
      logger.info(`toJSON result: ${JSON.stringify(jarData).substring(0, 200)}`);

      if (jarData && jarData.cookies && Array.isArray(jarData.cookies)) {
        logger.info(`Found ${jarData.cookies.length} cookies in jar`);
        cookieStr = jarData.cookies
          .map(c => `${c.key}=${c.value}`)
          .join('; ');
        logger.info(`Cookie string from toJSON: ${cookieStr.substring(0, 100)}...`);
      }
    }

    // Approach 2: Try getCookieString with callback (it might be async)
    if (!cookieStr && typeof jar.getCookieString === 'function') {
      logger.info('Trying getCookieString with callback');
      try {
        // Try as promise/callback
        const result = await new Promise((resolve, reject) => {
          const syncResult = jar.getCookieString('https://synergia.librus.pl', (err, cookies) => {
            if (err) reject(err);
            else resolve(cookies);
          });
          // If it returned sync, use that
          if (syncResult !== undefined) resolve(syncResult);
        });

        if (typeof result === 'string' && result) {
          cookieStr = result;
          logger.info(`Cookie string from getCookieString: ${cookieStr.substring(0, 100)}`);
        }
      } catch (e) {
        logger.info(`getCookieString callback failed: ${e.message}`);
      }
    }

    // Approach 3: Try getCookies method
    if (!cookieStr && typeof jar.getCookies === 'function') {
      logger.info('Trying getCookies method');
      try {
        const cookies = await new Promise((resolve, reject) => {
          const syncResult = jar.getCookies('https://synergia.librus.pl', (err, cookies) => {
            if (err) reject(err);
            else resolve(cookies);
          });
          if (syncResult !== undefined) resolve(syncResult);
        });

        logger.info(`Cookie type: ${typeof cookies}, isArray: ${Array.isArray(cookies)}`);

        if (cookies && Array.isArray(cookies) && cookies.length > 0) {
          logger.info(`Processing ${cookies.length} cookies as array`);
          cookieStr = cookies.map(c => `${c.key}=${c.value}`).join('; ');
        }
      } catch (e) {
        logger.info(`getCookies callback failed: ${e.message}`);
      }
    }

    if (!cookieStr) {
      logger.warn('Failed to build cookie string from jar');
      return this.markAllNormal(timetableData);
    }

    logger.info(`Cookie string built: ${cookieStr.substring(0, 100)}...`);

    // Fetch HTML using axios with the cookie jar
    const html = await this.fetchHTML(client);

    const fs = require('fs');
    fs.writeFileSync('timetable.html', html);
    logger.info('Saved timetable.html for inspection');

    const substitutionKeys = this.parseHTML(html);
    return this.enhanceTimetable(timetableData, substitutionKeys);
  } catch (error) {
    logger.warn(`Substitution detection failed: ${error.message}`);
    logger.warn(`Stack: ${error.stack}`);
    return this.markAllNormal(timetableData);
  }
}

  async fetchHTML(client) {
    try {
      const axios = require('axios');
      const wrapper = require('axios-cookiejar-support').wrapper;

      // Use axios with the same cookie jar that librus-api uses
      const axiosInstance = wrapper(axios.create({
        jar: client.cookie,
        withCredentials: true,
        maxRedirects: 10,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl,en-US;q=0.7,en;q=0.3'
        }
      }));

      logger.info('Fetching timetable HTML using axios with cookie jar');

      const response = await axiosInstance.get('https://synergia.librus.pl/przegladaj_plan_lekcji');

      logger.info(`Received HTML, length: ${response.data.length}, status: ${response.status}`);

      return response.data;
    } catch (error) {
      logger.warn(`Failed to fetch HTML with axios: ${error.message}`);
      throw error;
    }
  }

  parseHTML(html) {
    const subs = new Set();

    logger.info('Parsing HTML for substitutions');

    // Use regex to find all lesson entries with substitutions
    // Looking for cells with: data-date and containing "zastępstwo"
    const cellPattern = /<td[^>]*id="timetableEntryBox"[^>]*data-date="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g;
    let match;

    while ((match = cellPattern.exec(html)) !== null) {
      const dateStr = match[1];  // e.g., "2025-10-16"
      const cellContent = match[2];

      // Check if this cell contains a substitution marker
      const hasSubstitution = cellContent.includes('zastępstwo') ||
                             cellContent.includes('plan-lekcji-info');

      if (hasSubstitution) {
        // Parse the date to get day name
        const date = new Date(dateStr);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];

        // Extract lesson number from the title attribute: <b>Nr lekcji:</b> 2
        const lessonNoMatch = cellContent.match(/<b>Nr lekcji:<\/b>\s*(\d+)/);
        if (lessonNoMatch) {
          const lessonNo = parseInt(lessonNoMatch[1]);
          const key = `${dayName}-${lessonNo}`;
          subs.add(key);
          logger.info(`Detected substitution: ${key} on ${dateStr}`);
        } else {
          logger.warn(`Found substitution but couldn't extract lesson number for ${dateStr}`);
        }
      }
    }

    logger.info(`Total substitutions found: ${subs.size}`);
    return subs;
  }

  enhanceTimetable(timetableData, substitutionKeys) {
    if (!timetableData || !timetableData.table) return timetableData;

    logger.info(`Enhancing timetable with ${substitutionKeys.size} substitution keys`);

    for (const [day, lessons] of Object.entries(timetableData.table)) {
      lessons.forEach((lesson, idx) => {
        if (lesson) {
          const key = `${day}-${idx}`;
          const hasSubstitution = substitutionKeys.has(key);
          lesson.substitution = hasSubstitution;

          if (hasSubstitution) {
            logger.info(`Applied substitution flag to ${key}: ${lesson.subject || 'Unknown'}`);
          }
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