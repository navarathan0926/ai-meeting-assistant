import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExtractedItemsReview } from './ExtractedItemsReview';
import {
  ExtractedItemPriority,
  ExtractedItemStatus,
  ExtractedItemType,
} from '@/types/extracted-item';

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

import {
  useExtractedItems,
  useApproveExtractedItem,
  useRejectExtractedItem,
} from '@/hooks/useExtractedItems';

const mockedUseExtractedItems = useExtractedItems as jest.Mock;
const mockedUseApprove = useApproveExtractedItem as jest.Mock;
const mockedUseReject = useRejectExtractedItem as jest.Mock;

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('ExtractedItemsReview', () => {
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

  it('should render draft items with edit controls', () => {
    mockedUseExtractedItems.mockReturnValue({
      data: [
        {
          id: 'item-1',
          meetingId: 'meeting-1',
          type: ExtractedItemType.Bug,
          title: 'Fix login bug',
          description: 'Users cannot log in.',
          priority: ExtractedItemPriority.High,
          contextSnippet: 'Discussed at 10:05',
          status: ExtractedItemStatus.Draft,
          jiraIssueKey: null,
          jiraIssueUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    expect(screen.getByDisplayValue('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText(/discussed at 10:05/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /approve & send to jira/i }),
    ).toBeInTheDocument();
  });

  it('should render Jira issue link for sent items', () => {
    mockedUseExtractedItems.mockReturnValue({
      data: [
        {
          id: 'item-1',
          meetingId: 'meeting-1',
          type: ExtractedItemType.Task,
          title: 'Ship feature',
          description: 'Done',
          priority: ExtractedItemPriority.Medium,
          contextSnippet: null,
          status: ExtractedItemStatus.Sent,
          jiraIssueKey: 'PROJ-42',
          jiraIssueUrl: 'https://example.atlassian.net/browse/PROJ-42',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
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
      data: [
        {
          id: 'item-1',
          meetingId: 'meeting-1',
          type: ExtractedItemType.Bug,
          title: 'Fix login bug',
          description: 'Users cannot log in.',
          priority: ExtractedItemPriority.High,
          contextSnippet: null,
          status: ExtractedItemStatus.Draft,
          jiraIssueKey: null,
          jiraIssueUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
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
      data: [
        {
          id: 'item-1',
          meetingId: 'meeting-1',
          type: ExtractedItemType.Bug,
          title: 'Fix login bug',
          description: 'Users cannot log in.',
          priority: ExtractedItemPriority.High,
          contextSnippet: null,
          status: ExtractedItemStatus.Draft,
          jiraIssueKey: null,
          jiraIssueUrl: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isFetching: false,
    });

    renderWithQuery(<ExtractedItemsReview meetingId="meeting-1" />);

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(
      screen.getByRole('heading', { name: 'Reject item' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(rejectMutate).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: 'Reject item' }),
    ).not.toBeInTheDocument();
  });
});
