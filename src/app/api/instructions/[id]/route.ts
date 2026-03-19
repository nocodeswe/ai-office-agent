import { NextRequest, NextResponse } from 'next/server';
import {
  getInstruction,
  updateInstruction,
  deleteInstruction,
} from '@/lib/db/dal';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instruction = getInstruction(params.id);
    if (!instruction) {
      return NextResponse.json(
        { error: 'Instruction not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(instruction);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch instruction' },
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
    const instruction = updateInstruction(params.id, body);
    if (!instruction) {
      return NextResponse.json(
        { error: 'Instruction not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(instruction);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update instruction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = deleteInstruction(params.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Instruction not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete instruction' },
      { status: 500 }
    );
  }
}
