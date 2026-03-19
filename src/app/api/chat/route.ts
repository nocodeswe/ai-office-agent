import { NextRequest, NextResponse } from 'next/server';
import {
  getProvider,
  getModelsByProvider,
  getActiveInstructions,
  getMessagesBySession,
  createMessage,
} from '@/lib/db/dal';
import { createProvider } from '@/lib/providers';
import { composeSystemPrompt, buildMessages } from '@/lib/prompt/composer';
import type { ChatMode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, content, mode, providerId, modelId, documentContext } =
      body;

    if (!sessionId || !content || !mode || !providerId || !modelId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: sessionId, content, mode, providerId, modelId',
        },
        { status: 400 }
      );
    }

    const provider = getProvider(providerId);
    const selectedModel = getModelsByProvider(providerId).find(
      (item) => item.id === modelId
    );
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    if (!selectedModel) {
      return NextResponse.json(
        { error: 'Model not found for provider' },
        { status: 404 }
      );
    }

    const instructions = getActiveInstructions();
    const sessionMessages = getMessagesBySession(sessionId);

    createMessage({
      sessionId,
      role: 'user',
      content,
      mode: mode as ChatMode,
      modelId,
    });

    const systemPrompt = composeSystemPrompt({
      mode: mode as 'ask' | 'agent',
      documentContext,
      instructions,
      messages: sessionMessages,
    });

    const messages = buildMessages(systemPrompt, [
      ...sessionMessages,
      { role: 'user', content },
    ]);

    const adapter = createProvider(provider);

    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const gen = adapter.chatStream({
            messages,
            model: selectedModel.modelId,
            maxTokens: provider.maxTokens,
            temperature: provider.temperature,
            stream: true,
          });

          for await (const chunk of gen) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: chunk })}\n\n`
              )
            );
          }

          const savedMessage = createMessage({
            sessionId,
            role: 'assistant',
            content: fullResponse,
            mode: mode as ChatMode,
            modelId,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, messageId: savedMessage.id })}\n\n`
            )
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Streaming failed';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
