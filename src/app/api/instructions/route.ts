import { NextRequest, NextResponse } from 'next/server';
import { getAllInstructions, createInstruction } from '@/lib/db/dal';

export async function GET() {
  try {
    const instructions = getAllInstructions();
    return NextResponse.json(instructions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch instructions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content' },
        { status: 400 }
      );
    }

    const instruction = createInstruction({
      title,
      content,
      enabled: body.enabled,
      priority: body.priority,
      scope: body.scope,
      scopeValue: body.scopeValue,
    });

    return NextResponse.json(instruction, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create instruction' },
      { status: 500 }
    );
  }
}
