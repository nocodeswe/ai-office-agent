import { NextRequest, NextResponse } from 'next/server';
import { getAllProviders, createProvider } from '@/lib/db/dal';
import type { ProviderType } from '@/types';

export async function GET() {
  try {
    const providers = getAllProviders();
    return NextResponse.json(providers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const provider = createProvider({
      name,
      type: type as ProviderType,
      apiKey: body.apiKey,
      apiBaseUrl: body.apiBaseUrl,
      timeout: body.timeout,
      retryCount: body.retryCount,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}
