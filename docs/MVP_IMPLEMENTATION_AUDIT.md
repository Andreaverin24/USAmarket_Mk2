# THE GUILD MVP implementation audit

Дата аудита: 2026-07-20.

## Repository и стек

Фактический Git root: `C:\AVERIN\ЮрийСШАмаркетплейс`.

Проект — pnpm/Turbo monorepo на TypeScript:

- `apps/api`: NestJS 11 + Fastify, cookie sessions, CSRF/origin guards, OpenAPI;
- `apps/web`: Next.js 15 public marketplace и seller storefront;
- `apps/portal`: Next.js seller operations;
- `apps/worker`: BullMQ worker, transactional outbox, Shopify import и Sharp media pipeline;
- `apps/driver`: существующий shell, не расширяется в Phase 3;
- `packages/database`: Prisma 6.19 и единая PostgreSQL schema;
- `packages/auth`, `catalog`, `config`, `contracts`, `observability`, `testing`, `ui`.

Основной local development flow запускает приложения напрямую через Node.js/pnpm, Prisma и
локальный PostgreSQL на Windows. Redis и S3-compatible storage подключаются как локальные или
внешние сервисы. Docker Compose существует только как опциональная изолированная инфраструктура и
не является обязательной зависимостью проекта.

## Фактическое состояние Phase 2

В коде и schema присутствуют:

- canonical `Product`, `InventoryItem`, `ProductAttribute`, `ProductMedia`, `MediaVariant`;
- category, location, collection и storefront projections;
- PostgreSQL full-text/trigram search за `PostgresSearchProvider`;
- seller catalog CRUD и product state machine;
- Shopify dry run, restartable background import и idempotent upsert;
- signed media upload, MIME/checksum validation, WebP/AVIF variants и EXIF removal;
- hostname-based storefront resolution, subdomain/custom domain/fallback routes;
- session authentication, CSRF/origin protection, tenant permissions, audit log и outbox.

Prisma schema проходит `prisma validate`, client generation проходит. На момент аудита Windows
service, binaries и listener PostgreSQL на `5432`/`15432` не обнаружены, поэтому `migrate status`
не смог подключиться. Docker не использовался как подмена основного local flow. Это
инфраструктурное состояние, а не schema mismatch.

## Расхождения с новым ТЗ

1. Git repository теперь существует в корне workspace; прежний Phase 2 отчёт указывал, что `.git`
   отсутствовал.
2. Текущие product status names сохраняют утверждённый Phase 2 контракт:
   `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`, `PUBLISHED`. Они семантически соответствуют
   `IN_REVIEW`, `CHANGES_REQUESTED`, approval gate и `ACTIVE` из целевой модели.
3. До Phase 3 moderation сохраняла только последний `Product.moderationNote`; исторических review
   и comments не было.
4. Organization была `ACTIVE` независимо от dealer verification; publication не проверяла
   approved dealer.
5. Platform/organization roles реализованы permission grants, но seed не содержал полного набора
   ролей из нового ТЗ.
6. Persisted notifications и admin review queues отсутствовали.
7. `AuditLog` уже покрывает actor, organization, before/after и correlation ID, но actor role,
   request IP/user-agent ещё не являются отдельными колонками.

## Prisma mapping

| Требование               | До Phase 3  | Решение Phase 3                             |
| ------------------------ | ----------- | ------------------------------------------- |
| Organization/member      | Реализовано | Сохраняется                                 |
| DealerProfile            | Нет         | Добавить                                    |
| DealerApplication        | Нет         | Добавить                                    |
| DealerVerification       | Нет         | Добавить immutable history                  |
| Storefront/domain        | Реализовано | Активировать только после dealer approval   |
| Product                  | Реализовано | Canonical ID и Phase 2 statuses сохраняются |
| ProductModerationReview  | Нет         | Добавить versioned review history           |
| ProductModerationComment | Нет         | Добавить internal/seller-visible comments   |
| Notification             | Нет         | Добавить outbox-driven persistence          |
| AuditEvent               | `AuditLog`  | Переиспользовать, не дублировать            |
| OutboxEvent              | Реализовано | Переиспользовать                            |

## Архитектурные долги и риски

- `Role.code` глобально unique, поэтому organization role instances используют tenant-prefixed
  technical codes; человекочитаемый role name хранит canonical role.
- Supporting documents в Phase 3 представлены только безопасными object references/metadata.
  Private document upload и malware scanning требуют отдельного hardened pipeline.
- Email provider не настроен. Phase 3 создаёт idempotent email notification jobs; фактическая
  доставка зависит от будущей provider configuration.
- Rate limiting для будущих inquiry/offer endpoints относится к Phase 4. Auth/upload hardening
  сохраняется из текущего ядра.
- Order, payment, delivery, payout и subscription модели не реализуются в Phase 3.
- Audit metadata нельзя использовать для хранения документов, секретов или raw PII.

## Scope decision

Phase 3 добавляет dealer onboarding, manual review, approved-dealer publication gate, historical
product moderation, notifications, admin/seller UI и tenant/security tests. Conversations, offers,
reservations, checkout, payments, delivery и payouts не входят в текущую реализацию.
