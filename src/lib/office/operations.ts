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

interface WordSelectionFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
}

interface ExcelRangeFormat {
  bold?: boolean;
  italic?: boolean;
  fontColor?: string;
  fillColor?: string;
  horizontalAlignment?: 'Left' | 'Center' | 'Right';
}

async function waitForOfficeReady(): Promise<void> {
  if (typeof Office === 'undefined') {
    throw new Error('Office.js is not available in the current context.');
  }

  if (typeof Office.onReady === 'function') {
    await Office.onReady();
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function runWordOperation(
  operation: (context: any) => Promise<OperationResult>
): Promise<OperationResult> {
  try {
    await waitForOfficeReady();

    if (typeof Word === 'undefined' || typeof Word.run !== 'function') {
      throw new Error('Word API is not available.');
    }

    return await Word.run(async (context: any) => operation(context));
  } catch (error) {
    return {
      success: false,
      description: 'Word operation failed',
      error: getErrorMessage(error),
    };
  }
}

async function runExcelOperation(
  operation: (context: any) => Promise<OperationResult>
): Promise<OperationResult> {
  try {
    await waitForOfficeReady();

    if (typeof Excel === 'undefined' || typeof Excel.run !== 'function') {
      throw new Error('Excel API is not available.');
    }

    return await Excel.run(async (context: any) => operation(context));
  } catch (error) {
    return {
      success: false,
      description: 'Excel operation failed',
      error: getErrorMessage(error),
    };
  }
}

function splitCellReference(cell: string): { columnLabel: string; rowNumber: number } {
  const match = cell.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${cell}`);
  }

  return {
    columnLabel: match[1],
    rowNumber: Number.parseInt(match[2], 10),
  };
}

function columnLabelToNumber(label: string): number {
  return label
    .split('')
    .reduce((accumulator, char) => accumulator * 26 + (char.charCodeAt(0) - 64), 0);
}

function columnNumberToLabel(value: number): string {
  let current = value;
  let result = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

// Word operations

export async function wordInsertText(
  text: string,
  location: 'end' | 'start' | 'replace' = 'end'
): Promise<OperationResult> {
  return runWordOperation(async (context) => {
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

    return {
      success: true,
      description: `Inserted text at ${location}`,
      oldValue: oldValue?.substring(0, 200),
      newValue: text.substring(0, 200),
    };
  });
}

export async function wordInsertParagraph(
  text: string,
  location: 'end' | 'start' = 'end'
): Promise<OperationResult> {
  return runWordOperation(async (context) => {
    const body = context.document.body;
    body.insertParagraph(text, location === 'start' ? Word.InsertLocation.start : Word.InsertLocation.end);
    await context.sync();

    return {
      success: true,
      description: `Inserted paragraph at ${location}`,
      newValue: text.substring(0, 200),
    };
  });
}

export async function wordInsertTable(
  data: string[][],
  hasHeader: boolean = true
): Promise<OperationResult> {
  return runWordOperation(async (context) => {
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

    return {
      success: true,
      description: `Inserted ${data.length}x${data[0]?.length || 0} table`,
      newValue: JSON.stringify(data).substring(0, 200),
    };
  });
}

export async function wordFormatSelection(format: WordSelectionFormat): Promise<OperationResult> {
  return runWordOperation(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text');
    await context.sync();

    if (format.bold !== undefined) selection.font.bold = format.bold;
    if (format.italic !== undefined) selection.font.italic = format.italic;
    if (format.underline !== undefined) {
      selection.font.underline = format.underline ? 'Single' : 'None';
    }
    if (format.fontSize) selection.font.size = format.fontSize;
    if (format.fontColor) selection.font.color = format.fontColor;
    if (format.highlightColor) selection.font.highlightColor = format.highlightColor;

    await context.sync();

    return {
      success: true,
      description: `Formatted selection: ${JSON.stringify(format)}`,
      oldValue: selection.text?.substring(0, 100),
    };
  });
}

export async function wordReplaceSelection(text: string): Promise<OperationResult> {
  return runWordOperation(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text');
    await context.sync();

    const oldValue = selection.text;
    selection.insertText(text, Word.InsertLocation.replace);
    await context.sync();

    return {
      success: true,
      description: 'Replaced selected text',
      oldValue: oldValue?.substring(0, 200),
      newValue: text.substring(0, 200),
    };
  });
}

export async function wordDeleteSelection(): Promise<OperationResult> {
  return runWordOperation(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text');
    await context.sync();

    const oldValue = selection.text;
    selection.insertText('', Word.InsertLocation.replace);
    await context.sync();

    return {
      success: true,
      description: 'Deleted the current selection',
      oldValue: oldValue?.substring(0, 200),
      newValue: '',
    };
  });
}

export async function wordSelectText(search: string): Promise<OperationResult> {
  return runWordOperation(async (context) => {
    const results = context.document.body.search(search, {
      matchCase: false,
      matchWholeWord: false,
    });
    results.load('items');
    await context.sync();

    const target = results.items[0];
    if (!target) {
      return {
        success: false,
        description: `Could not find text: ${search}`,
        error: `No match found for \"${search}\".`,
      };
    }

    target.select();
    target.load('text');
    await context.sync();

    return {
      success: true,
      description: `Selected the first occurrence of \"${search}\"`,
      oldValue: target.text?.substring(0, 200),
    };
  });
}

