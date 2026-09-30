import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, sport } = req.body;

  if (!name || !email || !phone || !sport) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const [emailResult, sheetsResult] = await Promise.allSettled([
    sendEmail({ name, email, phone, sport, timestamp: now }),
    appendToSheet({ name, email, phone, sport, timestamp: now }),
  ]);

  console.log('Email:', emailResult.status, '| Sheets:', sheetsResult.status);
  if (emailResult.reason)  console.error('Email error:', emailResult.reason);
  if (sheetsResult.reason) console.error('Sheets error:', sheetsResult.reason);

  return res.status(200).json({ success: true });
}

async function sendEmail({ name, email, phone, sport, timestamp }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not set — skipping email');
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from:    'AP4 Tech Park <noreply@ap4techpark.com>',
    to:      ['amarbuilderssocial@gmail.com'],
    subject: `Sports Fest Registration — ${name} (${sport})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e5e0d8;">
        <div style="background:#b8963e;padding:24px 32px;">
          <h2 style="margin:0;font-size:20px;color:#ffffff;">New Sports Fest Registration</h2>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.80);">AP4 FM Global Sports Fest · 31 Oct 2026</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;font-size:15px;color:#060e1a;">
            <tr style="border-bottom:1px solid #e5e0d8;">
              <td style="padding:12px 0;color:#6b7280;width:120px;">Name</td>
              <td style="padding:12px 0;font-weight:500;">${escHtml(name)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e0d8;">
              <td style="padding:12px 0;color:#6b7280;">Email</td>
              <td style="padding:12px 0;">${escHtml(email)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e0d8;">
              <td style="padding:12px 0;color:#6b7280;">Phone</td>
              <td style="padding:12px 0;">${escHtml(phone)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#6b7280;">Sport</td>
              <td style="padding:12px 0;color:#b8963e;font-weight:600;">${escHtml(sport)}</td>
            </tr>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Submitted: ${timestamp}</p>
        </div>
      </div>
    `,
  });
}

async function appendToSheet({ name, email, phone, sport, timestamp }) {
  const WEBHOOK = process.env.SPORTS_FEST_SHEET_WEBHOOK;
  if (!WEBHOOK) {
    console.log('SPORTS_FEST_SHEET_WEBHOOK not set — skipping Sheets');
    return;
  }

  const res = await fetch(WEBHOOK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, phone, sport, timestamp }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets webhook error: ${err}`);
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
