import { NextRequest, NextResponse } from 'next/server';
import { approveUser, getUserByApprovalToken } from '@/lib/users';
import { sendApprovalConfirmation } from '@/lib/email';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(html('Invalid Link', 'No approval token provided.', false), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const existing = getUserByApprovalToken(token);
  if (!existing) {
    return new NextResponse(html('Invalid Token', 'This approval link is invalid or has already been used.', false), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (existing.status === 'approved') {
    return new NextResponse(html('Already Approved', `${existing.email} has already been approved.`, true), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const user = approveUser(token);
  if (!user) {
    return new NextResponse(html('Error', 'Failed to approve user.', false), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    await sendApprovalConfirmation(user.email);
  } catch (err) {
    console.error('Failed to send approval email:', err);
  }

  return new NextResponse(
    html('Access Approved!', `${user.email} has been approved and notified by email.`, true),
    { headers: { 'Content-Type': 'text/html' } },
  );
}

function html(title: string, message: string, success: boolean): string {
  const color = success ? '#16a34a' : '#dc2626';
  const icon = success ? '✓' : '✗';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — HalalStocks AI</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: #fff; border-radius: 16px; padding: 40px 48px; text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
    h1 { color: #111; font-size: 22px; margin: 0 0 12px; }
    p { color: #6b7280; font-size: 15px; margin: 0; line-height: 1.6; }
    a { display: inline-block; margin-top: 24px; background: #2563eb; color: #fff;
        padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Go to HalalStocks AI</a>
  </div>
</body>
</html>`;
}
