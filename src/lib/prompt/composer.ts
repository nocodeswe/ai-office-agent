export interface PromptContext {
  mode: 'ask' | 'agent';
  documentContext?: { type: string; name: string; content: string };
  instructions: Array<{ title: string; content: string }>;
  messages: Array<{ role: string; content: string }>;
}

function buildAgentToolInstructions(documentType?: string): string {
  const shared = `\n--- Document Action Protocol ---
When the user wants document changes, append exactly one fenced code block tagged office-plan.
The block must contain valid JSON with this shape:
\`\`\`office-plan
{
  "summary": "Short summary of intended edits",
  "requiresConfirmation": false,
  "operations": []
}
\`\`\`
Only include operations that match the current document host. Keep your normal human-readable answer outside the code block.
If no document edit is needed, omit the office-plan block entirely.
Do not claim edits were already applied. The client executes the plan after your response.`;

  if (documentType === 'word') {
    return `${shared}
Available Word operations:
- word.insert_text: { "type": "word.insert_text", "text": "...", "location": "start|end|replace" }
- word.insert_paragraph: { "type": "word.insert_paragraph", "text": "...", "location": "start|end" }
- word.replace_selection: { "type": "word.replace_selection", "text": "..." }
- word.delete_selection: { "type": "word.delete_selection" }
- word.search_replace: { "type": "word.search_replace", "search": "...", "replace": "..." }
- word.select_text: { "type": "word.select_text", "search": "anchor text" }
- word.format_selection: { "type": "word.format_selection", "format": { "bold": true, "italic": false, "underline": false, "fontSize": 14, "fontColor": "#0f172a", "highlightColor": "#fef08a" } }
- word.apply_style: { "type": "word.apply_style", "style": "normal|heading1|heading2|title|quote|emphasis" }
- word.apply_paragraph_style: { "type": "word.apply_paragraph_style", "style": "normal|heading1|heading2|heading3|title|quote|list" }
- word.format_paragraph: { "type": "word.format_paragraph", "format": { "alignment": "Center", "leftIndent": 12, "rightIndent": 12, "firstLineIndent": 18, "spaceBefore": 6, "spaceAfter": 6, "lineSpacing": 1.5 } }
- word.read_table_cell: { "type": "word.read_table_cell", "tableIndex": 0, "rowIndex": 1, "columnIndex": 2 }
- word.write_table_cell: { "type": "word.write_table_cell", "tableIndex": 0, "rowIndex": 1, "columnIndex": 2, "text": "..." }
- word.format_table_cell: { "type": "word.format_table_cell", "tableIndex": 0, "rowIndex": 1, "columnIndex": 2, "format": { "bold": true, "fillColor": "#dbeafe", "horizontalAlignment": "Center" } }`;
  }

  if (documentType === 'excel') {
    return `${shared}
Available Excel operations:
- excel.set_active_sheet: { "type": "excel.set_active_sheet", "sheetName": "Sheet1" }
- excel.read_range: { "type": "excel.read_range", "sheetName": "Sheet1", "range": "A1:C10" }
- excel.write_range: { "type": "excel.write_range", "sheetName": "Sheet1", "startCell": "A1", "data": [["Header", 123]] }
- excel.clear_range: { "type": "excel.clear_range", "sheetName": "Sheet1", "range": "B2:D20" }
- excel.insert_formula: { "type": "excel.insert_formula", "sheetName": "Sheet1", "cell": "E2", "formula": "=SUM(B2:D2)" }
- excel.format_range: { "type": "excel.format_range", "sheetName": "Sheet1", "range": "A1:E1", "format": { "bold": true, "fontColor": "#0f172a", "fillColor": "#dbeafe", "horizontalAlignment": "Center" } }
- excel.autofit_range: { "type": "excel.autofit_range", "sheetName": "Sheet1", "range": "A:E" }
- excel.set_number_format: { "type": "excel.set_number_format", "sheetName": "Sheet1", "range": "B2:B20", "numberFormat": "$#,##0.00" }
- excel.set_borders: { "type": "excel.set_borders", "sheetName": "Sheet1", "range": "A1:E10", "format": { "style": "Continuous", "color": "#94a3b8" } }
- excel.resize_range: { "type": "excel.resize_range", "sheetName": "Sheet1", "range": "A:E", "size": { "columnWidth": 18, "rowHeight": 24, "wrapText": true } }
- excel.merge_range: { "type": "excel.merge_range", "sheetName": "Sheet1", "range": "A1:E1" }
- excel.unmerge_range: { "type": "excel.unmerge_range", "sheetName": "Sheet1", "range": "A1:E1" }`;
  }

  return `${shared}
There are no direct editing tools for the current host. Provide analysis or instructions only.`;
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
    parts.push(buildAgentToolInstructions(ctx.documentContext?.type));
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
