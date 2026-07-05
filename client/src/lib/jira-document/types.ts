export type JiraMark = 'strong' | 'em' | 'underline';

export interface JiraHeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface JiraParagraphBlock {
  type: 'paragraph';
  text: string;
  marks?: JiraMark[];
}

export interface JiraBulletListBlock {
  type: 'bulletList';
  items: string[];
}

export interface JiraOrderedListBlock {
  type: 'orderedList';
  items: string[];
}

export interface JiraTableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export type JiraDocumentBlock =
  | JiraHeadingBlock
  | JiraParagraphBlock
  | JiraBulletListBlock
  | JiraOrderedListBlock
  | JiraTableBlock;

export interface JiraAdfTextNode {
  type: 'text';
  text: string;
  marks?: Array<{ type: JiraMark }>;
}

export type JiraAdfInlineNode = JiraAdfTextNode | { type: 'hardBreak' };

export interface JiraAdfDocument {
  type: 'doc';
  version: 1;
  content: JiraAdfNode[];
}

export type JiraAdfNode =
  | { type: 'heading'; attrs: { level: number }; content: JiraAdfInlineNode[] }
  | { type: 'paragraph'; content: JiraAdfInlineNode[] }
  | { type: 'bulletList'; content: JiraAdfListItemNode[] }
  | { type: 'orderedList'; content: JiraAdfListItemNode[] }
  | { type: 'table'; content: JiraAdfTableRowNode[] };

export interface JiraAdfListItemNode {
  type: 'listItem';
  content: Array<{ type: 'paragraph'; content: JiraAdfInlineNode[] }>;
}

export interface JiraAdfTableRowNode {
  type: 'tableRow';
  content: JiraAdfTableCellNode[];
}

export interface JiraAdfTableCellNode {
  type: 'tableHeader' | 'tableCell';
  content: Array<{ type: 'paragraph'; content: JiraAdfInlineNode[] }>;
}

export function isJiraAdfDocument(value: unknown): value is JiraAdfDocument {
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

export function emptyJiraAdfDocument(): JiraAdfDocument {
  return {
    type: 'doc',
    version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };
}
