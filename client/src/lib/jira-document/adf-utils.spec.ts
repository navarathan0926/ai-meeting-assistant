import { adfToBlocks, blocksToAdf } from './adf-utils';

describe('adfToBlocks preserveEmpty', () => {
  it('should drop empty headings in display mode', () => {
    const doc = blocksToAdf([{ type: 'heading', level: 2, text: '' }]);
    expect(adfToBlocks(doc)).toHaveLength(0);
  });

  it('should keep empty headings in edit mode', () => {
    const cleared = blocksToAdf([
      { type: 'heading', level: 2, text: '' },
      { type: 'paragraph', text: 'Body' },
    ]);

    const blocks = adfToBlocks(cleared, { preserveEmpty: true });

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'heading', text: '' });
  });

  it('should keep empty list items in edit mode', () => {
    const doc = blocksToAdf([
      { type: 'bulletList', items: ['Done', ''] },
    ]);

    const blocks = adfToBlocks(doc, { preserveEmpty: true });

    expect(blocks[0]).toMatchObject({
      type: 'bulletList',
      items: ['Done', ''],
    });
  });

  it('should filter empty list items in display mode', () => {
    const doc = blocksToAdf([
      { type: 'bulletList', items: ['Done', ''] },
    ]);

    const blocks = adfToBlocks(doc);

    expect(blocks[0]).toMatchObject({
      type: 'bulletList',
      items: ['Done'],
    });
  });
});
