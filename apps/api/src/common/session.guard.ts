import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from './request.js';
import { SessionService } from '../modules/identity/session.service.js';
import { appConfig } from '../config.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[appConfig().SESSION_COOKIE_NAME] as string | undefined;
    if (!token) throw new UnauthorizedException('Authentication required');
    request.auth = await this.sessions.authenticate(token);
    return true;
  }
}
