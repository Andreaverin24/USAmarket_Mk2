# Phase 2 — итоговый отчёт

Статус: реализовано и фактически проверено 2026-07-15. Phase 3 не начиналась.

## Реализованные сущности

- Каталог: `Category`, `Product`, `ProductMedia`, `MediaVariant`, `Collection`, `CollectionProduct`, `InventoryItem`, `Location`, `ProductAttribute`.
- Storefront: `Storefront`, `StorefrontTheme`, `StorefrontDomain`, `StorefrontRedirect`.
- Импорт: `ImportJob`, `ImportRow` с checksum, lease, попытками, нормализованным payload и построчным recovery.
- Сквозные механизмы: `AuditLog` и `OutboxEvent` для lifecycle, import и media side effects.
- Статусы товара: `DRAFT`, `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`, `PUBLISHED`, `RESERVED`, `SOLD`, `ARCHIVED`. Переходы выполняются только application service/state machine.

Marketplace и seller storefront используют один canonical `Product`; отдельных копий товара для каналов продаж нет.

## Миграции

В локальной PostgreSQL применены все три миграции:

1. `20260714172956_foundation`
2. `20260714183222_phase_2_catalog_storefront`
3. `20260714190916_phase_2_completion`

Последняя миграция добавляет inventory, product facets, media variants/status, restartable import fields, backfill, а также GIN/trigram индексы. Фактический `prisma migrate status`: `Database schema is up to date`.

## API endpoints

- Public catalog: categories, category detail, facets, sitemap, paginated products/search и product detail.
- Seller catalog: list/detail/create/update/submit/archive, seller categories.
- Moderation: approve, reject с причиной, publish через единый moderation endpoint.
- Media: signed upload URL, upload completion, alt/sort/primary update.
- Shopify: preview/dry run, queued apply, job report, failed-row retry, CSV export.
- Storefront: hostname resolution, homepage projection, product, policy и legacy redirect.
- Phase 1 auth, tenancy и health endpoints сохранены.

OpenAPI находится в `docs/api/openapi.json`.

## Страницы

- Marketplace: `/`, `/catalog`, `/categories/[slug]`, `/products/[slug]`, `/sellers/[sellerSlug]`, `/sitemap.xml`.
- Storefront fallback: `/dealers/[sellerSlug]`, product page, policy page и scoped legacy redirect.
- Established Lines preset: premium hero, compact navigation, New Arrivals/Vintage/Antique/Contemporary/Originals, curated collections, trust/delivery blocks, about/contact/policies и related products.
- Seller portal: `/products` с create/edit lifecycle actions, import preview/apply/status и signed media upload.

## Shopify import flow

1. CSV разбирается с явным column mapping и построчной валидацией.
2. Dry run сохраняет validation report, но не создаёт товары.
3. Apply создаёт `PENDING` job и `catalog.import.requested` в transactional outbox.
4. Worker арендует job, обрабатывает строки независимо и обновляет progress.
5. Re-import выполняет upsert по external ID или SKU; тот же каталог не дублируется.
6. Ошибочные строки можно повторить без повторной обработки успешных.

Фактический fixture run:

- dry-run job `3f5fba5b-68a5-4539-a68c-40f0ea30dd06`: 10 строк, 10 валидных, product count не изменился;
- background job `e1316773-3876-4fe3-a386-05021c073cb3`: `COMPLETED`, импортировано 10;
- re-import job `ea9dd0e0-e2e7-4016-9c0f-3fc70393f517`: canonical Shopify products осталось 10.

## Media flow

Signed URL ограничен tenant/product storage key, MIME, размером и checksum metadata. После `complete` outbox запускает worker. Original сохраняется, Sharp повторно кодирует изображение без EXIF location и создаёт:

- thumbnail WebP;
- optimized WebP;
- optimized AVIF.

