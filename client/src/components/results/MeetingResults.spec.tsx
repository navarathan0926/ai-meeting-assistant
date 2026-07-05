import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeetingResults } from './MeetingResults';
import { Meeting, MeetingStatus } from '@/types/meeting';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'uuid-1234',
    originalFileName: 'meeting.mp3',
    status: MeetingStatus.Completed,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    transcription: {
      id: 'trans-1',
      text: 'This is the full transcript text.',
      durationSeconds: 125,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    summary: {
      id: 'sum-1',
      overview: 'The meeting covered Q2 targets.',
      keyPoints: ['Budget approved', 'Timeline confirmed'],
      actionItems: ['Send report to John', 'Schedule follow-up'],
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MeetingResults', () => {
  // ── Failed state ──────────────────────────────────────────────────────────

  describe('when meeting status is Failed', () => {
    it('should render the error panel with "Processing Failed" heading', () => {
      const meeting = buildMeeting({ status: MeetingStatus.Failed });
      render(<MeetingResults meeting={meeting} />);

      expect(screen.getByRole('heading', { name: /processing failed/i })).toBeInTheDocument();
    });

    it('should show the errorMessage when available', () => {
      const meeting = buildMeeting({
        status: MeetingStatus.Failed,
        errorMessage: 'OpenAI API key is invalid.',
      });
      render(<MeetingResults meeting={meeting} />);

      expect(screen.getByText('OpenAI API key is invalid.')).toBeInTheDocument();
    });

    it('should show a fallback message when errorMessage is undefined', () => {
      const meeting = buildMeeting({ status: MeetingStatus.Failed, errorMessage: undefined });
      render(<MeetingResults meeting={meeting} />);

      expect(
        screen.getByText(/An unexpected error occurred/i),
      ).toBeInTheDocument();
    });
  });

  // ── Non-completed states ──────────────────────────────────────────────────

  describe('when meeting status is Pending or Processing', () => {
    it('should render nothing (null) when status is Pending', () => {
      const meeting = buildMeeting({ status: MeetingStatus.Pending });
      const { container } = render(<MeetingResults meeting={meeting} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should render nothing (null) when status is Processing', () => {
      const meeting = buildMeeting({ status: MeetingStatus.Processing });
      const { container } = render(<MeetingResults meeting={meeting} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ── Completed state ───────────────────────────────────────────────────────

  describe('when meeting status is Completed', () => {
    it('should render the original file name', () => {
      render(<MeetingResults meeting={buildMeeting()} />);
      expect(screen.getByText('meeting.mp3')).toBeInTheDocument();
    });

    it('should display the formatted duration in the header', () => {
      render(<MeetingResults meeting={buildMeeting()} />);
      // 125 seconds → 2m 5s
      expect(screen.getByText(/2m 5s/i)).toBeInTheDocument();
    });

    it('should render the summary overview', () => {
      render(<MeetingResults meeting={buildMeeting()} />);
      expect(screen.getByText('The meeting covered Q2 targets.')).toBeInTheDocument();
    });

    it('should render all key points', () => {
      render(<MeetingResults meeting={buildMeeting()} />);
      expect(screen.getByText('Budget approved')).toBeInTheDocument();
      expect(screen.getByText('Timeline confirmed')).toBeInTheDocument();
    });

    it('should render all action items', () => {
      render(<MeetingResults meeting={buildMeeting()} />);
      expect(screen.getByText('Send report to John')).toBeInTheDocument();
      expect(screen.getByText('Schedule follow-up')).toBeInTheDocument();
    });

    it('should render the full transcript text', () => {
      render(<MeetingResults meeting={buildMeeting()} />);
      expect(screen.getByText('This is the full transcript text.')).toBeInTheDocument();
    });

    it('does not render an audio player (audio is shown in the dashboard sticky bar)', () => {
      const meeting = buildMeeting({ audioUrl: 'https://example.com/audio.mp3' });
      render(<MeetingResults meeting={meeting} />);
      expect(document.querySelector('audio')).not.toBeInTheDocument();
    });

    it('should NOT render summary sections when summary is absent', () => {
      const meeting = buildMeeting({ summary: undefined });
      render(<MeetingResults meeting={meeting} />);
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
      expect(screen.queryByText('Key Points')).not.toBeInTheDocument();
    });

    it('should NOT render key points section when keyPoints is empty', () => {
      const meeting = buildMeeting({
        summary: {
          id: 's1',
          overview: 'Some overview',
          keyPoints: [],
          actionItems: ['Do something'],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      render(<MeetingResults meeting={meeting} />);
      expect(screen.queryByText('Key Points')).not.toBeInTheDocument();
    });

    it('should NOT render transcript section when transcription is absent', () => {
      const meeting = buildMeeting({ transcription: undefined });
      render(<MeetingResults meeting={meeting} />);
      expect(screen.queryByText('Full Transcript')).not.toBeInTheDocument();
    });
  });

  // ── formatDuration helper ─────────────────────────────────────────────────

  describe('formatDuration helper (via rendered output)', () => {
    const cases: [number, string][] = [
      [0, '0m 0s'],
      [60, '1m 0s'],
      [90, '1m 30s'],
      [3661, '61m 1s'],
    ];

    cases.forEach(([seconds, expected]) => {
      it(`should format ${seconds}s as "${expected}"`, () => {
        const meeting = buildMeeting({
          transcription: {
            id: 't1',
            text: 'transcript',
            durationSeconds: seconds,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        });
        render(<MeetingResults meeting={meeting} />);
        expect(screen.getByText(new RegExp(`Duration:\\s*${expected}`))).toBeInTheDocument();
      });
    });
  });
});
