// api/send-sms.js — Vercel serverless function (Node.js runtime)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const { to, from, body: msgBody, accountSid, authToken } = body || {};

  if (!to || !from || !msgBody || !accountSid || !authToken) {
    return res.status(400).json({
      error: 'Missing required fields',
      received: { to: !!to, from: !!from, body: !!msgBody, sid: !!accountSid, token: !!authToken }
    });
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: msgBody });
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authori
