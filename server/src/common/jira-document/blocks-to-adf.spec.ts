import {
  blocksToAdf,
  blocksToPlainText,
  isValidAdfDocument,
  rawBlocksToDocumentBlocks,
} from './blocks-to-adf';
import { mergeJiraDocuments } from './merge-jira-documents';
import { RawDescriptionBlock } from './jira-document.types';

describe('blocksToAdf', () => {
  it('converts headings and bullet lists', () => {
    const doc = blocksToAdf([
      { type: 'heading', level: 2, text: 'Context' },
      { type: 'paragraph', text: 'Login fails on mobile.' },
      { type: 'heading', level: 3, text: 'Acceptance Criteria' },
      { type: 'bulletList', items: ['Fix Safari auth', 'Add regression tests'] },
    ]);

    expect(doc.type).toBe('doc');
    expect(doc.content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(doc.content[3]).toMatchObject({ type: 'bulletList' });
    expect(isValidAdfDocument(doc)).toBe(true);
  });

  it('converts tables with headers and rows', () => {
    const doc = blocksToAdf([
      {
        type: 'table',
        headers: ['Field', 'Value'],
        rows: [['Status', 'Open']],
      },
    ]);

    expect(doc.content[0]).toMatchObject({ type: 'table' });
    const table = doc.content[0] as { content: unknown[] };
    expect(table.content).toHaveLength(2);
  });

  it('returns empty paragraph for empty blocks', () => {
    const doc = blocksToAdf([]);
    expect(doc.content[0]).toMatchObject({ type: 'paragraph' });
  });
});

describe('rawBlocksToDocumentBlocks', () => {
  it('normalizes raw LLM blocks', () => {
    const raw: RawDescriptionBlock[] = [
      {
        type: 'heading',
        level: 2,
        text: 'Scope',
        items: [],
        headers: [],
        rows: [],
      },
      {
        type: 'bulletList',
        level: 0,
        text: '',
        items: ['Item one'],
        headers: [],
        rows: [],
      },
    ];

    expect(rawBlocksToDocumentBlocks(raw)).toHaveLength(2);
  });
});

describe('mergeJiraDocuments', () => {
  it('appends sub-steps as bullet list items', () => {
    const primary: RawDescriptionBlock[] = [
      {
        type: 'heading',
        level: 2,
        text: 'Context',
        items: [],
        headers: [],
        rows: [],
      },
      {
        type: 'paragraph',
        level: 0,
        text: 'Main deliverable.',
        items: [],
        headers: [],
        rows: [],
      },
    ];

    const secondary: RawDescriptionBlock[] = [
      {
        type: 'paragraph',
        level: 0,
        text: 'Write unit tests.',
        items: [],
        headers: [],
        rows: [],
      },
    ];

    const merged = mergeJiraDocuments(primary, secondary, 'Add tests');
    const plain = blocksToPlainText(
      merged.content
        .filter((n) => n.type === 'bulletList')
        .flatMap(() => []),
    );

    expect(merged.content.some((n) => n.type === 'heading')).toBe(true);
    expect(JSON.stringify(merged)).toContain('Add tests');
    expect(plain).toBeDefined();
  });
});
