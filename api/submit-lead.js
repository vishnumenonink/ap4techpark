import nodemailer from 'nodemailer';

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

  // Fire CRM + email in parallel
  const crmPromise = fetch(
    'https://fvintegration.farvisioncloud.com/LeadSync/api/SyncLeadsV2/RawLeads',
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    }
  ).then(r => r.text()).catch(err => `CRM error: ${err.message}`);

  const emailPromise = (async () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return 'Email skipped: SMTP env vars not set';

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: parseInt(SMTP_PORT || '587') === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const lines = [
      `Name:    ${name || '-'}`,
      `Enquiry: ${subject || '-'}`,
      email ? `Email:   ${email}` : null,
      phone ? `Phone:   ${phone}` : null,
      ``,
      `Submitted: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    ].filter(l => l !== null).join('\n');

    await transporter.sendMail({
      from:    `"AP4 Tech Park" <${SMTP_USER}>`,
      to:      'vishnu@inkmedia.in',
      subject: 'AP4 Tech Park Landing Page Enquiry',
      text:    lines,
      html:    `<pre style="font-family:sans-serif;font-size:14px;line-height:1.6">${lines}</pre>`,
    });

    return 'Email sent';
  })();

  try {
    const [crmResult, emailResult] = await Promise.all([crmPromise, emailPromise]);
    return res.status(200).json({ success: true, crm: crmResult, email: emailResult });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
