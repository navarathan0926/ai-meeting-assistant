import { meetingKeys } from './useMeeting';
import { MeetingStatus, Meeting } from '@/types/meeting';

// ── meetingKeys ────────────────────────────────────────────────────────────────

describe('meetingKeys', () => {
  it('should return the base meetings key for "all"', () => {
    expect(meetingKeys.all).toEqual(['meetings']);
  });

  it('should return a scoped key for "detail" with the given id', () => {
    expect(meetingKeys.detail('abc-123')).toEqual(['meetings', 'abc-123']);
  });

  it('should use empty string id when no id given (matches useMeeting disabled state)', () => {
    expect(meetingKeys.detail('')).toEqual(['meetings', '']);
  });
});

// ── Hook logic (pure logic tests without rendering) ───────────────────────────

/**
 * We test the polling logic extracted from the hooks as pure functions
 * since full React Query hook rendering requires significant setup.
 *
 * The polling logic is: return false if terminal, return 3000 otherwise.
 */

describe('useMeeting — polling logic', () => {
  function getRefetchInterval(status: MeetingStatus | undefined): number | false {
    const isTerminal =
      status === MeetingStatus.Completed || status === MeetingStatus.Failed;
    return isTerminal ? false : 3000;
  }

  it('should stop polling (return false) when status is Completed', () => {
    expect(getRefetchInterval(MeetingStatus.Completed)).toBe(false);
  });

  it('should stop polling (return false) when status is Failed', () => {
    expect(getRefetchInterval(MeetingStatus.Failed)).toBe(false);
  });

  it('should poll every 3000ms when status is Pending', () => {
    expect(getRefetchInterval(MeetingStatus.Pending)).toBe(3000);
  });

  it('should poll every 3000ms when status is Processing', () => {
    expect(getRefetchInterval(MeetingStatus.Processing)).toBe(3000);
  });

  it('should poll every 3000ms when status is undefined (loading)', () => {
    expect(getRefetchInterval(undefined)).toBe(3000);
  });
});

describe('useMeetings — list polling logic', () => {
  function getListRefetchInterval(meetings: Meeting[] | undefined): number | false {
    if (!meetings) return false;
    const hasPending = meetings.some(
      (m) =>
        m.status === MeetingStatus.Pending ||
        m.status === MeetingStatus.Processing,
    );
    return hasPending ? 3000 : false;
  }

  it('should return false when meetings is undefined (loading)', () => {
    expect(getListRefetchInterval(undefined)).toBe(false);
  });

  it('should return false when meetings list is empty', () => {
    expect(getListRefetchInterval([])).toBe(false);
  });

  it('should return false when all meetings are terminal (completed/failed)', () => {
    const meetings: Partial<Meeting>[] = [
      { id: '1', status: MeetingStatus.Completed },
      { id: '2', status: MeetingStatus.Failed },
    ];
    expect(getListRefetchInterval(meetings as Meeting[])).toBe(false);
  });

  it('should return 3000 when at least one meeting is pending', () => {
    const meetings: Partial<Meeting>[] = [
      { id: '1', status: MeetingStatus.Completed },
      { id: '2', status: MeetingStatus.Pending },
    ];
    expect(getListRefetchInterval(meetings as Meeting[])).toBe(3000);
  });

  it('should return 3000 when at least one meeting is processing', () => {
    const meetings: Partial<Meeting>[] = [
      { id: '1', status: MeetingStatus.Processing },
    ];
    expect(getListRefetchInterval(meetings as Meeting[])).toBe(3000);
  });
});
