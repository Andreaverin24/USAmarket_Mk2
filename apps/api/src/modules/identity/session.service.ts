import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createOpaqueToken, hashToken, verifyPassword } from '@atlas/auth';
import { Redis } from 'ioredis';
import { DatabaseService } from '../../common/database.service.js';
import { appConfig } from '../../config.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class SessionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async login(input: {
    email: string;
    password: string;
    correlationId: string;
    ip?: string;
    userAgent?: string;
  }) {
    await this.throttle('login', input.email, input.ip ?? 'unknown', 10);
    const user = await this.db.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await verifyPassword(user.passwordHash, input.password))
    )
      throw new UnauthorizedException('Invalid credentials');
    const token = createOpaqueToken();
    const csrf = createOpaqueToken();
    const config = appConfig();
    const expiresAt = new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000);
    const session = await this.db.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          csrfHash: hashToken(csrf),
          expiresAt,
          ...(input.ip ? { ipAddress: input.ip } : {}),
          ...(input.userAgent ? { userAgent: input.userAgent.slice(0, 512) } : {}),
        },
      });
      await tx.auditLog.create({
        data: this.audit.entry({
          actorUserId: user.id,
          action: 'session.created',
          resourceType: 'Session',
          resourceId: created.id,
          correlationId: input.correlationId,
        }),
      });
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Session',
          aggregateId: created.id,
          eventType: 'foundation.session.created',
          payload: { userId: user.id },
        },
      });
      return created;
    });
    return { token, csrf, expiresAt, sessionId: session.id };
  }

  async throttleRegistration(email: string, ip?: string) {
    await this.throttle('registration', email, ip ?? 'unknown', 5);
  }

  async authenticate(token: string) {
    const session = await this.db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { status: true } },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    )
      throw new UnauthorizedException('Invalid session');
    return { userId: session.userId, sessionId: session.id };
  }

  async revoke(sessionId: string, userId: string, correlationId: string) {
    await this.db.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: this.audit.entry({
          actorUserId: userId,
          action: 'session.revoked',
          resourceType: 'Session',
          resourceId: sessionId,
          correlationId,
        }),
      });
    });
  }

  async csrfForSession(sessionId: string, value: string) {
    const session = await this.db.session.findUnique({
      where: { id: sessionId },
      select: { csrfHash: true },
    });
    return !!session && session.csrfHash === hashToken(value);
  }

  private async throttle(
    scope: 'login' | 'registration',
    email: string,
    ip: string,
    limit: number,
  ) {
    const config = appConfig();
    const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 0 });
    try {
      await redis.connect();
      const key = `auth:${scope}:${hashToken(`${email.toLowerCase()}:${ip}`)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 300);
      if (count > limit) throw new UnauthorizedException('Too many authentication attempts');
    } catch (error) {
      if (error instanceof UnauthorizedException || config.NODE_ENV === 'production') throw error;
    } finally {
      redis.disconnect();
    }
  }
}
