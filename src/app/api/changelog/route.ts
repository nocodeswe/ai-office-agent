import { NextRequest, NextResponse } from 'next/server';
import { getChangeLog } from '@/lib/db/dal';

export async function GET(request: NextRequest) {
  try {
    const sessionId =
      request.nextUrl.searchParams.get('sessionId') || undefined;
    const entries = getChangeLog(sessionId);
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch change log' },
      { status: 500 }
    );
  }
}
