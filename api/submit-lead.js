export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, subject } = req.body;

  // Build DumpdataObjectId: DDMMYYHHMMSS
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const DD  = pad(now.getDate());
  const MM  = pad(now.getMonth() + 1);
  const YY  = String(now.getFullYear()).slice(-2);
  const HH  = pad(now.getHours());
  const Min = pad(now.getMinutes());
  const SS  = pad(now.getSeconds());
  const dumpId = `${DD}${MM}${YY}${HH}${Min}${SS}`;

  // Strip country code / spaces / symbols from phone
  const cleanPhone = phone
    ? phone.replace(/[\s\+\-\(\)]/g, '').replace(/^91/, '')
    : '';

  const payload = {
    firstName:           name  || '',
    lastName:            name  || '',
    email:               email || '',
    countryCode1:        '91',
    mobilePhone:         cleanPhone,
    comments:            subject || 'Landing Page Enquiry',
    originFrom:          'Landing Page',
    product:             'AP4 LEASING',
    campaign:            'AP4 LEASING',
    externalAPIObjectId: 'LiWebsitenkedIn',
    DumpdataObjectId:    dumpId,
    tenantId:            '984'
  };

  // Run CRM + email + Sheets in parallel; allSettled means no single failure
  // blocks the others or the redirect.
  const [crmResult, emailResult, sheetsResult] = await Promise.allSettled([
    fetch(
      'https://fvintegration.farvisioncloud.com/LeadSync/api/SyncLeadsV2/RawLeads',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    ).catch(err => { console.error('CRM error:', err.message); }),

    sendEmail({ name, email, phone, subject })
      .catch(err => { console.error('Resend email failed:', err.message); }),

    appendToSheet({ name, email, phone, subject })
      .catch(err => { console.error('Sheets error:', err.message); }),
  ]);

  console.log('CRM:', crmResult.status, '| Email:', emailResult.status, '| Sheets:', sheetsResult.status);

  return res.status(200).json({ success: true });
}

async function appendToSheet({ name, email, phone, subject }) {
  const WEBHOOK = process.env.GOOGLE_SHEET_WEBHOOK;
  if (!WEBHOOK) {
    console.log('GOOGLE_SHEET_WEBHOOK not set — skipping Sheets');
    return;
  }

  const response = await fetch(WEBHOOK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, phone, subject }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sheets webhook error: ${err}`);
  }
}

async function sendEmail({ name, email, phone, subject }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — skipping email');
    return;
  }

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const html = `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.8;color:#1a1a1a;max-width:480px">
      <h2 style="margin:0 0 20px;font-size:18px;color:#1a1a1a">New Enquiry — AP4 Tech Park</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;width:110px">Name</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:500">${name || '-'}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Enquiry</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:500">${subject || '-'}</td></tr>
        ${email ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee">${email}</td></tr>` : ''}
        ${phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Phone</td><td style="padding:8px 0;border-bottom:1px solid #eee">${phone}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#666">Submitted</td><td style="padding:8px 0">${now} IST</td></tr>
      </table>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'AP4 Tech Park <onboarding@resend.dev>',
      to:      'vishnu@inkmedia.in',
      subject: 'AP4 Tech Park Landing Page Enquiry',
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${err}`);
  }
}
