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

export async function sendReapprovalRequestResend(
  userEmail: string,
  approvalToken: string,
  feedback: { q1: number; q2: number; q3: number; q4: number; q5: number; freeText: string },
): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const approvalUrl = `${appUrl}/api/auth/approve-resend?token=${approvalToken}`;

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const feedbackHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
      <tr style="background:#f9fafb;"><td style="padding:8px 10px;color:#6b7280;width:65%">Shariah compliance accuracy</td><td style="padding:8px 10px;color:#f59e0b;">${stars(feedback.q1)} (${feedback.q1}/5)</td></tr>
      <tr><td style="padding:8px 10px;color:#6b7280;">Geopolitical Intelligence usefulness</td><td style="padding:8px 10px;color:#f59e0b;">${stars(feedback.q2)} (${feedback.q2}/5)</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:8px 10px;color:#6b7280;">Ease of use</td><td style="padding:8px 10px;color:#f59e0b;">${stars(feedback.q3)} (${feedback.q3}/5)</td></tr>
      <tr><td style="padding:8px 10px;color:#6b7280;">Data quality &amp; reliability</td><td style="padding:8px 10px;color:#f59e0b;">${stars(feedback.q4)} (${feedback.q4}/5)</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:8px 10px;color:#6b7280;">Likelihood to recommend</td><td style="padding:8px 10px;color:#f59e0b;">${stars(feedback.q5)} (${feedback.q5}/5)</td></tr>
    </table>
    ${feedback.freeText ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-top:8px;font-size:13px;color:#0c4a6e;">${feedback.freeText}</div>` : ''}
  `;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Re-access Request + Feedback: ${userEmail} — HalalStocks AI`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">Re-access Request with Feedback</h2>
        <p style="margin:0 0 16px;"><strong>${userEmail}</strong> has used their trial and is requesting continued access. Their feedback is below.</p>
        <h3 style="font-size:14px;color:#374151;margin:0 0 4px;">Feedback Summary</h3>
        ${feedbackHtml}
        <div style="margin-top:24px;">
          <a href="${approvalUrl}"
             style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:16px;">
            Approve &amp; Reset Access
          </a>
          <p style="color:#6b7280;font-size:13px;margin-top:12px;">Or copy this link:<br>${approvalUrl}</p>
        </div>
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
        <p style="margin:0 0 8px;">Your access to <strong>HalalStocks AI</strong> has been approved.</p>
        <p style="margin:0 0 16px;color:#374151;">
          You can use <strong>Analyze Stock</strong> and <strong>Geopolitical Exposure Intelligence</strong>
          up to <strong>3 times each</strong> during your trial.
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
