import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rez.iqb@gmail.com';
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendAdminApprovalRequestResend(
  userEmail: string,
  approvalToken: string,
): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const approvalUrl = `${appUrl}/api/auth/approve-resend?token=${approvalToken}`;

  const { error } = await getResend().emails.send({
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

  if (error) throw new Error(error.message);
}

export async function sendApprovalConfirmationResend(userEmail: string): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const { error } = await getResend().emails.send({
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

  if (error) throw new Error(error.message);
}
