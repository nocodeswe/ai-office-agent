'use client';

declare const Office: any;
declare const Word: any;
declare const Excel: any;

export interface OperationResult {
  success: boolean;
  description: string;
  oldValue?: string;
  newValue?: string;
  error?: string;
}

// Word operations

export async function wordInsertText(
  text: string,
  location: 'end' | 'start' | 'replace' = 'end'
): Promise<OperationResult> {
  return new Promise((resolve) => {
    try {
      Word.run(async (context: any) => {
        const body = context.document.body;
        body.load('text');
        await context.sync();
        const oldValue = body.text;

        switch (location) {
          case 'end':
            body.insertText(text, Word.InsertLocation.end);
            break;
          case 'start':
            body.insertText(text, Word.InsertLocation.start);
            break;
          case 'replace':
            body.clear();
            body.insertText(text, Word.InsertLocation.start);
            break;
        }
        await context.sync();

        resolve({
          success: true,
          description: `Inserted text at ${location}`,
          oldValue: oldValue?.substring(0, 200),
          newValue: text.substring(0, 200),
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        description: 'Failed to insert text',
        error: error.message,
      });
    }
  });
}

export async function wordInsertTable(
  data: string[][],
  hasHeader: boolean = true
): Promise<OperationResult> {
  return new Promise((resolve) => {
    try {
      Word.run(async (context: any) => {
        const body = context.document.body;
        const table = body.insertTable(
          data.length,
          data[0]?.length || 1,
          Word.InsertLocation.end,
          data
        );
        if (hasHeader) {
          table.getCell(0, 0).parentRow.font.bold = true;
        }
        table.styleBuiltIn = Word.Style.gridTable1Light;
        await context.sync();

        resolve({
          success: true,
          description: `Inserted ${data.length}x${data[0]?.length || 0} table`,
          newValue: JSON.stringify(data).substring(0, 200),
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        description: 'Failed to insert table',
        error: error.message,
      });
    }
  });
}

export async function wordFormatSelection(format: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
}): Promise<OperationResult> {
  return new Promise((resolve) => {
    try {
      Word.run(async (context: any) => {
        const selection = context.document.getSelection();
        selection.load('text');
        await context.sync();

        if (format.bold !== undefined) selection.font.bold = format.bold;
        if (format.italic !== undefined) selection.font.italic = format.italic;
        if (format.underline !== undefined)
          selection.font.underline = format.underline ? 'Single' : 'None';
        if (format.fontSize) selection.font.size = format.fontSize;
        if (format.fontColor) selection.font.color = format.fontColor;
        if (format.highlightColor)
          selection.font.highlightColor = format.highlightColor;

        await context.sync();

        resolve({
          success: true,
          description: `Formatted selection: ${JSON.stringify(format)}`,
          oldValue: selection.text?.substring(0, 100),
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        description: 'Failed to format selection',
        error: error.message,
      });
    }
  });
}

export async function wordSearchAndReplace(
  search: string,
  replace: string
): Promise<OperationResult> {
  return new Promise((resolve) => {
    try {
      Word.run(async (context: any) => {
        const results = context.document.body.search(search, {
          matchCase: false,
          matchWholeWord: false,
        });
        results.load('items');
        await context.sync();

        const count = results.items.length;
        for (const item of results.items) {
          item.insertText(replace, Word.InsertLocation.replace);
        }
        await context.sync();

        resolve({
          success: true,
          description: `Replaced ${count} occurrence(s) of "${search}" with "${replace}"`,
          oldValue: search,
          newValue: replace,
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        description: 'Failed to search and replace',
        error: error.message,
      });
    }
  });
}

// Excel operations

export async function excelWriteRange(
  sheetName: string,
  startCell: string,
  data: (string | number)[][]
): Promise<OperationResult> {
  return new Promise((resolve) => {
    try {
      Excel.run(async (context: any) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const endCol = String.fromCharCode(
          startCell.charCodeAt(0) + data[0].length - 1
        );
        const startRow = parseInt(startCell.substring(1));
        const endRow = startRow + data.length - 1;
        const rangeAddr = `${startCell}:${endCol}${endRow}`;

        const range = sheet.getRange(rangeAddr);
        range.values = data;
        await context.sync();

        resolve({
          success: true,
          description: `Wrote data to ${sheetName}!${rangeAddr}`,
          newValue: JSON.stringify(data).substring(0, 200),
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        description: 'Failed to write range',
        error: error.message,
      });
    }
  });
}

export async function excelInsertFormula(
  sheetName: string,
  cell: string,
  formula: string
): Promise<OperationResult> {
  return new Promise((resolve) => {
    try {
      Excel.run(async (context: any) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const range = sheet.getRange(cell);
        range.formulas = [[formula]];
        await context.sync();

        resolve({
          success: true,
          description: `Set formula in ${sheetName}!${cell}`,
          newValue: formula,
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        description: 'Failed to insert formula',
        error: error.message,
      });
    }
  });
}

export function getHostType(): 'word' | 'excel' | 'powerpoint' | 'unknown' {
  try {
    if (typeof Office === 'undefined' || !Office.context) return 'unknown';
    switch (Office.context.host) {
      case Office.HostType.Word:
        return 'word';
      case Office.HostType.Excel:
        return 'excel';
      case Office.HostType.PowerPoint:
        return 'powerpoint';
      default:
        return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}
