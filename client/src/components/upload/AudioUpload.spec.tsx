import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioUpload } from './AudioUpload';
import { MeetingStatus } from '@/types/meeting';
import { useUploadMeeting, useMeeting } from '@/hooks/useMeeting';
import { useToast } from '@/providers/ToastProvider';

// Mock the hooks and providers
jest.mock('@/hooks/useMeeting');
jest.mock('@/providers/ToastProvider');

const mockUseUploadMeeting = useUploadMeeting as jest.Mock;
const mockUseMeeting = useMeeting as jest.Mock;
const mockUseToast = useToast as jest.Mock;

describe('AudioUpload', () => {
  let mockShowToast: jest.Mock;
  let mockMutateAsync: jest.Mock;
  let mockReset: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockShowToast = jest.fn();
    mockUseToast.mockReturnValue({ showToast: mockShowToast });

    mockMutateAsync = jest.fn();
    mockReset = jest.fn();
    mockUseUploadMeeting.mockReturnValue({
      mutateAsync: mockMutateAsync,
      reset: mockReset,
      isPending: false,
      isError: false,
      error: null,
    });

    mockUseMeeting.mockReturnValue({
      data: null,
    });
  });

  it('renders the upload area correctly', () => {
    render(<AudioUpload />);
    expect(screen.getByText(/Drag & drop your audio file here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('validates file type and shows error', async () => {
    render(<AudioUpload />);
    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/Drag & drop your audio file here/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Unsupported format/i)).toBeInTheDocument();
  });

  it('validates file size and shows error', async () => {
    render(<AudioUpload />);
    const file = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 }); // 30 MB

    const input = screen.getByLabelText(/Drag & drop your audio file here/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/File too large/i)).toBeInTheDocument();
  });

  it('accepts a valid file and triggers upload on click', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'meeting-123' });
    render(<AudioUpload />);

    const file = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Drag & drop your audio file here/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('test.mp3')).toBeInTheDocument();
    expect(screen.getByText(/Upload & Process/i)).toBeInTheDocument();

    const uploadBtn = screen.getByRole('button', { name: /Upload & Process/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(file);
      expect(mockShowToast).toHaveBeenCalledWith('Recording uploaded! Processing started...', 'success');
    });
  });

  it('polls meeting status and updates UI accordingly', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'meeting-123' });
    
    // Dynamically update the mock when called with meeting-123
    mockUseMeeting.mockImplementation((id) => {
      if (id === 'meeting-123') {
        return { data: { id: 'meeting-123', status: MeetingStatus.Processing } };
      }
      return { data: null };
    });

    const { rerender } = render(<AudioUpload />);
    const file = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Drag & drop your audio file here/i);

    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByRole('button', { name: /Upload & Process/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByText(/Transcribing & summarising/i)).toBeInTheDocument();
    });

    // Stage 2: simulate completion
    mockUseMeeting.mockImplementation((id) => {
      if (id === 'meeting-123') {
        return { data: { id: 'meeting-123', status: MeetingStatus.Completed } };
      }
      return { data: null };
    });

    rerender(<AudioUpload />);

    await waitFor(() => {
      expect(screen.getByText(/Done!/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload another recording/i)).toBeInTheDocument();
    });
  });
});
