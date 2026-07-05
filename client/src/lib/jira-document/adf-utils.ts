import {
  JiraAdfDocument,
  JiraAdfTextNode,
  JiraDocumentBlock,
} from './types';

function paragraphNode(text: string) {
  return { type: 'paragraph' as const, content: [{ type: 'text' as const, text }] };
}

export function blocksToAdf(blocks: JiraDocumentBlock[]): JiraAdfDocument {
  const content = blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return {
            type: 'heading' as const,
            attrs: { level: block.level },
            content: [{ type: 'text' as const, text: block.text }],
          };
        case 'paragraph': {
          const node: JiraAdfTextNode = { type: 'text', text: block.text };
          if (block.marks?.length) {
            node.marks = block.marks.map((mark) => ({ type: mark }));
          }
          return { type: 'paragraph' as const, content: [node] };
        }
        case 'bulletList':
          return {
            type: 'bulletList' as const,
            content: block.items.map((item) => ({
              type: 'listItem' as const,
              content: [paragraphNode(item)],
            })),
          };
        case 'orderedList':
          return {
            type: 'orderedList' as const,
            content: block.items.map((item) => ({
              type: 'listItem' as const,
              content: [paragraphNode(item)],
            })),
          };
        case 'table': {
          const columnCount = Math.max(
            block.headers.length,
            ...block.rows.map((row) => row.length),
            1,
          );
          const headers =
            block.headers.length > 0
              ? padRow(block.headers, columnCount)
              : Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);

          return {
            type: 'table' as const,
            content: [
              {
                type: 'tableRow' as const,
                content: headers.map((header) => ({
                  type: 'tableHeader' as const,
                  content: [paragraphNode(header)],
                })),
              },
              ...block.rows.map((row) => ({
                type: 'tableRow' as const,
                content: padRow(row, columnCount).map((cell) => ({
                  type: 'tableCell' as const,
                  content: [paragraphNode(cell)],
                })),
              })),
            ],
          };
        }
        default:
          return null;
      }
    })
    .filter((node): node is NonNullable<typeof node> => node !== null);

  if (content.length === 0) {
    return {
      type: 'doc',
      version: 1,
      content: [paragraphNode('')],
    };
  }

  return { type: 'doc', version: 1, content };
}

function padRow(row: string[], length: number): string[] {
  const padded = [...row];
  while (padded.length < length) {
    padded.push('');
  }
  return padded.slice(0, length);
}

function extractText(content: unknown[] | undefined): string {
  if (!content) {
    return '';
  }
  return content
    .filter((n): n is { type: string; text?: string } => typeof n === 'object' && n !== null)
    .map((n) => {
      if (n.type === 'hardBreak') {
        return '\n';
      }
      if (n.type === 'text') {
        return n.text ?? '';
      }
      return '';
    })
    .join('');
}

function extractListItems(
  content: unknown[] | undefined,
  preserveEmpty = false,
): string[] {
  if (!content) {
    return [];
  }
  const items = content
    .filter((n): n is { type: string; content?: unknown[] } => typeof n === 'object' && n !== null)
    .filter((n) => n.type === 'listItem')
    .map((item) => {
      const paragraph = item.content?.[0] as { content?: unknown[] } | undefined;
      return extractText(paragraph?.content);
    });

  return preserveEmpty ? items : items.filter(Boolean);
}

function extractTable(content: unknown[] | undefined): {
  headers: string[];
  rows: string[][];
} {
  if (!content?.length) {
    return { headers: [], rows: [] };
  }

  const rows = content.filter(
    (n): n is { type: string; content?: unknown[] } =>
      typeof n === 'object' && n !== null && (n as { type: string }).type === 'tableRow',
  );

  const headers =
    rows.length > 0
      ? (rows[0].content ?? [])
          .filter(
            (c): c is { type: string; content?: unknown[] } =>
              typeof c === 'object' &&
              c !== null &&
              (c as { type: string }).type === 'tableHeader',
          )
          .map((cell) => extractText(cell.content))
      : [];

  const dataRows = rows.slice(headers.length > 0 ? 1 : 0).map((row) =>
    (row.content ?? [])
      .filter((c): c is { type: string; content?: unknown[] } => typeof c === 'object' && c !== null)
      .map((cell) => extractText(cell.content)),
  );

  return { headers, rows: dataRows };
}

export interface AdfToBlocksOptions {
  /** Keep empty headings, paragraphs, and list items — required for in-place editing. */
  preserveEmpty?: boolean;
}

export function adfToBlocks(
  doc: JiraAdfDocument,
  options?: AdfToBlocksOptions,
): JiraDocumentBlock[] {
  const preserveEmpty = options?.preserveEmpty ?? false;
  const blocks: JiraDocumentBlock[] = [];

  for (const node of doc.content) {
    switch (node.type) {
      case 'heading': {
        const text = extractText(node.content);
        if (preserveEmpty || text) {
          const level = node.attrs.level;
          blocks.push({
            type: 'heading',
            level: level === 1 || level === 3 ? level : 2,
            text,
          });
        }
        break;
      }
      case 'paragraph': {
        const text = extractText(node.content);
        if (preserveEmpty || text) {
          blocks.push({ type: 'paragraph', text });
        }
        break;
      }
      case 'bulletList': {
        const items = extractListItems(node.content, preserveEmpty);
        if (items.length > 0) {
          blocks.push({ type: 'bulletList', items });
        }
        break;
      }
      case 'orderedList': {
        const items = extractListItems(node.content, preserveEmpty);
        if (items.length > 0) {
          blocks.push({ type: 'orderedList', items });
        }
        break;
      }
      case 'table': {
        const { headers, rows } = extractTable(node.content);
        if (headers.length > 0 || rows.length > 0) {
          blocks.push({ type: 'table', headers, rows });
        }
        break;
      }
      default:
        break;
    }
  }

  return blocks;
}

export function adfDocumentsEqual(a: JiraAdfDocument, b: JiraAdfDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
