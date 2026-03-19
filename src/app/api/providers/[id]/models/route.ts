import { NextRequest, NextResponse } from 'next/server';
import {
  getProvider,
  getModelsByProvider,
  deleteModelsByProvider,
  createModel,
} from '@/lib/db/dal';
import { createProvider } from '@/lib/providers';

export async function GET(
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
    const remoteModels = await adapter.listModels();
    const savedModels = getModelsByProvider(params.id);
    const enabledByModelId = new Map(
      savedModels.map((model) => [model.modelId, model.enabled])
    );

    const models = remoteModels.map((model) => ({
      modelId: model.id,
      name: model.name,
      enabled: enabledByModelId.get(model.id) ?? false,
    }));

    return NextResponse.json(models);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models from provider' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const { models } = body;

    if (!Array.isArray(models)) {
      return NextResponse.json(
        { error: 'Missing required field: models (array)' },
        { status: 400 }
      );
    }

    deleteModelsByProvider(params.id);

    const saved = models.map(
      (m: { modelId: string; name: string; enabled?: boolean }) =>
        createModel({
          providerId: params.id,
          modelId: m.modelId,
          name: m.name,
          enabled: m.enabled,
        })
    );

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sync models' },
      { status: 500 }
    );
  }
}
