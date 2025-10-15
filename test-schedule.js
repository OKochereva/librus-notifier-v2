const Librus = require('librus-api');

async function test() {
  const client = new Librus();
  await client.authorize('12139172', 'h8C(jDJcEkCQ3X76');
  const timetable = await client.calendar.getTimetable();
  
  // Check if any lesson has substitution fields
  for (const [day, lessons] of Object.entries(timetable.table || {})) {
    lessons.forEach((lesson, idx) => {
      if (lesson) {
        console.log(`${day} Lesson ${idx + 1}:`, JSON.stringify(lesson, null, 2));
      }
    });
  }
}

test();