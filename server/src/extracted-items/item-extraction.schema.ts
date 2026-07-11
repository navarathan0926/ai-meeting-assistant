import { RawDescriptionBlock } from '../common/jira-document/jira-document.types';
import {
  blocksToPlainText,
  rawBlocksToDocumentBlocks,
} from '../common/jira-document/blocks-to-adf';
import { mergeJiraDocuments } from '../common/jira-document/merge-jira-documents';

export type { RawDescriptionBlock };

export interface RawExtractedItem {
  type: string;
  title: string;
  description_blocks: RawDescriptionBlock[];
  priority: string;
  context_snippet: string;
  scope: string;
  suggested_project_key: string;
  project_confidence: number;
  extraction_confidence: number;
}

export interface RawMeetingAnalysis {
  has_actionable_work: boolean;
  project_relevance_confidence: number;
  summary: string;
}

export interface ItemExtractionOutput {
  meeting_analysis: RawMeetingAnalysis;
  items: RawExtractedItem[];
}

const DESCRIPTION_BLOCK_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['heading', 'paragraph', 'bulletList', 'orderedList', 'table'],
    },
    level: { type: 'integer' },
    text: { type: 'string' },
    items: { type: 'array', items: { type: 'string' } },
    headers: { type: 'array', items: { type: 'string' } },
    rows: {
      type: 'array',
      items: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
  required: ['type', 'level', 'text', 'items', 'headers', 'rows'],
  additionalProperties: false,
} as const;

export const ITEM_EXTRACTION_JSON_SCHEMA = {
  name: 'meeting_items_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      meeting_analysis: {
        type: 'object',
        properties: {
          has_actionable_work: { type: 'boolean' },
          project_relevance_confidence: { type: 'number' },
          summary: { type: 'string' },
        },
        required: [
          'has_actionable_work',
          'project_relevance_confidence',
          'summary',
        ],
        additionalProperties: false,
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['bug', 'task', 'story', 'feature'],
            },
            title: { type: 'string' },
            description_blocks: {
              type: 'array',
              items: DESCRIPTION_BLOCK_SCHEMA,
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
            },
            context_snippet: { type: 'string' },
            scope: {
              type: 'string',
              description:
                'Stable kebab-case identifier for the logical work item. Same scope = same Jira card theme.',
            },
            suggested_project_key: {
              type: 'string',
              description:
                'Jira project key from the provided project list only.',
            },
            project_confidence: {
              type: 'number',
              description:
                'Confidence 0–1 that suggested_project_key is correct.',
            },
            extraction_confidence: {
              type: 'number',
              description:
                'Confidence 0–1 that this is a real committed work item.',
            },
          },
          required: [
            'type',
            'title',
            'description_blocks',
            'priority',
            'context_snippet',
            'scope',
            'suggested_project_key',
            'project_confidence',
            'extraction_confidence',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['meeting_analysis', 'items'],
    additionalProperties: false,
  },
} as const;

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'about',
  'need',
  'will',
  'should',
  'have',
  'been',
  'were',
  'are',
  'was',
  'our',
  'their',
  'they',
  'them',
  'also',
  'just',
  'after',
  'before',
  'when',
  'then',
  'than',
  'each',
  'all',
  'any',
  'some',
  'more',
  'most',
  'other',
  'such',
  'only',
  'very',
  'can',
  'could',
  'would',
  'must',
  'shall',
  'may',
  'might',
  'not',
  'but',
  'you',
  'your',
  'its',
  'his',
  'her',
  'she',
  'him',
  'who',
  'what',
  'which',
  'where',
  'while',
  'during',
  'through',
  'across',
  'under',
  'over',
  'between',
  'within',
  'without',
  'using',
  'used',
  'use',
  'new',
  'add',
  'get',
  'set',
  'run',
]);

const SUBTASK_TITLE_PREFIX =
  /^(write|create|add|implement|fix|test|verify|submit|prepare|define|validate|update|deploy|review|check|ensure|build|design|document|schedule|send|complete|finish|do|make)\b/i;

