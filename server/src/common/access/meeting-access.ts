import { ForbiddenException } from '@nestjs/common';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { Meeting } from '../../meetings/entities/meeting.entity';

export function assertMeetingAccess(user: User, meeting: Meeting): void {
  if (user.role === UserRole.Admin) {
    if (meeting.organizationId !== user.organizationId) {
      throw new ForbiddenException('You do not have access to this meeting.');
    }
    return;
  }

  if (meeting.userId !== user.id) {
    throw new ForbiddenException('You do not have access to this meeting.');
  }
}