export async function wordApplyStylePreset(
  style: 'normal' | 'heading1' | 'heading2' | 'title' | 'quote' | 'emphasis'
): Promise<OperationResult> {
  const presetMap: Record<string, WordSelectionFormat> = {
    normal: { bold: false, italic: false, underline: false, fontSize: 11, highlightColor: '#FFFFFF' },
    heading1: { bold: true, fontSize: 24, fontColor: '#0F172A' },
    heading2: { bold: true, fontSize: 18, fontColor: '#1E293B' },
    title: { bold: true, fontSize: 28, fontColor: '#1D4ED8' },
    quote: { italic: true, fontColor: '#475569', highlightColor: '#FEF3C7' },
    emphasis: { bold: true, italic: true, fontColor: '#B45309' },
  };

  return wordFormatSelection(presetMap[style] ?? presetMap.normal);
}

export async function wordSearchAndReplace(
  search: string,
  replace: string
): Promise<OperationResult> {
  return runWordOperation(async (context) => {
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

    return {
      success: true,
      description: `Replaced ${count} occurrence(s) of "${search}" with "${replace}"`,
      oldValue: search,
      newValue: replace,
    };
  });
}

// Excel operations

export async function excelWriteRange(
  sheetName: string,
  startCell: string,
  data: (string | number)[][]
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const { columnLabel, rowNumber } = splitCellReference(startCell);
    const endColumn = columnNumberToLabel(
      columnLabelToNumber(columnLabel) + (data[0]?.length || 1) - 1
    );
    const endRow = rowNumber + data.length - 1;
    const rangeAddr = `${startCell.toUpperCase()}:${endColumn}${endRow}`;

    const range = sheet.getRange(rangeAddr);
    range.values = data;
    await context.sync();

    return {
      success: true,
      description: `Wrote data to ${sheetName}!${rangeAddr}`,
      newValue: JSON.stringify(data).substring(0, 200),
    };
  });
}

export async function excelReadRange(
  sheetName: string,
  rangeAddress: string
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(rangeAddress.toUpperCase());
    range.load('values');
    await context.sync();

    return {
      success: true,
      description: `Read ${sheetName}!${rangeAddress.toUpperCase()}`,
      newValue: JSON.stringify(range.values).substring(0, 200),
    };
  });
}

export async function excelClearRange(
  sheetName: string,
  rangeAddress: string
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(rangeAddress.toUpperCase());
    range.load('values');
    await context.sync();

    const oldValue = JSON.stringify(range.values).substring(0, 200);
    range.clear();
    await context.sync();

    return {
      success: true,
      description: `Cleared ${sheetName}!${rangeAddress.toUpperCase()}`,
      oldValue,
      newValue: '',
    };
  });
}

export async function excelInsertFormula(
  sheetName: string,
  cell: string,
  formula: string
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(cell.toUpperCase());
    range.formulas = [[formula]];
    await context.sync();

    return {
      success: true,
      description: `Set formula in ${sheetName}!${cell.toUpperCase()}`,
      newValue: formula,
    };
  });
}

export async function excelSetActiveWorksheet(
  sheetName: string
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    sheet.activate();
    await context.sync();

    return {
      success: true,
      description: `Activated worksheet ${sheetName}`,
      newValue: sheetName,
    };
  });
}

export async function excelFormatRange(
  sheetName: string,
  rangeAddress: string,
  format: ExcelRangeFormat
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(rangeAddress.toUpperCase());

    if (format.bold !== undefined) range.format.font.bold = format.bold;
    if (format.italic !== undefined) range.format.font.italic = format.italic;
    if (format.fontColor) range.format.font.color = format.fontColor;
    if (format.fillColor) range.format.fill.color = format.fillColor;
    if (format.horizontalAlignment) range.format.horizontalAlignment = format.horizontalAlignment;

    await context.sync();

    return {
      success: true,
      description: `Formatted ${sheetName}!${rangeAddress.toUpperCase()}`,
      newValue: JSON.stringify(format),
    };
  });
}

export async function excelAutofitRange(
  sheetName: string,
  rangeAddress: string
): Promise<OperationResult> {
  return runExcelOperation(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(rangeAddress.toUpperCase());
    range.format.autofitColumns();
    range.format.autofitRows();
    await context.sync();

    return {
      success: true,
      description: `Auto-fit ${sheetName}!${rangeAddress.toUpperCase()}`,
      newValue: rangeAddress.toUpperCase(),
    };
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
