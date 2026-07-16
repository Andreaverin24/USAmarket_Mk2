import type { FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  auth?: { userId: string; sessionId: string };
  correlationId: string;
}
