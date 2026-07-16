# MASTER PROMPT ДЛЯ CODEX
## Реализация Premium Marketplace MVP

Ты работаешь как principal engineer и технический исполнитель проекта premium furniture marketplace.

Основной источник требований:
- `docs/product/MVP_TECH_SPEC_RU.md`

Не пытайся реализовать весь продукт одним запросом. Работай строго по фазам и создавай проверяемые вертикальные slices.

---

## 1. Главная цель

Создать production-oriented modular monolith:

- marketplace;
- multi-tenant seller storefronts;
- seller/admin/dispatcher portal;
- driver PWA;
- order/payment/logistics workflow;
- первый pilot storefront Established Lines.

---

## 2. Обязательный стек

- TypeScript strict mode.
- pnpm workspace.
- Turborepo.
- Next.js App Router.
- NestJS + Fastify.
- PostgreSQL.
- Prisma.
- Redis.
- BullMQ.
- S3-compatible object storage.
- Docker Compose.
- OpenAPI.
- Playwright.
- Vitest/Jest.
- Testcontainers.

Не заменяй стек без ADR и явного разрешения.

---

## 3. Архитектурные ограничения

- Modular monolith.
- Одна основная PostgreSQL database.
- Модули не обращаются напрямую к приватным таблицам других модулей.
- Статусы изменяются через state machines/application services.
- Side effects через transactional outbox.
- Деньги только integer minor units.
- tenant_id определяется server-side.
- RBAC и tenant checks обязательны.
- Все payment webhooks persist-first и idempotent.
- Driver sync operations idempotent.
- Внешние providers скрыты adapters.
- Не добавляй функции за пределами текущей фазы.
- Не создавай Kubernetes, GraphQL, microservices, Elasticsearch.

---

## 4. Порядок работы на каждом milestone

Перед изменениями:

1. Прочитай ТЗ.
2. Изучи текущий repository.
3. Напиши `docs/plans/<milestone>.md`:
   - цель;
   - scope;
   - non-goals;
   - архитектурные решения;
   - schema changes;
   - API;
   - UI;
   - tests;
   - risks;
   - file plan.
4. Покажи план и дождись команды на реализацию, если работа идёт интерактивно.
5. Если команда уже разрешает реализацию — реализуй после сохранения плана.

После реализации:

1. Запусти format.
2. Запусти lint.
3. Запусти typecheck.
4. Запусти unit tests.
5. Запусти integration tests.
6. Запусти build.
7. Запусти relevant E2E.
8. Обнови документацию.
9. Создай итоговый отчёт:
   - что сделано;
   - изменённые файлы;
   - migrations;
   - API;
   - тесты и результаты;
   - известные ограничения;
   - следующий milestone.

Не заявляй `готово`, если команды не были реально выполнены.

---

## 5. Первый запрос Codex: bootstrap

Выполни только Phase 1 Foundation.

### Deliverables

Monorepo:

```text
apps/web
apps/portal
apps/driver
apps/api
apps/worker
packages/ui
packages/contracts
packages/database
packages/auth
packages/config
packages/observability
packages/testing
infrastructure/docker
docs/adr
docs/plans
docs/runbooks
```

### Реализовать

- pnpm workspace;
- turbo pipelines;
- shared TS config;
- ESLint/Prettier;
- Docker Compose:
  - postgres;
  - redis;
  - minio;
  - mailpit;
- typed env validation;
- NestJS API health endpoint;
- Prisma base schema;
- migrations;
- seed;
- identity;
- organizations;
- organization membership;
- roles/permissions;
- tenant resolution abstraction;
- audit log;
- structured logging;
- correlation ID;
- OpenAPI;
- web/portal/driver shells;
- CI workflow;
- Testcontainers integration harness.

### Base schema

Минимум:
- User
- Session
- Organization
- OrganizationMember
- Role
- Permission
- RolePermission
- Storefront
- StorefrontDomain
- AuditLog
- FeatureFlag

### Acceptance criteria

- `pnpm install`
- `docker compose up -d`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm dev`
- health endpoint returns dependencies status;
- seeded admin can log in;
- seller and driver accounts exist in seed;
- cross-tenant access integration test fails safely;
- OpenAPI is generated;
- lint/typecheck/test/build pass.

Не переходи к catalog, payments или logistics в этом milestone.

---

## 6. Второй запрос Codex: Catalog + Established Lines

После успешного Foundation реализуй Phase 2.

### Scope
- categories;
- products;
- media;
- moderation;
- marketplace catalog;
- seller storefront resolution by hostname;
- Established Lines preset;
- Shopify CSV import;
- search/filter;
- SEO;
- redirect mapping.

### Вертикальный acceptance
- импортировать fixture из 10 товаров;
- увидеть один товар на marketplace;
- увидеть тот же товар на Established Lines storefront;
- изменить его в seller portal;
- изменение отражается в обоих каналах;
- другой seller не может прочитать/изменить товар;
- public pages pass smoke E2E.

---

## 7. Третий запрос Codex: Checkout

После Phase 2:
- buyer;
- addresses;
- cart;
- reservation TTL;
- PurchaseGroup;
- Order;
- OrderItem;
- Stripe adapter/test mode;
- connected account state;
- payment webhook inbox;
- ledger;
- order timeline;
- notifications.

Обязательные concurrency tests:
- два buyer покупают один inventory item;
- duplicate payment webhook;
- timeout reservation и поздний webhook;
- retry checkout с одинаковым idempotency key.

---

## 8. Четвёртый запрос Codex: Logistics

После Checkout:
- shipping quote request;
- quote versions;
- rule engine;
- shipments;
- routes;
- route stops;
- dispatcher UI;
- seller readiness;
- assignments;
- tracking timeline.

Не делать сложную автоматическую оптимизацию маршрутов.

---

## 9. Пятый запрос Codex: Driver PWA

- installable manifest;
- active route offline cache;
- photo upload queue;
- QR scan;
- geolocation;
- condition checklist;
- signature;
- delivery PIN;
- incidents;
- sync retries;
- idempotency;
- proof report.

Обязательный E2E:
- открыть route online;
- отключить сеть;
- выполнить pickup evidence;
- включить сеть;
- синхронизировать;
- повторить sync;
- получить ровно один completed stop.

---

## 10. Шестой запрос Codex: Payout + hardening

- payout hold/release;
- incident block;
- refund;
- cancellation;
- admin decisions;
- security tests;
- performance;
- backup runbook;
- production readiness.

---

## 11. Формат ответа Codex

Каждый ответ:

```text
Milestone:
Status:

Plan:
...

Implemented:
...

Files:
...

Database:
...

API:
...

Tests executed:
- command — result

Risks / limitations:
...

Next exact step:
...
```

Никаких общих фраз без файлов, команд и результатов.

---

## 12. Начальная команда

Начни с анализа пустого или существующего репозитория и подготовь:

1. `docs/plans/phase-1-foundation.md`
2. ADR:
   - modular monolith;
   - tenancy;
   - auth/session;
   - outbox;
3. дерево monorepo;
4. список schema entities;
5. список точных команд bootstrap;
6. список acceptance tests.

Затем реализуй Phase 1 Foundation, если текущая команда явно разрешает кодирование.
