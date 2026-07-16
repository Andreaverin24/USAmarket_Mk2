export interface HealthResponse {
  status: 'ok' | 'degraded';
  dependencies: Record<string, 'up' | 'down'>;
  timestamp: string;
}

export interface TenantContext {
  organizationId: string;
  userId: string;
  permissions: readonly string[];
}
