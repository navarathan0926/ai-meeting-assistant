import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { toggleListOnSelectedBlocks } from './list-toolbar';

function createTestEditor(content: object) {
  return new Editor({
    extensions: [Document, Paragraph, Text, BulletList, OrderedList, ListItem],
    content,
  });
}

describe('toggleListOnSelectedBlocks', () => {
  afterEach(() => {
    // Editor instances are cleaned up when garbage collected in jsdom tests.
  });

  it('should only wrap the paragraph containing the cursor', () => {
    const editor = createTestEditor({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 3' }] },
      ],
    });

    editor.commands.setTextSelection(9);
    toggleListOnSelectedBlocks(editor, 'bulletList');

    const json = editor.getJSON();
    expect(json.content).toHaveLength(3);
    expect(json.content?.[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Line 1' }],
    });
    expect(json.content?.[1]).toMatchObject({
      type: 'bulletList',
    });
    expect(json.content?.[2]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Line 3' }],
    });

    editor.destroy();
  });

  it('should wrap only selected paragraphs', () => {
    const editor = createTestEditor({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 3' }] },
      ],
    });

    editor.commands.setTextSelection({ from: 9, to: 15 });
    toggleListOnSelectedBlocks(editor, 'orderedList');

    const json = editor.getJSON();
    expect(json.content?.[0]).toMatchObject({ type: 'paragraph' });
    expect(json.content?.[1]).toMatchObject({ type: 'orderedList' });
    expect(json.content?.[2]).toMatchObject({ type: 'paragraph' });

    editor.destroy();
  });
});
