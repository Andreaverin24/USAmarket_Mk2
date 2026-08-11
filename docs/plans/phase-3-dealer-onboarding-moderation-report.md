# Phase 3 dealer onboarding and moderation — implementation report

Дата: 2026-07-20.

Статус реализации: код, schema, migration, permissions, UI и automated scenarios реализованы.
Runtime acceptance не завершён: на workstation не обнаружен доступный локальный PostgreSQL, а
Docker не используется как обязательная замена.

## 1. Что обнаружено

- pnpm/Turbo modular monolith: NestJS/Fastify API, Next.js marketplace/portal, BullMQ worker,
  Prisma 6.19 и PostgreSQL.
- Phase 2 canonical catalog, Shopify import, media processing, tenant isolation, storefront
  hostname resolution, audit и transactional outbox сохранены.
- До Phase 3 отсутствовали dealer application/profile/verification, historical product moderation,
  persisted notifications и admin queues.
- Persisted Phase 2 product statuses сохранены: `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`,
  `PUBLISHED` семантически реализуют review/change/approval/active stages без destructive rename.
- Root `.env` указывает PostgreSQL на `localhost:15432`; listener и локальная PostgreSQL Windows
  installation не обнаружены.

## 2. Что реализовано

### Dealer onboarding

- создание seller organization, OWNER membership, draft storefront, profile и application одной
  транзакцией;
- optimistic version checks для edit/submit/review;
- state machine `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED|REJECTED|CHANGES_REQUESTED`,
  повторная отправка после changes и suspension approved dealer;
- immutable verification history, причины и internal notes;
- storefront activation только после approval и suspension при dealer suspension;
- seller UI `/dealer-onboarding`;
- admin UI `/admin/dealers`.

### Product moderation

- approved-dealer gate на submission;
- новая review record на каждую отправленную product version;
- request changes, resubmit, approve и publish только через application service;
- seller-visible и internal comments;
- audit/outbox для всех lifecycle actions и moderation comments;
- seller UI review history в `/products`;
- admin queue `/admin/moderation`;
- marketplace и storefront читают один canonical `Product.id` и требуют approved dealer.

### Notifications

- persisted IN_APP/EMAIL notification records;
- personal list/read API и `/notifications`;
- idempotency constraint по source outbox event, recipient и channel;
- worker создаёт notifications для dealer/product review lifecycle;
- seller-visible moderation comment уведомляет seller; internal comment не раскрывается;
- IN_APP помечается delivered, EMAIL остаётся queued до подключения provider.

### API endpoints

- `GET|POST /dealer-applications/mine|/dealer-applications`;
- `GET|PATCH /organizations/:organizationId/dealer-application`;
- `POST /organizations/:organizationId/dealer-application/submit`;
- `GET /admin/dealer-applications`;
- `GET /admin/dealer-applications/:applicationId`;
- `POST /admin/dealer-applications/:applicationId/review`;
- `GET /admin/product-moderation`;
- `GET /organizations/:organizationId/catalog/products/:productId/moderation`;
- `POST /admin/product-moderation/:reviewId/comments`;
- existing product submit/moderate endpoints now persist review history and enforce dealer approval;
- `GET /notifications`;
- `PATCH /notifications/:notificationId/read`.

OpenAPI contract обновлён в `docs/api/openapi.json`.

## 3. Database changes

Migration:
`20260720130000_phase_3_dealer_onboarding_moderation`.

Новые enums:

- `DealerStatus`;
- `DealerVerificationAction`;
- `ProductModerationReviewStatus`;
- `ModerationCommentVisibility`;
- `NotificationChannel`;
- `NotificationStatus`.

Новые models:

- `DealerProfile`;
- `DealerApplication`;
- `DealerVerification`;
- `ProductModerationReview`;
- `ProductModerationComment`;
- `Notification`.

Добавлены FK, tenant/status/time indexes и unique constraints:

- one profile/application per organization;
- one review per product/submitted version;
- one notification per source event/recipient/channel.

Migration создана после Phase 2 migration chain и содержит только additive Phase 3 objects. Prisma
schema validation проходит. Фактический `migrate deploy` поверх Phase 2 и с чистой базы не выполнен
на этой workstation из-за отсутствующего PostgreSQL runtime.

## 4. Security

- backend membership/permission enforcement остаётся authoritative;
- platform actions требуют `dealer:review` или `catalog:moderate`;
- public hostname/storefront resolution не даёт admin access;
- seller moderation attempt и cross-tenant product/application reads проверяются негативным
  integration scenario и должны возвращать 404;
