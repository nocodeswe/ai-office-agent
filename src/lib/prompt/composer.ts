export interface PromptContext {
  mode: 'ask' | 'agent';
  documentContext?: { type: string; name: string; content: string };
  instructions: Array<{ title: string; content: string }>;
  messages: Array<{ role: string; content: string }>;
}

export function composeSystemPrompt(ctx: PromptContext): string {
  const parts: string[] = [];

  // Base role
  if (ctx.mode === 'ask') {
    parts.push(`You are an AI assistant for Microsoft Office documents. You are in READ-ONLY mode.
You can read, analyze, and answer questions about the document content.
You MUST NOT suggest making changes or provide instructions to modify the document.
Focus on analysis, explanation, summarization, and answering questions.`);
  } else {
    parts.push(`You are an AI assistant for Microsoft Office documents. You are in AGENT mode with read/write access.
You can read, analyze, AND modify document content.
When the user asks you to make changes, describe what changes you will make clearly.
For each change, specify the exact operation (insert, replace, delete, format, etc.).
Always confirm destructive operations before proceeding.
Log all changes you make for audit purposes.`);
  }

  // User instructions
  if (ctx.instructions.length > 0) {
    parts.push('\n--- User Instructions ---');
    ctx.instructions.forEach((inst, i) => {
      parts.push(`[${i + 1}] ${inst.title}: ${inst.content}`);
    });
  }

  // Document context
  if (ctx.documentContext) {
    parts.push(`\n--- Current Document ---`);
    parts.push(`Type: ${ctx.documentContext.type}`);
    parts.push(`Name: ${ctx.documentContext.name}`);
    if (ctx.documentContext.content) {
      const maxContentLength = 8000;
      const content =
        ctx.documentContext.content.length > maxContentLength
          ? ctx.documentContext.content.substring(0, maxContentLength) +
            '\n... [content truncated]'
          : ctx.documentContext.content;
      parts.push(`Content:\n${content}`);
    }
  }

  return parts.join('\n');
}

export function buildMessages(
  systemPrompt: string,
  chatMessages: Array<{ role: string; content: string }>
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    ...chatMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
  ];
}
