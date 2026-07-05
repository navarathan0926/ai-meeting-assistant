import { blocksToAdf, blocksToPlainText, rawBlocksToDocumentBlocks } from './blocks-to-adf';
import {
  JiraAdfDocument,
  JiraDocumentBlock,
  RawDescriptionBlock,
} from './jira-document.types';

export function rawBlocksToAdf(rawBlocks: RawDescriptionBlock[]): JiraAdfDocument {
  return blocksToAdf(rawBlocksToDocumentBlocks(rawBlocks));
}

export function mergeJiraDocuments(
  primaryBlocks: RawDescriptionBlock[],
  secondaryBlocks: RawDescriptionBlock[],
  secondaryTitle: string,
): JiraAdfDocument {
  const primary = rawBlocksToDocumentBlocks(primaryBlocks);
  const secondary = rawBlocksToDocumentBlocks(secondaryBlocks);

  if (secondary.length === 0) {
    return blocksToAdf(primary);
  }

  const primaryText = blocksToPlainText(primary);
  const secondaryText = blocksToPlainText(secondary);

  if (!secondaryText || primaryText.includes(secondaryText)) {
    return blocksToAdf(primary);
  }
  if (primaryText.includes(secondaryTitle)) {
    return blocksToAdf(primary);
  }

  const subStepText = `${secondaryTitle}: ${secondaryText}`;
  const merged = [...primary];

  const subStepsIndex = merged.findIndex(
    (block) =>
      block.type === 'heading' &&
      /sub-?steps?/i.test(block.text),
  );

  if (subStepsIndex !== -1) {
    const listIndex = merged.findIndex(
      (block, index) =>
        index > subStepsIndex &&
        (block.type === 'bulletList' || block.type === 'orderedList'),
    );
    if (listIndex !== -1 && merged[listIndex].type === 'bulletList') {
      const list = merged[listIndex] as Extract<JiraDocumentBlock, { type: 'bulletList' }>;
      if (!list.items.includes(subStepText)) {
        merged[listIndex] = { type: 'bulletList', items: [...list.items, subStepText] };
      }
      return blocksToAdf(merged);
    }
    merged.splice(subStepsIndex + 1, 0, {
      type: 'bulletList',
      items: [subStepText],
    });
    return blocksToAdf(merged);
  }

  const acceptanceIndex = merged.findIndex(
    (block) =>
      block.type === 'heading' &&
      /acceptance criteria|scope|context/i.test(block.text),
  );

  if (acceptanceIndex !== -1) {
    merged.splice(acceptanceIndex + 1, 0, {
      type: 'bulletList',
      items: [subStepText],
    });
    return blocksToAdf(merged);
  }

  merged.push(
    { type: 'heading', level: 3, text: 'Sub-steps (from meeting)' },
    { type: 'bulletList', items: [subStepText] },
  );

  return blocksToAdf(merged);
}
