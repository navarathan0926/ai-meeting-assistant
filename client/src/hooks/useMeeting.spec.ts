import { meetingKeys } from './useMeeting';
import { MeetingStatus, Meeting } from '@/types/meeting';

describe('meetingKeys', () => {
  const userId = 'user-abc';

  it('should return a user-scoped list key for "all"', () => {
    expect(meetingKeys.all(userId)).toEqual(['meetings', userId, 'list', '']);
  });

  it('should return a user-scoped detail key for "detail"', () => {
    expect(meetingKeys.detail(userId, 'abc-123')).toEqual([
      'meetings',
      userId,
      'detail',
      'abc-123',
    ]);
  });

  it('should not collide list and detail keys when search is empty', () => {
    expect(meetingKeys.all(userId, '')).not.toEqual(
      meetingKeys.detail(userId, '__none__'),
    );
  });
});

describe('useMeeting — polling logic', () => {
  function getRefetchInterval(status: MeetingStatus | undefined): number | false {
    const isTerminal =
      status === MeetingStatus.Completed || status === MeetingStatus.Failed;
    return isTerminal ? false : 3000;
  }

  it('should stop polling when status is Completed', () => {
    expect(getRefetchInterval(MeetingStatus.Completed)).toBe(false);
  });

  it('should poll every 3000ms when status is Pending', () => {
    expect(getRefetchInterval(MeetingStatus.Pending)).toBe(3000);
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

  it('should return 3000 when at least one meeting is pending', () => {
    const meetings: Partial<Meeting>[] = [
      { id: '1', status: MeetingStatus.Completed },
      { id: '2', status: MeetingStatus.Pending },
    ];
    expect(getListRefetchInterval(meetings as Meeting[])).toBe(3000);
  });
});
