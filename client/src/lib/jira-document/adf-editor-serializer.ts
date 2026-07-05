import type { JSONContent } from '@tiptap/core';
import {
  emptyJiraAdfDocument,
  JiraAdfDocument,
  JiraAdfNode,
  JiraAdfTextNode,
  JiraMark,
} from './types';

type TableAdfNode = Extract<JiraAdfNode, { type: 'table' }>;

type AdfInlineNode =
  | JiraAdfTextNode
  | { type: 'hardBreak' };

export interface AdfEditorState {
  content: JSONContent[];
  preservedTables: Array<{ originalIndex: number; node: TableAdfNode }>;
}

const ADF_TO_TIPTAP_MARK: Record<JiraMark, string> = {
  strong: 'bold',
  em: 'italic',
  underline: 'underline',
};

const TIPTAP_TO_ADF_MARK: Record<string, JiraMark> = {
  bold: 'strong',
  italic: 'em',
  underline: 'underline',
};

function normalizeHeadingLevel(level: unknown): 1 | 2 | 3 {
  if (level === 1 || level === 3) {
    return level;
  }
  return 2;
}

function adfMarksToTipTap(
  marks?: Array<{ type: JiraMark }>,
): JSONContent['marks'] {
  if (!marks?.length) {
    return undefined;
  }
  return marks
    .map((mark) => {
      const tipTapType = ADF_TO_TIPTAP_MARK[mark.type];
      return tipTapType ? { type: tipTapType } : null;
    })
    .filter((mark): mark is { type: string } => mark !== null);
}

function tipTapMarksToAdf(
  marks?: JSONContent['marks'],
): Array<{ type: JiraMark }> | undefined {
  if (!marks?.length) {
    return undefined;
  }
  const adfMarks = marks
    .map((mark) => {
      const adfType = TIPTAP_TO_ADF_MARK[mark.type ?? ''];
      return adfType ? { type: adfType } : null;
    })
    .filter((mark): mark is { type: JiraMark } => mark !== null);
  return adfMarks.length > 0 ? adfMarks : undefined;
}

function adfInlineToTipTap(nodes: AdfInlineNode[] | undefined): JSONContent[] {
  if (!nodes?.length) {
    return [];
  }

  return nodes.flatMap((node) => {
    if (node.type === 'hardBreak') {
      return [{ type: 'hardBreak' }];
    }
    return [{
      type: 'text',
      text: node.text,
      marks: adfMarksToTipTap(node.marks),
    }];
  });
}

function tipTapInlineToAdf(content: JSONContent[] | undefined): AdfInlineNode[] {
  if (!content?.length) {
    return [{ type: 'text', text: '' }];
  }

  const inlineNodes = content.flatMap((node): AdfInlineNode[] => {
    if (node.type === 'hardBreak') {
      return [{ type: 'hardBreak' }];
    }
    if (node.type === 'text' && node.text !== undefined) {
      const adfNode: JiraAdfTextNode = { type: 'text', text: node.text };
      const marks = tipTapMarksToAdf(node.marks);
      if (marks) {
        adfNode.marks = marks;
      }
      return [adfNode];
    }
    return [];
  });

  return inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: '' }];
}

function adfListItemsToTipTap(
  items: Array<{ type: 'listItem'; content: Array<{ type: 'paragraph'; content: AdfInlineNode[] }> }>,
): JSONContent[] {
  return items.map((item) => ({
    type: 'listItem',
    content: [
      {
        type: 'paragraph',
        content: adfInlineToTipTap(item.content[0]?.content),
      },
    ],
  }));
}

function tipTapListItemsToAdf(content: JSONContent[] | undefined) {
  return (content ?? [])
    .filter((node) => node.type === 'listItem')
    .map((item) => ({
      type: 'listItem' as const,
      content: [
        {
          type: 'paragraph' as const,
          content: tipTapInlineToAdf(item.content?.[0]?.content),
        },
      ],
    }));
}

function adfNodeToTipTap(node: JiraAdfNode): JSONContent | null {
  switch (node.type) {
    case 'paragraph':
      return {
        type: 'paragraph',
        content: adfInlineToTipTap(node.content),
      };
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: normalizeHeadingLevel(node.attrs.level) },
        content: adfInlineToTipTap(node.content),
      };
    case 'bulletList':
      return {
        type: 'bulletList',
        content: adfListItemsToTipTap(node.content),
      };
    case 'orderedList':
      return {
        type: 'orderedList',
        content: adfListItemsToTipTap(node.content),
      };
    default:
      return null;
  }
}

function tipTapNodeToAdf(node: JSONContent): JiraAdfNode | null {
  switch (node.type) {
    case 'paragraph':
      return {
        type: 'paragraph',
        content: tipTapInlineToAdf(node.content),
      };
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: normalizeHeadingLevel(node.attrs?.level) },
        content: tipTapInlineToAdf(node.content),
      };
    case 'bulletList':
      return {
        type: 'bulletList',
        content: tipTapListItemsToAdf(node.content),
      };
    case 'orderedList':
      return {
        type: 'orderedList',
        content: tipTapListItemsToAdf(node.content),
      };
    default:
      return null;
  }
}

export function adfToEditorState(doc: JiraAdfDocument): AdfEditorState {
  const content: JSONContent[] = [];
  const preservedTables: AdfEditorState['preservedTables'] = [];

  doc.content.forEach((node, originalIndex) => {
    if (node.type === 'table') {
      preservedTables.push({ originalIndex, node });
      return;
    }
    const converted = adfNodeToTipTap(node);
    if (converted) {
      content.push(converted);
    }
  });

  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return { content, preservedTables };
}

export function editorStateToAdf(state: AdfEditorState): JiraAdfDocument {
  const editableNodes = state.content
    .map(tipTapNodeToAdf)
    .filter((node): node is JiraAdfNode => node !== null);

  if (state.preservedTables.length === 0) {
    if (editableNodes.length === 0) {
      return emptyJiraAdfDocument();
    }
    return { type: 'doc', version: 1, content: editableNodes };
  }

  const tableByIndex = new Map(
    state.preservedTables.map((entry) => [entry.originalIndex, entry.node]),
  );
  const totalSlots = editableNodes.length + state.preservedTables.length;
  const merged: JiraAdfNode[] = [];
  let editableIndex = 0;

  for (let slot = 0; slot < totalSlots; slot += 1) {
    const table = tableByIndex.get(slot);
    if (table) {
      merged.push(table);
    } else if (editableIndex < editableNodes.length) {
      merged.push(editableNodes[editableIndex]);
      editableIndex += 1;
    }
  }

  while (editableIndex < editableNodes.length) {
    merged.push(editableNodes[editableIndex]);
    editableIndex += 1;
  }

  if (merged.length === 0) {
    return emptyJiraAdfDocument();
  }

  return { type: 'doc', version: 1, content: merged };
}

export function tipTapJsonToAdf(
  content: JSONContent[],
  preservedTables: AdfEditorState['preservedTables'] = [],
): JiraAdfDocument {
  return editorStateToAdf({ content, preservedTables });
}

export function adfToTipTapJson(doc: JiraAdfDocument): JSONContent[] {
  return adfToEditorState(doc).content;
}