const TYPE_RANK: Record<string, number> = {
  bug: 4,
  story: 3,
  feature: 3,
  task: 1,
};

/**
 * Full consolidation pipeline: scope grouping → title dedup → related-work merge.
 */
export function consolidateExtractedItems(
  items: RawExtractedItem[],
): RawExtractedItem[] {
  if (items.length <= 1) {
    return items;
  }

  let result = mergeByScope(items);
  result = deduplicateItems(result);
  result = mergeByContextOverlap(result);
  result = mergeRelatedSubtasks(result);
  return result;
}

export function deduplicateItems(items: RawExtractedItem[]): RawExtractedItem[] {
  const result: RawExtractedItem[] = [];

  for (const item of items) {
    const duplicateIndex = result.findIndex((existing) =>
      areLikelyDuplicates(item, existing),
    );

    if (duplicateIndex === -1) {
      result.push(item);
      continue;
    }

    const primary = pickPrimaryItem(result[duplicateIndex], item);
    const secondary = primary === result[duplicateIndex] ? item : result[duplicateIndex];
    result[duplicateIndex] = mergeItems(primary, secondary);
  }

  return result;
}

function mergeByScope(items: RawExtractedItem[]): RawExtractedItem[] {
  const groups = new Map<string, RawExtractedItem[]>();

  for (const item of items) {
    const key = normalizeScope(item.scope);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) =>
    group.reduce((merged, current) => mergeItems(merged, current)),
  );
}

function mergeByContextOverlap(items: RawExtractedItem[]): RawExtractedItem[] {
  const result: RawExtractedItem[] = [];

  for (const item of items) {
    const overlapIndex = result.findIndex((existing) => {
      const score = contextOverlapScore(item, existing);
      if (normalizeScope(item.scope) === normalizeScope(existing.scope)) {
        return score >= 0.55;
      }
      return score >= 0.75;
    });

    if (overlapIndex === -1) {
      result.push(item);
      continue;
    }

    const primary = pickPrimaryItem(result[overlapIndex], item);
    const secondary =
      primary === result[overlapIndex] ? item : result[overlapIndex];
    result[overlapIndex] = mergeItems(primary, secondary);
  }

  return result;
}

function mergeRelatedSubtasks(items: RawExtractedItem[]): RawExtractedItem[] {
  const result = [...items];
  let changed = true;

  while (changed) {
    changed = false;

    outer: for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (!shouldMergeRelatedWork(result[i], result[j])) {
          continue;
        }

        const primary = pickPrimaryItem(result[i], result[j]);
        const secondary = primary === result[i] ? result[j] : result[i];
        const keepIndex = primary === result[i] ? i : j;
        const removeIndex = keepIndex === i ? j : i;

        result[keepIndex] = mergeItems(primary, secondary);
        result.splice(removeIndex, 1);
        changed = true;
        break outer;
      }
    }
  }

  return result;
}

function itemDescriptionText(item: RawExtractedItem): string {
  return blocksToPlainText(rawBlocksToDocumentBlocks(item.description_blocks));
}

function shouldMergeRelatedWork(a: RawExtractedItem, b: RawExtractedItem): boolean {
  if (normalizeScope(a.scope) === normalizeScope(b.scope)) {
    return true;
  }

  const titleOverlap = tokenOverlap(a.title, b.title);
  const combinedOverlap = tokenOverlap(
    `${a.title} ${itemDescriptionText(a)}`,
    `${b.title} ${itemDescriptionText(b)}`,
  );
  const contextOverlap = contextOverlapScore(a, b);
  const scopesRelated = scopesAreRelated(a, b);

  const aIsSubtask = isSubtaskTitle(a.title);
  const bIsSubtask = isSubtaskTitle(b.title);

  if (!scopesRelated) {
    if (aIsSubtask || bIsSubtask) {
      return titleOverlap >= 0.5 && contextOverlap >= 0.55;
    }
    return titleOverlap >= 0.65 && contextOverlap >= 0.65;
  }

  if (aIsSubtask || bIsSubtask) {
    return titleOverlap >= 0.35 || combinedOverlap >= 0.3 || contextOverlap >= 0.45;
  }

  return (
    titleOverlap >= 0.5 ||
    combinedOverlap >= 0.45 ||
    contextOverlap >= 0.55
  );
}

