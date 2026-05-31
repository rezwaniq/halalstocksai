import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsageSummary } from '@/lib/users';

const SESSION_COOKIE = 'hsa_session';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ status: 'unauthenticated' });
  }

  const summary = getUsageSummary(token);
  if (!summary) {
    return NextResponse.json({ status: 'unauthenticated' });
  }

  return NextResponse.json({
    status: 'approved',
    email: summary.user.email,
    usage: {
      analyzeStock: summary.analyzeStock,
      geopoliticalExposure: summary.geopoliticalExposure,
    },
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ status: 'signed-out' });
}
