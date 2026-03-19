import { NextRequest, NextResponse } from 'next/server';
import {
  getProvider,
  updateProvider,
  deleteProvider,
  deleteModelsByProvider,
} from '@/lib/db/dal';

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
    return NextResponse.json(provider);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const provider = updateProvider(params.id, body);
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(provider);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    deleteModelsByProvider(params.id);
    const deleted = deleteProvider(params.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    );
  }
}
