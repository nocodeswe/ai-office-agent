import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, createSession } from '@/lib/db/dal';

export async function GET() {
  try {
    const sessions = getAllSessions().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, documentName, documentType, mode, providerId, modelId } =
      body;

    if (!documentType || !mode || !providerId || !modelId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: documentType, mode, providerId, modelId',
        },
        { status: 400 }
      );
    }

    const session = createSession({
      title: title || 'New Chat',
      documentName,
      documentType,
      mode,
      providerId,
      modelId,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
