// api/send-sms.js  —  Vercel serverless function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, from, body, accountSid, authToken } = req.body || {};
  if (!to || !from || !body || !accountSid || !authToken)
    return res.status(400).json({ error: 'Missing required fields' });

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await r.json();
    if (r.ok) return res.status(200).json({ success: true, sid: data.sid });
    return res.status(r.status).json({ error: data.message || 'Twilio error', details: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
