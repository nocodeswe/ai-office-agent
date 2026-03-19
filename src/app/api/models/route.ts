import { NextRequest, NextResponse } from 'next/server';
import { getAllEnabledModels, getModelsByProvider } from '@/lib/db/dal';

export async function GET(request: NextRequest) {
  try {
    const providerId = request.nextUrl.searchParams.get('providerId');

    const models = providerId
      ? getModelsByProvider(providerId).filter((m) => m.enabled)
      : getAllEnabledModels();

    return NextResponse.json(models);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