- seller history скрывает INTERNAL comments;
- CSRF guard стоит на mutation endpoints;
- optimistic version checks защищают application/product mutations;
- admin lifecycle actions и comments пишут audit + outbox;
- supporting documents валидируются как ограниченные metadata/object references; hardened private
  upload/scanning остаётся известным ограничением.

## 5. Tests and factual results

| Command                          | Result                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | PASS, lockfile up to date, pnpm 11.9.0                                                                        |
| `pnpm format:check`              | PASS after excluding non-runtime `demo/` and `Stich/` design artifacts                                        |
| `pnpm lint`                      | PASS                                                                                                          |
| `pnpm typecheck`                 | PASS, 20/20 Turbo tasks                                                                                       |
| `pnpm test`                      | PASS; API 5 files/18 tests, web 1, worker 1, config 2, auth 2                                                 |
| `pnpm build`                     | PASS, 13/13 Turbo tasks; web/portal/driver/API/worker production builds                                       |
| `prisma validate`                | PASS                                                                                                          |
| `prisma generate`                | PASS, Prisma Client 6.19.0                                                                                    |
| `prisma migrate status`          | FAIL: cannot reach PostgreSQL at `localhost:15432`                                                            |
| `pnpm test:integration`          | BLOCKED: no `TEST_DATABASE_URL`, Testcontainers fallback found no container runtime; 3 suites/7 tests skipped |
| `pnpm phase3:acceptance`         | BLOCKED: cannot reach PostgreSQL at `localhost:15432`                                                         |
| `pnpm openapi:generate`          | PASS                                                                                                          |

Integration harness now prefers `TEST_DATABASE_URL` and creates an isolated temporary schema; Docker
is only an optional Testcontainers fallback. The main development flow does not containerize or
require Docker.

Observed warnings/retries:

- Next.js production builds pass, but web/portal/driver report that the Next.js ESLint plugin is
  not present in the shared ESLint configuration.
- The first final `pnpm test` was launched concurrently with lint/typecheck and worker Vitest hit
  Windows `spawn UNKNOWN`. The required command was repeated in isolation and passed 20/20 Turbo
  tasks. This was not counted as a test pass until the isolated rerun succeeded.
- Packages without test files use the existing `--passWithNoTests`; integration tests are not
  included in that unit-test result.

## 6. Acceptance scenario

Automated scenario is implemented in:

- `apps/api/test/phase3-dealer-moderation.integration.test.ts`;
- `apps/api/test/phase3-acceptance.ts`.

It covers:

1. dealer applies;
2. submission before dealer approval is rejected;
3. admin starts review and approves;
4. dealer creates canonical product;
5. dealer submits product;
6. seller self-moderation is rejected;
7. admin requests changes;
8. dealer edits and resubmits;
9. admin approves and publishes;
10. marketplace/storefront return the same canonical UUID;
11. second tenant gets 404;
12. review history, audit, outbox and notifications are asserted.

Фактический runtime execution остановился до шага 1 из-за недоступной database connection.
Failure evidence после повторного запуска сохраняется в `artifacts/phase-3/acceptance.json`.

## 7. Известные ограничения и незавершённые проверки

- Требуется локальный PostgreSQL и актуальный `DATABASE_URL` для применения migration, seed,
  integration и acceptance.
- Redis/S3-compatible storage нужны для фактической worker/media acceptance; приложения сами
  запускаются напрямую через Node.js/pnpm.
- EMAIL records создаются, но transport provider не настроен.
- Private dealer documents хранятся как validated references; upload quarantine/AV scanning
  требует отдельного hardened pipeline.
- Audit actor role/IP/user-agent не являются отдельными schema columns.
- Phase 4 conversations/offers/reservations не реализованы.

## 8. Точный следующий шаг

1. Запустить локальный PostgreSQL на Windows.
2. Обновить root `.env` на фактический local port (рекомендуемый default `5432`).
3. Создать отдельную test database и установить `TEST_DATABASE_URL`.
4. Выполнить `pnpm db:migrate`, `pnpm db:seed`, `pnpm test:integration` и
   `pnpm phase3:acceptance`.
5. Запустить локальные Redis/S3 services и подтвердить worker notification/media compatibility.
6. Только после PASS этих команд принять Phase 3. Phase 4 не начата.
