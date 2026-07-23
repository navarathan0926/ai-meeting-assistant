import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExtractedItemsReview } from './ExtractedItemsReview';
import {
  ExtractedItem,
  ExtractedItemPriority,
  ExtractedItemStatus,
  ExtractedItemType,
} from '@/types/extracted-item';
import { blocksToAdf } from '@/lib/jira-document/adf-utils';

jest.mock('next/dynamic', () => {
  return () => {
    const { RichDescriptionEditor } = jest.requireMock(
      '@/lib/jira-document/RichDescriptionEditor',
    );
    return RichDescriptionEditor;
  };
});

jest.mock('@/lib/jira-document/RichDescriptionEditor', () => ({
  RichDescriptionEditor: ({
    onSave,
    onCancel,
  }: {
    onSave: (document: ReturnType<typeof blocksToAdf>) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="rich-description-editor">
      <button
        type="button"
        onClick={() =>
          onSave(blocksToAdf([{ type: 'paragraph', text: 'Updated description' }]))
        }
      >
        Save Changes
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

jest.mock('@/hooks/useExtractedItems', () => ({
  useExtractedItems: jest.fn(),
  useUpdateExtractedItem: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useRejectExtractedItem: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useApproveExtractedItem: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/hooks/useJiraProjects', () => ({
  useJiraProjects: jest.fn(() => ({
    data: [{ key: 'PROJ', name: 'Project', description: '', aiContext: 'Main' }],
    isLoading: false,
  })),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: jest.fn(),
}));

import { useAuthContext } from '@/providers/AuthProvider';
import { UserRole } from '@/types/auth';
import {
  useExtractedItems,
  useApproveExtractedItem,
  useRejectExtractedItem,
  useUpdateExtractedItem,
} from '@/hooks/useExtractedItems';

const mockedUseAuthContext = useAuthContext as jest.Mock;

function mockAuthRole(role: UserRole) {
  mockedUseAuthContext.mockReturnValue({
    user: { id: 'user-1', name: 'Test', email: 'test@example.com', role },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  });
}

const mockedUseExtractedItems = useExtractedItems as jest.Mock;
const mockedUseApprove = useApproveExtractedItem as jest.Mock;
const mockedUseReject = useRejectExtractedItem as jest.Mock;
const mockedUseUpdate = useUpdateExtractedItem as jest.Mock;

const sampleDescription = blocksToAdf([
  { type: 'heading', level: 2, text: 'Context' },
  { type: 'paragraph', text: 'Users cannot log in.' },
]);

function buildItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  return {
    id: 'item-1',
    meetingId: 'meeting-1',
    type: ExtractedItemType.Bug,
    title: 'Fix login bug',
    description: sampleDescription,
    priority: ExtractedItemPriority.High,
    contextSnippet: null,
    status: ExtractedItemStatus.Draft,
    jiraIssueKey: null,
    jiraIssueUrl: null,
    suggestedProjectKey: 'PROJ',
    projectConfidence: 0.9,
    extractionConfidence: 0.85,
    finalProjectKey: null,
    needsProjectReview: false,
    lowExtractionConfidence: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('ExtractedItemsReview', () => {
  beforeEach(() => {
    mockAuthRole(UserRole.Admin);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state', () => {
    mockedUseExtractedItems.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    expect(screen.getByText(/loading extracted items/i)).toBeInTheDocument();
  });

  it('should show empty state when no items exist', () => {
    mockedUseExtractedItems.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    expect(
      screen.getByText(/no actionable items were extracted/i),
    ).toBeInTheDocument();
  });

  it('should render draft items with formatted description', () => {
    mockedUseExtractedItems.mockReturnValue({
      data: [buildItem({ contextSnippet: 'Discussed at 10:05' })],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    expect(screen.getByDisplayValue('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('Users cannot log in.')).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText(/discussed at 10:05/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /approve & send to jira/i }),
    ).toBeInTheDocument();
  });

  it('should render Jira issue link for sent items', () => {
    mockedUseExtractedItems.mockReturnValue({
      data: [
        buildItem({
          type: ExtractedItemType.Task,
          title: 'Ship feature',
          description: blocksToAdf([{ type: 'paragraph', text: 'Done' }]),
          priority: ExtractedItemPriority.Medium,
          status: ExtractedItemStatus.Sent,
          jiraIssueKey: 'PROJ-42',
          jiraIssueUrl: 'https://example.atlassian.net/browse/PROJ-42',
          finalProjectKey: 'PROJ',
        }),
      ],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    const link = screen.getByRole('link', { name: 'PROJ-42' });
    expect(link).toHaveAttribute(
      'href',
      'https://example.atlassian.net/browse/PROJ-42',
    );
  });

  it('should open approve confirmation modal and call mutate on confirm', () => {
    const approveMutate = jest.fn();
    mockedUseApprove.mockReturnValue({
      mutate: approveMutate,
      isPending: false,
    });

    mockedUseExtractedItems.mockReturnValue({
      data: [buildItem()],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    fireEvent.click(
      screen.getByRole('button', { name: /approve & send to jira/i }),
    );
    expect(
      screen.getByRole('heading', { name: 'Send to Jira' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^approve & send$/i }));
    expect(approveMutate).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it('should close confirmation modal on cancel without calling mutate', () => {
    const rejectMutate = jest.fn();
    mockedUseReject.mockReturnValue({
      mutate: rejectMutate,
      isPending: false,
    });

    mockedUseExtractedItems.mockReturnValue({
      data: [buildItem()],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    fireEvent.click(screen.getByRole('button', { name: /^dismiss$/i }));
    expect(
      screen.getByRole('heading', { name: 'Dismiss item' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(rejectMutate).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: 'Dismiss item' }),
    ).not.toBeInTheDocument();
  });

  it('should hide approve button for regular users', () => {
    mockAuthRole(UserRole.User);
    mockedUseExtractedItems.mockReturnValue({
      data: [buildItem()],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    expect(
      screen.queryByRole('button', { name: /approve & send to jira/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dismiss$/i })).toBeInTheDocument();
  });

  it('should open rich description editor and save description only', () => {
    const updateMutate = jest.fn();
    mockedUseUpdate.mockReturnValue({
      mutate: updateMutate,
      isPending: false,
    });

    mockedUseExtractedItems.mockReturnValue({
      data: [buildItem()],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'item-1',
        payload: {
          description: expect.objectContaining({
            type: 'doc',
            version: 1,
          }),
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('should cancel description edits when preview is clicked', () => {
    mockedUseUpdate.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    mockedUseExtractedItems.mockReturnValue({
      data: [buildItem()],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^preview$/i }));
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();
  });
});