В acceptance run загружено 4 originals (`790c3647-5c83-489b-8852-ac6afeee0f7c`, `6a170f65-c5de-4a22-b4e4-4f64635c47a5`, `311456d8-8e5b-4009-b0c2-6b92b2ea5c3d`, `f3440546-f836-46dc-9472-44743201ed46`) и создано 12 variants. Unit test отдельно подтверждает удаление EXIF и ограничения размеров.

## Hostname resolution и tenant isolation

- Verified custom domain разрешается точным server-side lookup.
- Seller subdomain разрешается только под настроенным `PLATFORM_DOMAIN` (`<slug>.atlas.localhost`).
- Неизвестный домен и вложенный неподдерживаемый subdomain дают 404.
- Public hostname не создаёт admin context и не участвует в protected API authorization.
- Protected read/update/media запросы второго продавца к чужому product ID дают 404; storefront collections дополнительно фильтруются по organization ID.

Integration suite подтверждает custom domain, platform subdomain, unknown-domain fail-closed, cross-tenant read/update/media IDOR и storefront isolation.

## Marketplace/storefront consistency

Acceptance product `0210551d-4b26-4860-a600-30def648e5c7` опубликован под slug `italian-travertine-console`. Marketplace и Established Lines storefront вернули один UUID. После seller edit оба канала показали `Acceptance canonical edit 1784087761578`. Поиск нашёл изменённый товар; legacy URL разрешился в `/dealers/established-lines/products/italian-travertine-console`.

## Фактическая verification matrix

| Команда                  | Результат                                                                         |
| ------------------------ | --------------------------------------------------------------------------------- |
| `pnpm format:check`      | PASS, все файлы соответствуют Prettier                                            |
| `pnpm lint`              | PASS, 20/20 Turbo tasks и root E2E/config ESLint                                  |
| `pnpm typecheck`         | PASS, 20/20 Turbo tasks и E2E TypeScript                                          |
| `pnpm test`              | PASS, 20/20 tasks; API 16/16, worker media 1/1, web JSON-LD 1/1                   |
| `pnpm test:integration`  | PASS, 2 файла, 6/6 tests                                                          |
| `pnpm build`             | PASS, 13/13 production build tasks                                                |
| `pnpm test:e2e`          | PASS, Edge/Playwright 3/3                                                         |
| `pnpm phase2:acceptance` | PASS, dry run + background fixture + re-import + media + moderation + consistency |

## Acceptance evidence

- `artifacts/phase-2/acceptance.json` — machine-readable IDs и результаты полного сценария.
- `playwright-report/index.html` — последний HTML report, 3/3 passed.
- `test-results/` — Playwright traces/screenshots создаются для неуспешных попыток; финальный run прошёл без failure screenshot.
- `apps/api/test/fixtures/shopify-products.csv` — fixture из 10 товаров.

## Известные ограничения

1. Внешний deployment, TLS и DNS issuance custom domains не проверялись; локально проверена server-side hostname resolution.
2. Lighthouse/axe baseline не выполнялся. Playwright проверяет навигацию, content, SEO primitives и отсутствие client runtime errors, но не заменяет performance/accessibility audit.
3. В acceptance fixture внешние Shopify image URLs намеренно не скачиваются. Worker имеет SSRF, redirect, timeout, size, MIME и checksum controls, но внешний сетевой image fetch не покрыт отдельным end-to-end тестом.
4. AVIF создаётся worker-окружением Sharp; browser capability negotiation/CDN transcoding не реализованы.
5. Технический wrapper глобального pnpm 11.13.0 пытался проверить подпись версии через недоступный registry. Все обязательные команды фактически выполнены локальным установленным pnpm 11.7.0 без загрузки зависимостей.
6. Checkout, orders, Stripe, shipping workflow, subscriptions и driver functionality не реализованы и остаются вне Phase 2.

## Точный следующий шаг

Остановиться на Phase 2 и передать её на acceptance review. Phase 3 начинать только после отдельной команды пользователя.
