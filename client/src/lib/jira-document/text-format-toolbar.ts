import type { Editor } from '@tiptap/core';

export type BlockTextStyle = 'paragraph' | 'heading1' | 'heading2' | 'heading3';

const TEXT_BLOCK_NAMES = new Set(['paragraph', 'heading']);

function collectTargetBlockPositions(editor: Editor): number[] {
  const { selection, doc } = editor.state;
  const { from, to, empty } = selection;
  const blockPositions = new Set<number>();

  const addBlockAt = (pos: number) => {
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
  };

  if (empty) {
    addBlockAt(from);
  } else {
    doc.nodesBetween(from, to, (node, pos) => {
      if (TEXT_BLOCK_NAMES.has(node.type.name)) {
        addBlockAt(pos + 1);
      }
    });
  }

  return [...blockPositions].sort((a, b) => a - b);
}

export function applyBlockTextStyle(
  editor: Editor,
  style: BlockTextStyle,
): boolean {
  const positions = collectTargetBlockPositions(editor);
  if (positions.length === 0) {
    return false;
  }

  let chain = editor.chain().focus();

  for (const pos of positions) {
    chain = chain.setTextSelection(pos + 1);
    switch (style) {
      case 'heading1':
        chain = chain.setHeading({ level: 1 });
        break;
      case 'heading2':
        chain = chain.setHeading({ level: 2 });
        break;
      case 'heading3':
        chain = chain.setHeading({ level: 3 });
        break;
      default:
        chain = chain.setParagraph();
        break;
    }
  }

  return chain.run();
}

export function toggleMarkOnSelection(
  editor: Editor,
  mark: 'bold' | 'italic' | 'underline',
): boolean {
  switch (mark) {
    case 'bold':
      return editor.chain().focus().toggleBold().run();
    case 'italic':
      return editor.chain().focus().toggleItalic().run();
    case 'underline':
      return editor.chain().focus().toggleUnderline().run();
    default:
      return false;
  }
}
