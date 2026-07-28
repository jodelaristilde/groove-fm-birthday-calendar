// api/calendar.ics.js
//
// Live birthday calendar feed. Your phone's calendar app subscribes to this
// URL once and re-checks it periodically on its own — so whenever staff
// birthdays are added/edited/removed in the app, your phone calendar stays
// in sync automatically, with no re-importing.
//
// It reads the SAME JSONbin.io data the app already syncs to (the Bin ID
// and Master Key you entered under Settings → Cloud sync), and turns every
// staff birthday into a yearly-recurring all-day calendar event.
//
// Setup: drop this file into your repo's  api/  folder (same folder as
// send-sms.js) and push to GitHub. Vercel auto-deploys it.
//
// The subscribe link is generated for you in the app under
// Settings → "📅 Live calendar sync" once Cloud sync is connected.

export default async function handler(req, res) {
  try {
    const { bin, key } = req.query;

    if (!bin || !key) {
      res.status(400).send('Missing bin or key query parameter.');
      return;
    }

    const jbRes = await fetch(`https://api.jsonbin.io/v3/b/${bin}/latest`, {
      headers: { 'X-Master-Key': key },
    });

    if (!jbRes.ok) {
      res.status(502).send('Could not load staff data — check the Bin ID and Key.');
      return;
    }

    const data = await jbRes.json();
    const birthdays = (data && data.record && data.record.birthdays) || [];

    const pad = (n) => String(n).padStart(2, '0');

    // Accepts "YYYY-MM-DD" or things like "Apr 12"
    function parseDateStr(ds) {
      if (!ds) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
        const d = new Date(ds + 'T00:00:00Z');
        return { m: d.getUTCMonth(), d: d.getUTCDate() };
      }
      const d = new Date(ds + ' 2000');
      if (!isNaN(d)) return { m: d.getMonth(), d: d.getDate() };
      return null;
    }

    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Groove FM Birthday Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Staff Birthdays',
      'X-WR-CALDESC:Auto-updating staff birthday calendar',
      'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
      'X-PUBLISHED-TTL:PT12H',
    ];

    birthdays.forEach((b) => {
      const p = parseDateStr(b.date);
      if (!p) return;

      // Anchor the first occurrence in the past so RRULE:FREQ=YEARLY covers
      // every year going forward, regardless of when this feed is generated.
      const startYear = now.getFullYear() - 1;
      const start = new Date(Date.UTC(startYear, p.m, p.d));
      const end = new Date(Date.UTC(startYear, p.m, p.d));
      end.setUTCDate(end.getUTCDate() + 1);

      const startStr = `${start.getUTCFullYear()}${pad(start.getUTCMonth() + 1)}${pad(start.getUTCDate())}`;
      const endStr = `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}`;
      const uid = `bday-${b.id || (b.name || '').replace(/\s+/g, '')}-${p.m}-${p.d}@groovefm-birthdays`;
      const name = (b.name || 'Staff member').replace(/,/g, '\\,');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${startStr}T000000Z`,
        `DTSTART;VALUE=DATE:${startStr}`,
        `DTEND;VALUE=DATE:${endStr}`,
        'RRULE:FREQ=YEARLY',
        `SUMMARY:🎂 ${name}'s Birthday`,
        `DESCRIPTION:Don't forget to wish ${name} a happy birthday!`,
        // 7:00 AM same-day pop-up reminder. All-day events start at
        // midnight, so a 7-hour trigger lands the alert at 7:00 AM local
        // time on the phone — no Settings changes needed by the user.
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:🎂 Today is ${name}'s Birthday!`,
        'TRIGGER:PT7H',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="staff-birthdays.ics"');
    // Let phones re-check reasonably often, but don't hammer JSONbin.
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(lines.join('\r\n'));
  } catch (e) {
    res.status(500).send('Server error building calendar feed: ' + e.message);
  }
}
