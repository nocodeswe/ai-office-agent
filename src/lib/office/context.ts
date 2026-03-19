'use client';

declare const Office: any;
declare const Word: any;
declare const Excel: any;

export interface DocumentInfo {
  type: 'word' | 'excel' | 'powerpoint' | 'unknown';
  name: string;
  content: string;
}

export async function getDocumentInfo(): Promise<DocumentInfo> {
  try {
    if (typeof Office === 'undefined' || !Office.context) {
      return { type: 'unknown', name: 'No document', content: '' };
    }

    const host = Office.context.host;
    const docName =
      Office.context.document?.url?.split('/').pop() || 'Untitled';

    switch (host) {
      case Office.HostType.Word:
        return await getWordContent(docName);
      case Office.HostType.Excel:
        return await getExcelContent(docName);
      case Office.HostType.PowerPoint:
        return await getPowerPointContent(docName);
      default:
        return { type: 'unknown', name: docName, content: '' };
    }
  } catch (error) {
    console.error('Failed to get document info:', error);
    return { type: 'unknown', name: 'Error reading document', content: '' };
  }
}

async function getWordContent(name: string): Promise<DocumentInfo> {
  return new Promise((resolve) => {
    try {
      Word.run(async (context: any) => {
        const body = context.document.body;
        body.load('text');
        await context.sync();
        resolve({ type: 'word', name, content: body.text || '' });
      });
    } catch {
      resolve({ type: 'word', name, content: '' });
    }
  });
}

async function getExcelContent(name: string): Promise<DocumentInfo> {
  return new Promise((resolve) => {
    try {
      Excel.run(async (context: any) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const usedRange = sheet.getUsedRange();
        usedRange.load('values');
        sheet.load('name');
        await context.sync();

        const sheetName = sheet.name;
        const values = usedRange.values;
        const content = values
          .map((row: any[]) => row.join('\t'))
          .join('\n');
        resolve({
          type: 'excel',
          name: `${name} [${sheetName}]`,
          content,
        });
      });
    } catch {
      resolve({ type: 'excel', name, content: '' });
    }
  });
}

async function getPowerPointContent(name: string): Promise<DocumentInfo> {
  return new Promise((resolve) => {
    try {
      Office.context.document.getSelectedDataAsync(
        Office.CoercionType.Text,
        (result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve({
              type: 'powerpoint',
              name,
              content: result.value || '',
            });
          } else {
            resolve({ type: 'powerpoint', name, content: '' });
          }
        }
      );
    } catch {
      resolve({ type: 'powerpoint', name, content: '' });
    }
  });
}
