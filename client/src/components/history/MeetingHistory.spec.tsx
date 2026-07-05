import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MeetingHistory } from './MeetingHistory';
import { MeetingStatus, Meeting } from '@/types/meeting';
import { useDeleteMeeting, useMeetings } from '@/hooks/useMeeting';

jest.mock('@/hooks/useMeeting');

const mockUseMeetings = useMeetings as jest.Mock;
const mockUseDeleteMeeting = useDeleteMeeting as jest.Mock;

const mockMeetings: Meeting[] = [
  {
    id: '1',
    originalFileName: 'meeting-one.mp3',
    fileSize: 1024,
    mimeType: 'audio/mpeg',
    status: MeetingStatus.Completed,
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-14T01:00:00.000Z',
  },
  {
    id: '2',
    originalFileName: 'meeting-two.wav',
    fileSize: 2048,
    mimeType: 'audio/wav',
    status: MeetingStatus.Processing,
    createdAt: '2026-06-14T02:00:00.000Z',
    updatedAt: '2026-06-14T03:00:00.000Z',
  },
];

describe('MeetingHistory', () => {
  let mockSelect: jest.Mock;
  let mockDelete: jest.Mock;
  let mockDeleteMutate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect = jest.fn();
    mockDelete = jest.fn();
    mockDeleteMutate = jest.fn();

    mockUseDeleteMeeting.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it('renders loading state', () => {
    mockUseMeetings.mockReturnValue({ data: null, isLoading: true });
    render(<MeetingHistory onSelect={mockSelect} onDelete={mockDelete} />);
    expect(screen.getByText(/Loading history…/i)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockUseMeetings.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 50, totalPages: 1 },
      isLoading: false,
    });
    render(<MeetingHistory onSelect={mockSelect} onDelete={mockDelete} />);
    expect(screen.getByText(/No meetings yet/i)).toBeInTheDocument();
  });

  it('renders meeting history items', () => {
    mockUseMeetings.mockReturnValue({
      data: {
        items: mockMeetings,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
      isLoading: false,
    });
    render(<MeetingHistory onSelect={mockSelect} onDelete={mockDelete} />);

    expect(screen.getByText('meeting-one.mp3')).toBeInTheDocument();
    expect(screen.getByText('meeting-two.wav')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('highlights active meeting', () => {
    mockUseMeetings.mockReturnValue({
      data: {
        items: mockMeetings,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
      isLoading: false,
    });
    const { container } = render(
      <MeetingHistory activeMeetingId="1" onSelect={mockSelect} onDelete={mockDelete} />
    );

    // Active item container should have bg-indigo-600/30 class
    const activeBtn = screen.getByText('meeting-one.mp3').closest('div');
    expect(activeBtn).toHaveClass('bg-indigo-600/30');

    const inactiveBtn = screen.getByText('meeting-two.wav').closest('div');
    expect(inactiveBtn).not.toHaveClass('bg-indigo-600/30');
  });

  it('triggers onSelect when meeting is clicked', () => {
    mockUseMeetings.mockReturnValue({
      data: {
        items: mockMeetings,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
      isLoading: false,
    });
    render(<MeetingHistory onSelect={mockSelect} onDelete={mockDelete} />);

    fireEvent.click(screen.getByText('meeting-one.mp3'));
    expect(mockSelect).toHaveBeenCalledWith('1');
  });

  it('opens confirmation modal and triggers delete on confirmation', async () => {
    mockUseMeetings.mockReturnValue({
      data: {
        items: mockMeetings,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
      isLoading: false,
    });
    mockUseDeleteMeeting.mockImplementation((callback) => ({
      mutate: (id: string) => {
        mockDeleteMutate(id);
        callback(id);
      },
      isPending: false,
    }));

    render(<MeetingHistory onSelect={mockSelect} onDelete={mockDelete} />);

    const deleteBtns = screen.getAllByRole('button', { name: /Delete meeting/i });
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    expect(mockDeleteMutate).toHaveBeenCalledWith('1');
    expect(mockDelete).toHaveBeenCalledWith('1');
  });
});
