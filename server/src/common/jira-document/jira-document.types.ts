export type JiraMark = 'strong' | 'em' | 'underline';

export interface JiraHeadingBlock {
  type: 'heading';
  level: 2 | 3;
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

export interface JiraAdfDocument {
  type: 'doc';
  version: 1;
  content: JiraAdfNode[];
}

export type JiraAdfNode =
  | { type: 'heading'; attrs: { level: number }; content: JiraAdfTextNode[] }
  | { type: 'paragraph'; content: JiraAdfTextNode[] }
  | { type: 'bulletList'; content: JiraAdfListItemNode[] }
  | { type: 'orderedList'; content: JiraAdfListItemNode[] }
  | { type: 'table'; content: JiraAdfTableRowNode[] };

export interface JiraAdfListItemNode {
  type: 'listItem';
  content: Array<{ type: 'paragraph'; content: JiraAdfTextNode[] }>;
}

export interface JiraAdfTableRowNode {
  type: 'tableRow';
  content: JiraAdfTableCellNode[];
}

export interface JiraAdfTableCellNode {
  type: 'tableHeader' | 'tableCell';
  content: Array<{ type: 'paragraph'; content: JiraAdfTextNode[] }>;
}

/** Raw block shape returned by the LLM (all fields present for strict JSON schema). */
export interface RawDescriptionBlock {
  type: 'heading' | 'paragraph' | 'bulletList' | 'orderedList' | 'table';
  level: number;
  text: string;
  items: string[];
  headers: string[];
  rows: string[][];
}
