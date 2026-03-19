import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/db/dal';
import { createProvider } from '@/lib/providers';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = getProvider(params.id);
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const adapter = createProvider(provider);
    const success = await adapter.testConnection();
    return NextResponse.json({ success });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Connection test failed';
    return NextResponse.json({ success: false, error: message });
  }
}
