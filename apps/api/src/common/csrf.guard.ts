import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './request.js';
import { appConfig } from '../config.js';
import { SessionService } from '../modules/identity/session.service.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const origin = request.headers.origin;
    if (!origin || !appConfig().APP_ORIGINS.includes(origin))
      throw new BadRequestException('Untrusted origin');
    const csrf = request.headers['x-csrf-token'];
    if (
      typeof csrf !== 'string' ||
      !request.auth ||
      !(await this.sessions.csrfForSession(request.auth.sessionId, csrf))
    )
      throw new BadRequestException('Invalid CSRF token');
    return true;
  }
}
