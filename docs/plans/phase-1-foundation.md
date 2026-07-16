# Phase 1 — Foundation

Статус: approved for implementation by the user request dated 2026-07-14.

## Цель

Создать запускаемый production-oriented фундамент Project Atlas: monorepo, локальную инфраструктуру, API и worker, оболочки web/portal/driver, базовую identity/tenancy/RBAC модель, безопасные cookie-сессии, audit/outbox, наблюдаемость, OpenAPI, CI и проверяемый seed.

## Scope

- pnpm workspace и Turborepo;
- TypeScript strict, ESLint, Prettier и общие конфигурации;
- Next.js App Router shells: `web`, `portal`, `driver`;
- NestJS/Fastify API: health, auth/session, current user, tenant-scoped members;
- worker на BullMQ с обработчиком transactional outbox;
- PostgreSQL/Prisma: migration и seed;
- Redis, MinIO и Mailpit через Docker Compose;
- typed env validation;
- identity, organizations, memberships, roles и permissions;
- server-side tenant resolution и запрет cross-tenant access;
- append-only audit log и transactional outbox;
- structured JSON logging и correlation ID;
- OpenAPI JSON;
- CI и Testcontainers integration harness.

## Non-goals

- catalog, product/media/import/search;
- cart, checkout, orders, payments/ledger/Stripe;
- shipping quotes, shipments, routes, logistics;
- driver operational/offline flows;
- subscription billing и production deployment automation.

## Архитектурные решения

- [ADR-001: modular monolith](../adr/001-modular-monolith.md)
- [ADR-002: multi-tenancy](../adr/002-multi-tenancy.md)
- [ADR-003: auth/session](../adr/003-auth-session.md)
- [ADR-004: transactional outbox](../adr/004-transactional-outbox.md)
- [Точное дерево monorepo](../architecture/phase-1-monorepo-tree.md)
- [Модель данных Phase 1](../architecture/phase-1-data-model.md)
- [Acceptance tests](phase-1-acceptance-tests.md)

## Schema changes

Первая migration создаёт `users`, `sessions`, `organizations`, `organization_members`, `roles`, `permissions`, `role_permissions`, `storefronts`, `storefront_domains`, `audit_logs`, `feature_flags`, `outbox_events`. UUID являются primary key, даты хранятся в UTC, tenant-owned строки содержат `organization_id`, mutable aggregates имеют `version`.

## API

- `GET /health` — liveness и статусы PostgreSQL/Redis/object storage;
- `GET /openapi.json` — OpenAPI;
- `POST /auth/login` — password login, session cookie, audit;
- `POST /auth/logout` — revoke текущей session;
- `GET /auth/me` — текущий user и memberships;
- `GET /organizations/:organizationId/members` — tenant-scoped RBAC probe.

Все ответы содержат/возвращают `x-correlation-id`. Cookie-auth mutation требует trusted Origin и `x-csrf-token`; login защищён Origin check и throttling.

## UI

Три минимальные доступные оболочки с явной маркировкой Phase 1 и ссылкой на API health. Бизнес-UI следующих фаз отсутствует.

## Tests

- unit: env validation, permission checks, session token hashing, tenant resolution;
- integration: PostgreSQL Testcontainer, migration/seed-compatible schema, разрешённый same-tenant read и безопасный cross-tenant denial;
- API e2e: health/OpenAPI/login/me/logout;
- shell smoke/build checks.

## Риски

- Docker/Testcontainers требуют работающий Docker daemon;
- MinIO health может быть `degraded` до старта Compose, но liveness API остаётся наблюдаемым;
- cookie `Secure` отключается только в local/test окружении;
- preview deploy не создаётся без внешнего deployment provider; CI обеспечивает build-ready артефакт.

## File plan

Полный список — в `docs/architecture/phase-1-monorepo-tree.md`. Реализация ограничена корневыми workspace/config файлами, пятью apps, shared packages, Prisma migration/seed, Docker Compose, CI и документацией Phase 1.

## Точные bootstrap-команды

```bash
pnpm install
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```
