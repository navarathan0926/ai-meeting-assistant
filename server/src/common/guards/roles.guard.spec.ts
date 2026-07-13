import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../auth/enums/user-role.enum';
import { User } from '../../auth/entities/user.entity';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createContext(user?: User) {
    return {
      getHandler: () => jest.fn(),
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }

  it('should allow when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ role: UserRole.User } as User))).toBe(
      true,
    );
  });

  it('should allow when user has a required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.Admin]);

    expect(
      guard.canActivate(
        createContext({ role: UserRole.Admin } as User),
      ),
    ).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.Admin]);

    expect(() =>
      guard.canActivate(createContext({ role: UserRole.User } as User)),
    ).toThrow(ForbiddenException);
  });
});
