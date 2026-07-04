export interface RawExtractedItem {
  type: string;
  title: string;
  description: string;
  priority: string;
  context_snippet: string;
  scope: string;
}

export interface ItemExtractionOutput {
  items: RawExtractedItem[];
}

export const ITEM_EXTRACTION_JSON_SCHEMA = {
  name: 'meeting_items_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
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
            description: { type: 'string' },
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
          },
          required: [
            'type',
            'title',
            'description',
            'priority',
            'context_snippet',
            'scope',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
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

function shouldMergeRelatedWork(a: RawExtractedItem, b: RawExtractedItem): boolean {
  if (normalizeScope(a.scope) === normalizeScope(b.scope)) {
    return true;
  }

  const titleOverlap = tokenOverlap(a.title, b.title);
  const combinedOverlap = tokenOverlap(
    `${a.title} ${a.description}`,
    `${b.title} ${b.description}`,
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

  return {
    type,
    title: primary.title,
    scope: primary.scope || secondary.scope,
    description: mergeDescriptions(primary, secondary),
    context_snippet: pickLongerText(
      primary.context_snippet,
      secondary.context_snippet,
    ),
    priority,
  };
}

function mergeDescriptions(
  primary: RawExtractedItem,
  secondary: RawExtractedItem,
): string {
  const primaryDesc = primary.description.trim();
  const secondaryDesc = secondary.description.trim();

  if (!secondaryDesc || primaryDesc.includes(secondaryDesc)) {
    return primaryDesc;
  }
  if (secondaryDesc.includes(primaryDesc)) {
    return secondaryDesc;
  }

  const subStepLine = `- ${secondary.title}: ${secondaryDesc}`;
  if (primaryDesc.includes(subStepLine) || primaryDesc.includes(secondary.title)) {
    return primaryDesc;
  }

  if (/sub-steps?|acceptance criteria|scope/i.test(primaryDesc)) {
    return `${primaryDesc}\n${subStepLine}`;
  }

  return `${primaryDesc}\n\nSub-steps (from meeting):\n${subStepLine}`;
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
