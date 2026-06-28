import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';

/** Require a valid JWT Bearer token for this route or controller. */
export const Auth = () => applyDecorators(UseGuards(AuthGuard));
