import {
  BadRequestException,
  Body,
  ConflictException,
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
import { hashPassword } from '@atlas/auth';

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(10).max(200),
});

const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
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
    this.setSessionCookies(reply, result);
    return { authenticated: true, csrfToken: result.csrf };
  }
  @Post('register')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['displayName', 'email', 'password'],
      properties: {
        displayName: { type: 'string', minLength: 2, maxLength: 160 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password', minLength: 10 },
      },
    },
  })
  async register(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.assertOrigin(request);
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid registration payload');
    const email = parsed.data.email.toLowerCase();
    await this.sessions.throttleRegistration(email, request.ip);
    try {
      const user = await this.db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            displayName: parsed.data.displayName,
            passwordHash: await hashPassword(parsed.data.password),
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: created.id,
            action: 'identity.user.registered',
            resourceType: 'User',
            resourceId: created.id,
            correlationId: request.correlationId,
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'User',
            aggregateId: created.id,
            eventType: 'identity.user.registered',
            payload: { userId: created.id },
          },
        });
        return created;
      });
      const userAgent = request.headers['user-agent'];
      const result = await this.sessions.login({
        email: user.email,
        password: parsed.data.password,
        correlationId: request.correlationId,
        ip: request.ip,
        ...(userAgent ? { userAgent } : {}),
      });
      this.setSessionCookies(reply, result);
      return { authenticated: true, csrfToken: result.csrf };
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new ConflictException('Unable to create an account with these credentials');
      throw error;
    }
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
  private setSessionCookies(
    reply: FastifyReply,
    result: { token: string; csrf: string; expiresAt: Date },
  ) {
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
  }
  private isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
