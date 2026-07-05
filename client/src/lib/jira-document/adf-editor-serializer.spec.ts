import {
  adfToEditorState,
  editorStateToAdf,
} from './adf-editor-serializer';
import { blocksToAdf } from './adf-utils';
import { JiraAdfDocument } from './types';

describe('adf-editor-serializer', () => {
  it('should round-trip a plain paragraph', () => {
    const doc: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };

    const state = adfToEditorState(doc);
    const restored = editorStateToAdf(state);

    expect(restored).toEqual(doc);
  });

  it('should round-trip inline marks', () => {
    const doc: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold ', marks: [{ type: 'strong' }] },
            { type: 'text', text: 'italic', marks: [{ type: 'em' }] },
            { type: 'text', text: ' underline', marks: [{ type: 'underline' }] },
          ],
        },
      ],
    };

    const restored = editorStateToAdf(adfToEditorState(doc));
    expect(restored).toEqual(doc);
  });

  it('should round-trip headings and lists', () => {
    const doc = blocksToAdf([
      { type: 'heading', level: 2, text: 'Context' },
      { type: 'paragraph', text: 'Summary line' },
      { type: 'bulletList', items: ['First item', 'Second item'] },
      { type: 'orderedList', items: ['Step one', 'Step two'] },
    ]);

    const restored = editorStateToAdf(adfToEditorState(doc));
    expect(restored).toEqual(doc);
  });

  it('should preserve tables at original positions', () => {
    const tableNode = {
      type: 'table' as const,
      content: [
        {
          type: 'tableRow' as const,
          content: [
            {
              type: 'tableHeader' as const,
              content: [
                {
                  type: 'paragraph' as const,
                  content: [{ type: 'text' as const, text: 'Col A' }],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow' as const,
          content: [
            {
              type: 'tableCell' as const,
              content: [
                {
                  type: 'paragraph' as const,
                  content: [{ type: 'text' as const, text: 'Value' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const doc: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before table' }],
        },
        tableNode,
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'After table' }],
        },
      ],
    };

    const state = adfToEditorState(doc);
    expect(state.preservedTables).toHaveLength(1);
    expect(state.preservedTables[0].originalIndex).toBe(1);

    const restored = editorStateToAdf(state);
    expect(restored).toEqual(doc);
  });

  it('should round-trip multiple paragraphs as separate blocks', () => {
    const doc: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line one' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line two' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line three' }],
        },
      ],
    };

    const restored = editorStateToAdf(adfToEditorState(doc));
    expect(restored).toEqual(doc);
  });

  it('should round-trip hard breaks inside a paragraph', () => {
    const doc: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'First line' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Second line' },
          ],
        },
      ],
    };

    const restored = editorStateToAdf(adfToEditorState(doc));
    expect(restored).toEqual(doc);
  });

  it('should return empty paragraph for empty doc content', () => {
    const doc: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        },
      ],
    };

    const state = adfToEditorState(doc);
    expect(state.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
    ]);
  });
});
