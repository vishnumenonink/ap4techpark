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

  // Run CRM + Sheets in parallel; allSettled means one failure never blocks the other.
  const [crmResult, sheetsResult] = await Promise.allSettled([
    fetch(
      'https://fvintegration.farvisioncloud.com/LeadSync/api/SyncLeadsV2/RawLeads',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    ).catch(err => { console.error('CRM error:', err.message); }),

    appendToSheet({ name, email, phone, subject })
      .catch(err => { console.error('Sheets error:', err.message); }),
  ]);

  console.log('CRM:', crmResult.status, '| Sheets:', sheetsResult.status);

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
