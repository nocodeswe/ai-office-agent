import { NextRequest, NextResponse } from 'next/server';
import {
  getAllEnabledModels,
  getAllProviders,
  getModelsByProvider,
} from '@/lib/db/dal';
import { enrichModel } from '@/lib/model-catalog';

export async function GET(request: NextRequest) {
  try {
    const providerId = request.nextUrl.searchParams.get('providerId');

    const providersById = new Map(
      getAllProviders().map((provider) => [provider.id, provider])
    );

    const models = (providerId
      ? getModelsByProvider(providerId).filter((m) => m.enabled)
      : getAllEnabledModels()
    ).map((model) => {
      const provider = providersById.get(model.providerId);
      return provider ? enrichModel(provider.type, model) : model;
    });

    return NextResponse.json(models);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
