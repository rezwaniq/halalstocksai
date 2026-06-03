import nodemailer from 'nodemailer';

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || '465');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    family: 4, // force IPv4 — Railway can't reach Gmail's IPv6 addresses
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  } as any);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rez.iqb@gmail.com';
const FROM = `"HalalStocks AI" <${process.env.SMTP_USER || ADMIN_EMAIL}>`;

export async function sendAdminApprovalRequest(
  userEmail: string,
  approvalToken: string,
): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const approvalUrl = `${appUrl}/api/auth/approve?token=${approvalToken}`;

  await createTransport().sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New Trial Request: ${userEmail} — HalalStocks AI`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">New Access Request</h2>
        <p style="margin:0 0 16px;"><strong>${userEmail}</strong> has requested trial access to HalalStocks AI.</p>
        <a href="${approvalUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:16px;">
          Approve Access
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:12px;">Or copy this link:<br>${approvalUrl}</p>
      </div>
    `,
  });
}

export async function sendApprovalConfirmation(userEmail: string): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  await createTransport().sendMail({
    from: FROM,
    to: userEmail,
    subject: 'Your HalalStocks AI Trial Access is Approved!',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">You're Approved!</h2>
        <p style="margin:0 0 8px;">Your trial access to <strong>HalalStocks AI</strong> has been approved.</p>
        <p style="margin:0 0 16px;color:#374151;">
          You can use <strong>Analyze Stock</strong> and <strong>Geopolitical Exposure Intelligence</strong>
          up to <strong>3 times each per 24 hours</strong>.
        </p>
        <a href="${appUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:16px;">
          Open HalalStocks AI
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:12px;">
          Just enter your email address (<strong>${userEmail}</strong>) when prompted to access the analyzer.
        </p>
      </div>
    `,
  });
}
