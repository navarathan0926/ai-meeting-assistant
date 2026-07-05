import {
  JiraAdfDocument,
  JiraAdfTextNode,
  JiraDocumentBlock,
  RawDescriptionBlock,
} from './jira-document.types';

export function normalizeRawBlock(raw: RawDescriptionBlock): JiraDocumentBlock | null {
  switch (raw.type) {
    case 'heading': {
      const level = raw.level === 3 ? 3 : 2;
      const text = raw.text.trim();
      return text ? { type: 'heading', level, text } : null;
    }
    case 'paragraph': {
      const text = raw.text.trim();
      return text ? { type: 'paragraph', text } : null;
    }
    case 'bulletList': {
      const items = (raw.items ?? []).map((i) => i.trim()).filter(Boolean);
      return items.length > 0 ? { type: 'bulletList', items } : null;
    }
    case 'orderedList': {
      const items = (raw.items ?? []).map((i) => i.trim()).filter(Boolean);
      return items.length > 0 ? { type: 'orderedList', items } : null;
    }
    case 'table': {
      const headers = (raw.headers ?? []).map((h) => h.trim()).filter(Boolean);
      const rows = (raw.rows ?? [])
        .map((row) => row.map((cell) => cell.trim()))
        .filter((row) => row.some(Boolean));
      if (headers.length === 0 && rows.length === 0) {
        return null;
      }
      return { type: 'table', headers, rows };
    }
    default:
      return null;
  }
}

export function rawBlocksToDocumentBlocks(
  rawBlocks: RawDescriptionBlock[],
): JiraDocumentBlock[] {
  return rawBlocks
    .map(normalizeRawBlock)
    .filter((block): block is JiraDocumentBlock => block !== null);
}

export function blocksToAdf(blocks: JiraDocumentBlock[]): JiraAdfDocument {
  const content = blocks
    .map(blockToAdfNode)
    .filter((node): node is NonNullable<typeof node> => node !== null);

  if (content.length === 0) {
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
    };
  }

  return { type: 'doc', version: 1, content };
}

function paragraphNode(text: string): { type: 'paragraph'; content: JiraAdfTextNode[] } {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function blockToAdfNode(block: JiraDocumentBlock) {
  switch (block.type) {
    case 'heading':
      return {
        type: 'heading' as const,
        attrs: { level: block.level },
        content: [{ type: 'text' as const, text: block.text }],
      };
    case 'paragraph': {
      const marks = block.marks?.map((mark) => ({ type: mark }));
      const node: JiraAdfTextNode = { type: 'text', text: block.text };
      if (marks?.length) {
        node.marks = marks;
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
    case 'table':
      return buildTableNode(block.headers, block.rows);
    default:
      return null;
  }
}

function buildTableNode(headers: string[], rows: string[][]) {
  const columnCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const normalizedHeaders =
    headers.length > 0
      ? padRow(headers, columnCount)
      : Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);

  const tableRows = [
    {
      type: 'tableRow' as const,
      content: normalizedHeaders.map((header) => ({
        type: 'tableHeader' as const,
        content: [paragraphNode(header)],
      })),
    },
    ...rows.map((row) => ({
      type: 'tableRow' as const,
      content: padRow(row, columnCount).map((cell) => ({
        type: 'tableCell' as const,
        content: [paragraphNode(cell)],
      })),
    })),
  ];

  return { type: 'table' as const, content: tableRows };
}

function padRow(row: string[], length: number): string[] {
  const padded = [...row];
  while (padded.length < length) {
    padded.push('');
  }
  return padded.slice(0, length);
}

export function blocksToPlainText(blocks: JiraDocumentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
        case 'paragraph':
          return block.text;
        case 'bulletList':
        case 'orderedList':
          return block.items.join(' ');
        case 'table':
          return [...block.headers, ...block.rows.flat()].join(' ');
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}

export function isValidAdfDocument(value: unknown): value is JiraAdfDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const doc = value as JiraAdfDocument;
  return (
    doc.type === 'doc' &&
    doc.version === 1 &&
    Array.isArray(doc.content) &&
    doc.content.length > 0
  );
}

export function emptyAdfDocument(): JiraAdfDocument {
  return blocksToAdf([]);
}
