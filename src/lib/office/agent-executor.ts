'use client';

import type { OperationResult } from '@/lib/office/operations';
import {
  excelAutofitRange,
  excelClearRange,
  excelFormatRange,
  excelInsertFormula,
  excelReadRange,
  excelSetActiveWorksheet,
  excelSetRangeBorders,
  excelSetRangeNumberFormat,
  excelMergeRange,
  excelResizeRange,
  excelUnmergeRange,
  excelWriteRange,
  getHostType,
  wordApplyParagraphStyle,
  wordApplyStylePreset,
  wordDeleteSelection,
  wordFormatSelection,
  wordFormatParagraph,
  wordFormatTableCell,
  wordInsertParagraph,
  wordInsertText,
  wordReadTableCell,
  wordReplaceSelection,
  wordSearchAndReplace,
  wordSelectText,
  wordWriteTableCell,
} from '@/lib/office/operations';

type WordOperation =
  | {
      type: 'word.insert_text';
      text: string;
      location?: 'end' | 'start' | 'replace';
    }
  | {
      type: 'word.insert_paragraph';
      text: string;
      location?: 'end' | 'start';
    }
  | {
      type: 'word.replace_selection';
      text: string;
    }
  | {
      type: 'word.delete_selection';
    }
  | {
      type: 'word.search_replace';
      search: string;
      replace: string;
    }
  | {
      type: 'word.select_text';
      search: string;
    }
  | {
      type: 'word.format_selection';
      format: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        fontSize?: number;
        fontColor?: string;
        highlightColor?: string;
      };
    }
  | {
      type: 'word.apply_style';
      style: 'normal' | 'heading1' | 'heading2' | 'title' | 'quote' | 'emphasis';
    }
  | {
      type: 'word.apply_paragraph_style';
      style: 'normal' | 'heading1' | 'heading2' | 'heading3' | 'title' | 'quote' | 'list';
    }
  | {
      type: 'word.format_paragraph';
      format: {
        alignment?: 'Left' | 'Center' | 'Right' | 'Justify';
        leftIndent?: number;
        rightIndent?: number;
        firstLineIndent?: number;
        spaceBefore?: number;
        spaceAfter?: number;
        lineSpacing?: number;
      };
    }
  | {
      type: 'word.read_table_cell';
      tableIndex: number;
      rowIndex: number;
      columnIndex: number;
    }
  | {
      type: 'word.write_table_cell';
      tableIndex: number;
      rowIndex: number;
      columnIndex: number;
      text: string;
    }
  | {
      type: 'word.format_table_cell';
      tableIndex: number;
      rowIndex: number;
      columnIndex: number;
      format: {
        bold?: boolean;
        italic?: boolean;
        fontColor?: string;
        fillColor?: string;
        horizontalAlignment?: 'Left' | 'Center' | 'Right';
      };
    };

type ExcelOperation =
  | {
      type: 'excel.set_active_sheet';
      sheetName: string;
    }
  | {
      type: 'excel.read_range';
      sheetName: string;
      range: string;
    }
  | {
      type: 'excel.write_range';
      sheetName: string;
      startCell: string;
      data: Array<Array<string | number>>;
    }
  | {
      type: 'excel.clear_range';
      sheetName: string;
      range: string;
    }
  | {
      type: 'excel.insert_formula';
      sheetName: string;
      cell: string;
      formula: string;
    }
  | {
      type: 'excel.format_range';
      sheetName: string;
      range: string;
      format: {
        bold?: boolean;
        italic?: boolean;
        fontColor?: string;
        fillColor?: string;
        horizontalAlignment?: 'Left' | 'Center' | 'Right';
      };
    }
  | {
      type: 'excel.autofit_range';
      sheetName: string;
      range: string;
    }
  | {
      type: 'excel.set_number_format';
      sheetName: string;
      range: string;
      numberFormat: string;
    }
  | {
      type: 'excel.set_borders';
      sheetName: string;
      range: string;
      format: {
        color?: string;
        style?: string;
      };
    }
  | {
      type: 'excel.resize_range';
      sheetName: string;
      range: string;
      size: {
        rowHeight?: number;
        columnWidth?: number;
        wrapText?: boolean;
      };
    }
  | {
      type: 'excel.merge_range';
      sheetName: string;
      range: string;
    }
  | {
      type: 'excel.unmerge_range';
      sheetName: string;
      range: string;
    };

export type OfficeAgentOperation = WordOperation | ExcelOperation;

export interface OfficeExecutionPlan {
  summary: string;
  requiresConfirmation?: boolean;
  operations: OfficeAgentOperation[];
}

export interface OfficeExecutionResult extends OperationResult {
  operationType: OfficeAgentOperation['type'];
}

const OFFICE_PLAN_PATTERN = /```office-plan\s*([\s\S]*?)```/i;

