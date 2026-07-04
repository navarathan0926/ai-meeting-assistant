import {
  consolidateExtractedItems,
  deduplicateItems,
  RawExtractedItem,
} from './item-extraction.schema';

function buildItem(overrides: Partial<RawExtractedItem> = {}): RawExtractedItem {
  return {
    type: 'task',
    title: 'Fix login bug',
    description: 'Users cannot log in on mobile.',
    priority: 'high',
    context_snippet: 'We noticed login fails on iOS.',
    scope: 'mobile-login-bug',
    ...overrides,
  };
}

describe('deduplicateItems', () => {
  it('should return an empty array when given no items', () => {
    expect(deduplicateItems([])).toEqual([]);
  });

  it('should keep distinct items unchanged', () => {
    const items = [
      buildItem({ title: 'Fix login bug', scope: 'mobile-login-bug' }),
      buildItem({ title: 'Update documentation', scope: 'docs-update' }),
    ];

    expect(deduplicateItems(items)).toHaveLength(2);
  });

  it('should merge items with the same scope', () => {
    const items = [
      buildItem({
        title: 'Fix login bug',
        scope: 'mobile-login-bug',
        description: 'Short description',
      }),
      buildItem({
        title: 'Submit login fix',
        scope: 'mobile-login-bug',
        description: 'Deploy patch to production',
        type: 'task',
      }),
    ];

    expect(deduplicateItems(items)).toHaveLength(1);
  });

  it('should merge items with identical normalized titles', () => {
    const items = [
      buildItem({
        title: 'Fix login bug',
        description: 'Short description',
        priority: 'low',
      }),
      buildItem({
        title: '  fix login bug ',
        description: 'Longer description with more context',
        priority: 'high',
        context_snippet:
          'Extended snippet from the transcript with more surrounding context.',
      }),
    ];

    const result = deduplicateItems(items);

    expect(result).toHaveLength(1);
    expect(result[0].description).toContain('Longer description with more context');
    expect(result[0].priority).toBe('high');
  });

  it('should merge items when one title contains the other', () => {
    const items = [
      buildItem({ title: 'Login bug on mobile Safari' }),
      buildItem({ title: 'Login bug on mobile' }),
    ];

    expect(deduplicateItems(items)).toHaveLength(1);
  });
});

describe('consolidateExtractedItems', () => {
  it('should merge a bug fix, submit task, and regression test into one bug card', () => {
    const items = [
      buildItem({
        type: 'bug',
        title: 'Production checkout failure on mobile Safari',
        scope: 'checkout-mobile-bug',
        description: 'Users cannot complete checkout on iOS Safari.',
        context_snippet:
          'Production bug: checkout fails on mobile Safari after the latest release.',
      }),
      buildItem({
        type: 'task',
        title: 'Submit fix for checkout bug',
        scope: 'checkout-fix-submit',
        description: 'Submit the patch for review and deploy.',
        context_snippet:
          'Production bug: checkout fails on mobile Safari after the latest release.',
      }),
      buildItem({
        type: 'task',
        title: 'Run regression testing for checkout',
        scope: 'checkout-regression',
        description: 'Verify checkout on iOS and Android after the fix.',
        context_snippet:
          'Production bug: checkout fails on mobile Safari after the latest release.',
      }),
    ];

    const result = consolidateExtractedItems(items);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('bug');
    expect(result[0].title).toContain('checkout');
    expect(result[0].description).toMatch(/regression|submit|Sub-steps/i);
  });

  it('should merge feature implementation subtasks into one story card', () => {
    const items = [
      buildItem({
        type: 'story',
        title: 'Payment API integration',
        scope: 'payment-api',
        description: 'Add payment endpoints for checkout flow.',
        context_snippet: 'We need payment API endpoints for the new checkout.',
      }),
      buildItem({
        type: 'task',
        title: 'Create payment validation endpoint',
        scope: 'payment-validation-endpoint',
        description: 'Build endpoint to validate card details.',
        context_snippet: 'We need payment API endpoints for the new checkout.',
      }),
      buildItem({
        type: 'task',
        title: 'Prepare payment API test cases',
        scope: 'payment-api-tests',
        description: 'Write integration tests for payment endpoints.',
        context_snippet: 'We need payment API endpoints for the new checkout.',
      }),
      buildItem({
        type: 'task',
        title: 'Define payment story acceptance criteria',
        scope: 'payment-story-definition',
        description: 'Document acceptance criteria for payment flow.',
        context_snippet: 'We need payment API endpoints for the new checkout.',
      }),
    ];

    const result = consolidateExtractedItems(items);

    expect(result).toHaveLength(1);
    expect(['story', 'feature']).toContain(result[0].type);
    expect(result[0].description).toMatch(/Sub-steps|validation|test cases/i);
  });

  it('should keep unrelated topics as separate cards', () => {
    const items = [
      buildItem({
        title: 'Fix login bug on mobile',
        scope: 'mobile-login-bug',
        description: 'Users cannot log in on iOS devices.',
        context_snippet: 'Login fails on iOS devices.',
      }),
      buildItem({
        title: 'Migrate billing database',
        scope: 'billing-db-migration',
        description: 'Move billing data to the new database cluster.',
        context_snippet: 'We need to migrate billing data to the new cluster.',
      }),
    ];

    expect(consolidateExtractedItems(items)).toHaveLength(2);
  });
});
