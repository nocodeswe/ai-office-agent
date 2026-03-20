import { NextRequest, NextResponse } from 'next/server';
import { createChangeLogEntry, getChangeLog } from '@/lib/db/dal';

interface ChangeLogEntryPayload {
  sessionId: string;
  documentName: string;
  operationType: string;
  oldValue?: string;
  newValue?: string;
  description: string;
  modelId: string;
}

function isChangeLogEntryPayload(value: unknown): value is ChangeLogEntryPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.sessionId === 'string' &&
    typeof entry.documentName === 'string' &&
    typeof entry.operationType === 'string' &&
    typeof entry.description === 'string' &&
    typeof entry.modelId === 'string' &&
    (entry.oldValue === undefined || typeof entry.oldValue === 'string') &&
    (entry.newValue === undefined || typeof entry.newValue === 'string')
  );
}

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

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const bodyRecord = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const rawEntries: unknown[] = Array.isArray(bodyRecord?.entries) ? bodyRecord.entries : [body];

    if (rawEntries.length === 0) {
      return NextResponse.json({ error: 'No change log entries provided' }, { status: 400 });
    }

    const entries = rawEntries.map((entry) => {
      if (!isChangeLogEntryPayload(entry)) {
        throw new Error('Missing required change log fields');
      }

      return entry;
    });

    const createdEntries = entries.map((entry) => {
      return createChangeLogEntry({
        sessionId: entry.sessionId,
        documentName: entry.documentName,
        operationType: entry.operationType,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        description: entry.description,
        modelId: entry.modelId,
      });
    });

    return NextResponse.json(createdEntries, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create change log entries' },
      { status: 500 }
    );
  }
}
