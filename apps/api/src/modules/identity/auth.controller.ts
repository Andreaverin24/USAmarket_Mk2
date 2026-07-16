import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../common/request.js';
import { SessionGuard } from '../../common/session.guard.js';
import { appConfig } from '../../config.js';
import { DatabaseService } from '../../common/database.service.js';
import { SessionService } from './session.service.js';

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(10).max(200),
});

@ApiTags('identity')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly db: DatabaseService,
  ) {}
  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password', minLength: 10 },
      },
    },
  })
  @ApiOkResponse({ description: 'Authenticated session' })
  async login(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.assertOrigin(request);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid login payload');
    const userAgent = request.headers['user-agent'];
    const result = await this.sessions.login({
      ...parsed.data,
      correlationId: request.correlationId,
      ip: request.ip,
      ...(userAgent ? { userAgent } : {}),
    });
    const secure = appConfig().NODE_ENV === 'production';
    reply.setCookie(appConfig().SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: result.expiresAt,
    });
    reply.setCookie('atlas_csrf', result.csrf, {
      httpOnly: false,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: result.expiresAt,
    });
    return { authenticated: true, csrfToken: result.csrf };
  }
  @Post('logout')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  async logout(
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.assertOrigin(request);
    if (!csrf || !(await this.sessions.csrfForSession(request.auth!.sessionId, csrf)))
      throw new BadRequestException('Invalid CSRF token');
    await this.sessions.revoke(
      request.auth!.sessionId,
      request.auth!.userId,
      request.correlationId,
    );
    reply.clearCookie(appConfig().SESSION_COOKIE_NAME, { path: '/' });
    reply.clearCookie('atlas_csrf', { path: '/' });
    return { authenticated: false };
  }
  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  async me(@Req() request: AuthenticatedRequest) {
    return this.db.user.findUniqueOrThrow({
      where: { id: request.auth!.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            organization: { select: { id: true, slug: true, name: true } },
            role: {
              select: {
                code: true,
                permissions: { select: { permission: { select: { code: true } } } },
              },
            },
          },
        },
      },
    });
  }
  private assertOrigin(request: AuthenticatedRequest) {
    const origin = request.headers.origin;
    if (origin && !appConfig().APP_ORIGINS.includes(origin))
      throw new BadRequestException('Untrusted origin');
  }
}