function scopesAreRelated(a: RawExtractedItem, b: RawExtractedItem): boolean {
  const scopeA = normalizeScope(a.scope);
  const scopeB = normalizeScope(b.scope);
  if (!scopeA || !scopeB) {
    return false;
  }
  if (scopeA === scopeB) {
    return true;
  }
  return tokenOverlap(scopeA.replace(/-/g, ' '), scopeB.replace(/-/g, ' ')) >= 0.4;
}

function areLikelyDuplicates(a: RawExtractedItem, b: RawExtractedItem): boolean {
  if (normalizeScope(a.scope) === normalizeScope(b.scope)) {
    return true;
  }

  const titleA = normalizeTitle(a.title);
  const titleB = normalizeTitle(b.title);

  if (titleA === titleB) {
    return true;
  }

  if (titleA.length >= 10 && titleB.length >= 10) {
    if (titleA.includes(titleB) || titleB.includes(titleA)) {
      return true;
    }
  }

  return tokenOverlap(a.title, b.title) >= 0.65;
}

function pickPrimaryItem(
  a: RawExtractedItem,
  b: RawExtractedItem,
): RawExtractedItem {
  const rankA = TYPE_RANK[a.type] ?? 0;
  const rankB = TYPE_RANK[b.type] ?? 0;
  if (rankA !== rankB) {
    return rankA > rankB ? a : b;
  }

  const aSubtask = isSubtaskTitle(a.title);
  const bSubtask = isSubtaskTitle(b.title);
  if (aSubtask !== bSubtask) {
    return aSubtask ? b : a;
  }

  return a.title.length >= b.title.length ? a : b;
}

function mergeItems(
  primary: RawExtractedItem,
  secondary: RawExtractedItem,
): RawExtractedItem {
  const priorityRank: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const priority =
    priorityRank[primary.priority] >= priorityRank[secondary.priority]
      ? primary.priority
      : secondary.priority;

  const type =
    (TYPE_RANK[primary.type] ?? 0) >= (TYPE_RANK[secondary.type] ?? 0)
      ? primary.type
      : secondary.type;

  const mergedAdf = mergeJiraDocuments(
    primary.description_blocks,
    secondary.description_blocks,
    secondary.title,
  );

  const { suggested_project_key, project_confidence } = pickProjectFields(
    primary,
    secondary,
  );

  return {
    type,
    title: primary.title,
    scope: primary.scope || secondary.scope,
    description_blocks: adfToRawBlocks(mergedAdf),
    context_snippet: pickLongerText(
      primary.context_snippet,
      secondary.context_snippet,
    ),
    priority,
    suggested_project_key,
    project_confidence,
    extraction_confidence: Math.max(
      clampConfidence(primary.extraction_confidence),
      clampConfidence(secondary.extraction_confidence),
    ),
  };
}

