import type { Editor } from '@tiptap/core';

type ListType = 'bulletList' | 'orderedList';

const TEXT_BLOCK_NAMES = new Set(['paragraph', 'heading']);

function blockInnerRange(
  doc: Editor['state']['doc'],
  pos: number,
): { from: number; to: number } | null {
  const node = doc.nodeAt(pos);
  if (!node) {
    return null;
  }

  if (node.type.name === 'listItem') {
    const paragraph = node.firstChild;
    if (!paragraph?.isTextblock) {
      return null;
    }
    const paragraphPos = pos + 1;
    return {
      from: paragraphPos + 1,
      to: paragraphPos + paragraph.nodeSize - 1,
    };
  }

  if (node.isTextblock) {
    return {
      from: pos + 1,
      to: pos + node.nodeSize - 1,
    };
  }

  return null;
}

function collectBlockPosition(
  doc: Editor['state']['doc'],
  pos: number,
  blockPositions: Set<number>,
): void {
  const $pos = doc.resolve(pos);

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (!TEXT_BLOCK_NAMES.has(node.type.name)) {
      continue;
    }

    const parent = $pos.node(depth - 1);
    if (parent.type.name === 'doc') {
      blockPositions.add($pos.before(depth));
      return;
    }

    if (parent.type.name === 'listItem') {
      blockPositions.add($pos.before(depth - 1));
      return;
    }
  }
}

function getBlocksToWrap(
  editor: Editor,
): { from: number; to: number } | null {
  const { selection, doc } = editor.state;
  const { from, to, empty } = selection;
  const blockPositions = new Set<number>();

  if (empty) {
    collectBlockPosition(doc, from, blockPositions);
  } else {
    doc.nodesBetween(from, to, (node, pos) => {
      if (!TEXT_BLOCK_NAMES.has(node.type.name)) {
        return;
      }

      collectBlockPosition(doc, pos + 1, blockPositions);
    });
  }

  if (blockPositions.size === 0) {
    return null;
  }

  const sorted = [...blockPositions].sort((a, b) => a - b);
  const firstRange = blockInnerRange(doc, sorted[0]);
  const lastRange = blockInnerRange(doc, sorted[sorted.length - 1]);

  if (!firstRange || !lastRange) {
    return null;
  }

  return { from: firstRange.from, to: lastRange.to };
}

export function toggleListOnSelectedBlocks(
  editor: Editor,
  listType: ListType,
): boolean {
  if (editor.isActive(listType)) {
    return editor.chain().focus().liftListItem('listItem').run();
  }

  const blockRange = getBlocksToWrap(editor);
  if (!blockRange) {
    return false;
  }

  const chain = editor
    .chain()
    .focus()
    .setTextSelection({ from: blockRange.from, to: blockRange.to });

  if (listType === 'bulletList') {
    return chain.toggleBulletList().run();
  }

  return chain.toggleOrderedList().run();
}

export function isListActive(editor: Editor | null): boolean {
  if (!editor) {
    return false;
  }
  return editor.isActive('bulletList') || editor.isActive('orderedList');
}