const DESTRUCTIVE_OPERATIONS = new Set<OfficeAgentOperation['type']>([
  'word.insert_text',
  'word.replace_selection',
  'word.delete_selection',
  'word.search_replace',
  'excel.write_range',
  'excel.clear_range',
  'excel.insert_formula',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePlan(payload: unknown): OfficeExecutionPlan | null {
  if (!isRecord(payload) || !Array.isArray(payload.operations)) {
    return null;
  }

  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';
  const operations = payload.operations.filter(isRecord) as OfficeAgentOperation[];
  if (!summary || operations.length === 0) {
    return null;
  }

  return {
    summary,
    requiresConfirmation: payload.requiresConfirmation === true,
    operations,
  };
}

export function extractOfficeExecutionPlan(content: string): {
  displayContent: string;
  plan: OfficeExecutionPlan | null;
} {
  const match = content.match(OFFICE_PLAN_PATTERN);
  if (!match) {
    return { displayContent: content.trim(), plan: null };
  }

  try {
    const parsed = JSON.parse(match[1]);
    const plan = normalizePlan(parsed);
    const displayContent = content.replace(match[0], '').trim();

    return {
      displayContent,
      plan,
    };
  } catch {
    return { displayContent: content.trim(), plan: null };
  }
}

export function shouldConfirmOfficeExecution(plan: OfficeExecutionPlan): boolean {
  return plan.requiresConfirmation === true || plan.operations.some((item) => DESTRUCTIVE_OPERATIONS.has(item.type));
}

export async function executeOfficeExecutionPlan(
  plan: OfficeExecutionPlan
): Promise<OfficeExecutionResult[]> {
  const hostType = getHostType();
  const results: OfficeExecutionResult[] = [];

  for (const operation of plan.operations) {
    let result: OperationResult;

    if (operation.type.startsWith('word.') && hostType !== 'word') {
      result = {
        success: false,
        description: 'Skipped Word operation',
        error: 'The current host is not Word.',
      };
      results.push({ ...result, operationType: operation.type });
      continue;
    }

    if (operation.type.startsWith('excel.') && hostType !== 'excel') {
      result = {
        success: false,
        description: 'Skipped Excel operation',
        error: 'The current host is not Excel.',
      };
      results.push({ ...result, operationType: operation.type });
      continue;
    }

    switch (operation.type) {
      case 'word.insert_text':
        result = await wordInsertText(operation.text, operation.location ?? 'end');
        break;
      case 'word.insert_paragraph':
        result = await wordInsertParagraph(operation.text, operation.location ?? 'end');
        break;
      case 'word.replace_selection':
        result = await wordReplaceSelection(operation.text);
        break;
      case 'word.delete_selection':
        result = await wordDeleteSelection();
        break;
      case 'word.search_replace':
        result = await wordSearchAndReplace(operation.search, operation.replace);
        break;
      case 'word.select_text':
        result = await wordSelectText(operation.search);
        break;
      case 'word.format_selection':
        result = await wordFormatSelection(operation.format);
        break;
      case 'word.apply_style':
        result = await wordApplyStylePreset(operation.style);
        break;
      case 'word.apply_paragraph_style':
        result = await wordApplyParagraphStyle(operation.style);
        break;
      case 'word.format_paragraph':
        result = await wordFormatParagraph(operation.format);
        break;
      case 'word.read_table_cell':
        result = await wordReadTableCell(operation.tableIndex, operation.rowIndex, operation.columnIndex);
        break;
      case 'word.write_table_cell':
        result = await wordWriteTableCell(operation.tableIndex, operation.rowIndex, operation.columnIndex, operation.text);
        break;
      case 'word.format_table_cell':
        result = await wordFormatTableCell(operation.tableIndex, operation.rowIndex, operation.columnIndex, operation.format);
        break;
      case 'excel.set_active_sheet':
        result = await excelSetActiveWorksheet(operation.sheetName);
        break;
      case 'excel.read_range':
        result = await excelReadRange(operation.sheetName, operation.range);
        break;
      case 'excel.write_range':
        result = await excelWriteRange(operation.sheetName, operation.startCell, operation.data);
        break;
      case 'excel.clear_range':
        result = await excelClearRange(operation.sheetName, operation.range);
        break;
      case 'excel.insert_formula':
        result = await excelInsertFormula(operation.sheetName, operation.cell, operation.formula);
        break;
      case 'excel.format_range':
        result = await excelFormatRange(operation.sheetName, operation.range, operation.format);
        break;
      case 'excel.autofit_range':
        result = await excelAutofitRange(operation.sheetName, operation.range);
        break;
      case 'excel.set_number_format':
        result = await excelSetRangeNumberFormat(operation.sheetName, operation.range, operation.numberFormat);
        break;
      case 'excel.set_borders':
        result = await excelSetRangeBorders(operation.sheetName, operation.range, operation.format);
        break;
      case 'excel.resize_range':
        result = await excelResizeRange(operation.sheetName, operation.range, operation.size);
        break;
      case 'excel.merge_range':
        result = await excelMergeRange(operation.sheetName, operation.range);
        break;
      case 'excel.unmerge_range':
        result = await excelUnmergeRange(operation.sheetName, operation.range);
        break;
      default:
        result = {
          success: false,
          description: 'Unsupported operation',
          error: `Unsupported operation type: ${(operation as OfficeAgentOperation).type}`,
        };
        break;
    }

    results.push({ ...result, operationType: operation.type });
  }

  return results;
}

export function summarizeOfficeExecution(results: OfficeExecutionResult[]): string {
  const successCount = results.filter((item) => item.success).length;
  const failed = results.filter((item) => !item.success);

  if (results.length === 0) {
    return 'No document operations were requested.';
  }

  if (failed.length === 0) {
    return `Applied ${successCount} document operation${successCount === 1 ? '' : 's'} successfully.`;
  }

  return `Applied ${successCount} of ${results.length} document operations. ${failed
    .map((item) => item.error || item.description)
    .join(' ')}`;
}