function pickProjectFields(
  primary: RawExtractedItem,
  secondary: RawExtractedItem,
): { suggested_project_key: string; project_confidence: number } {
  const primaryConfidence = clampConfidence(primary.project_confidence);
  const secondaryConfidence = clampConfidence(secondary.project_confidence);

  if (
    primary.suggested_project_key &&
    secondary.suggested_project_key &&
    primary.suggested_project_key !== secondary.suggested_project_key
  ) {
    if (secondaryConfidence > primaryConfidence) {
      return {
        suggested_project_key: secondary.suggested_project_key,
        project_confidence: secondaryConfidence,
      };
    }
    return {
      suggested_project_key: primary.suggested_project_key,
      project_confidence: primaryConfidence,
    };
  }

  return {
    suggested_project_key:
      primary.suggested_project_key || secondary.suggested_project_key || '',
    project_confidence: Math.max(primaryConfidence, secondaryConfidence),
  };
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Round-trip ADF back to raw blocks for storage consistency. */
function adfToRawBlocks(doc: {
  content: Array<{ type: string; attrs?: { level?: number }; content?: unknown[] }>;
}): RawDescriptionBlock[] {
  const blocks: RawDescriptionBlock[] = [];

  for (const node of doc.content) {
    switch (node.type) {
      case 'heading': {
        const text = extractTextFromAdfContent(node.content);
        blocks.push({
          type: 'heading',
          level: node.attrs?.level ?? 2,
          text,
          items: [],
          headers: [],
          rows: [],
        });
        break;
      }
      case 'paragraph': {
        const text = extractTextFromAdfContent(node.content);
        if (text) {
          blocks.push({
            type: 'paragraph',
            level: 0,
            text,
            items: [],
            headers: [],
            rows: [],
          });
        }
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const items = extractListItems(node.content);
        if (items.length > 0) {
          blocks.push({
            type: node.type,
            level: 0,
            text: '',
            items,
            headers: [],
            rows: [],
          });
        }
        break;
      }
      case 'table': {
        const { headers, rows } = extractTable(node.content);
        blocks.push({
          type: 'table',
          level: 0,
          text: '',
          items: [],
          headers,
          rows,
        });
        break;
      }
      default:
        break;
    }
  }

  return blocks;
}

function extractTextFromAdfContent(content: unknown[] | undefined): string {
  if (!content) {
    return '';
  }
  return content
    .filter((n): n is { type: string; text?: string } => typeof n === 'object' && n !== null)
    .filter((n) => n.type === 'text')
    .map((n) => n.text ?? '')
    .join('');
}

function extractListItems(content: unknown[] | undefined): string[] {
  if (!content) {
    return [];
  }
  return content
    .filter((n): n is { type: string; content?: unknown[] } => typeof n === 'object' && n !== null)
    .filter((n) => n.type === 'listItem')
    .map((item) => {
      const paragraph = item.content?.[0] as { content?: unknown[] } | undefined;
      return extractTextFromAdfContent(paragraph?.content);
    })
    .filter(Boolean);
}

function extractTable(content: unknown[] | undefined): {
  headers: string[];
  rows: string[][];
} {
  if (!content?.length) {
    return { headers: [], rows: [] };
  }

  const rows = content.filter(
    (n): n is { type: string; content?: unknown[] } =>
      typeof n === 'object' && n !== null && (n as { type: string }).type === 'tableRow',
  );

  const headers =
    rows.length > 0
      ? (rows[0].content ?? [])
          .filter(
            (c): c is { type: string; content?: unknown[] } =>
              typeof c === 'object' &&
              c !== null &&
              (c as { type: string }).type === 'tableHeader',
          )
          .map((cell) => extractTextFromAdfContent(cell.content))
      : [];

  const dataRows = rows.slice(headers.length > 0 ? 1 : 0).map((row) =>
    (row.content ?? [])
      .filter(
        (c): c is { type: string; content?: unknown[] } =>
          typeof c === 'object' && c !== null,
      )
      .map((cell) => extractTextFromAdfContent(cell.content)),
  );

  return { headers, rows: dataRows };
}

function normalizeScope(scope: string): string {
  return scope
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isSubtaskTitle(title: string): boolean {
  return SUBTASK_TITLE_PREFIX.test(title.trim());
}

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  return new Set(tokens);
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      shared++;
    }
  }

  return shared / Math.min(tokensA.size, tokensB.size);
}

function contextOverlapScore(a: RawExtractedItem, b: RawExtractedItem): number {
  return tokenOverlap(
    `${a.context_snippet} ${a.title}`,
    `${b.context_snippet} ${b.title}`,
  );
}

function pickLongerText(a: string, b: string): string {
  return a.length >= b.length ? a : b;
}
