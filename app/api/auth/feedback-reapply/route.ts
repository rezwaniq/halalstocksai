import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, reapplyUser } from '@/lib/users';
import { appendFeedback } from '@/lib/feedback';
import { sendReapprovalRequestResend } from '@/lib/email-resend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, ratings, freeText } = body as {
    email: string;
    ratings: { q1: number; q2: number; q3: number; q4: number; q5: number };
    freeText: string;
  };

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  if (!ratings || [ratings.q1, ratings.q2, ratings.q3, ratings.q4, ratings.q5].some(v => !Number.isInteger(v) || v < 1 || v > 5)) {
    return NextResponse.json({ error: 'All ratings must be integers from 1 to 5' }, { status: 400 });
  }

  const normalEmail = email.trim().toLowerCase();
  const user = getUserByEmail(normalEmail);
  if (!user) {
    return NextResponse.json({ error: 'Email not found. Please use the email you originally signed up with.' }, { status: 404 });
  }

  appendFeedback({
    email: normalEmail,
    q1: ratings.q1,
    q2: ratings.q2,
    q3: ratings.q3,
    q4: ratings.q4,
    q5: ratings.q5,
    freeText: (freeText ?? '').trim(),
  });

  const updated = reapplyUser(normalEmail);
  if (!updated) {
    return NextResponse.json({ error: 'Failed to process re-access request' }, { status: 500 });
  }

  try {
    await sendReapprovalRequestResend(normalEmail, updated.approvalToken, {
      q1: ratings.q1,
      q2: ratings.q2,
      q3: ratings.q3,
      q4: ratings.q4,
      q5: ratings.q5,
      freeText: (freeText ?? '').trim(),
    });
  } catch (err) {
    console.error('Failed to send re-approval email:', err);
  }

  return NextResponse.json({ status: 'pending' });
}
