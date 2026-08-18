# Техническое задание на MVP
## Premium Furniture Marketplace + Seller Storefronts + Managed Logistics + Driver PWA

**Рабочее название:** Project Atlas  
**Первый пилотный продавец:** Established Lines  
**Язык документа:** русский  
**Назначение:** основной документ для проектирования и поэтапной реализации через Codex  
**Статус тарифов:** вне MVP; архитектура должна позволять добавить подписки позже без переделки доменной модели.

---

# 1. Видение продукта

Создать американскую premium-commerce платформу для профессиональных продавцов винтажной, дизайнерской и коллекционной мебели, предметов интерьера, искусства и декора.

Платформа объединяет четыре продукта:

1. **Общий marketplace** — каталог товаров разных продавцов.
2. **Seller Commerce OS** — кабинет продавца, каталог, заказы, клиенты и аналитика.
3. **Персональные сайты продавцов** — storefront на поддомене или собственном домене, использующий единый каталог.
4. **Managed logistics** — заявка на забор, диспетчеризация, водительское PWA, фотофиксация и подтверждение доставки.

Основное обещание:

> Продавец управляет товарами один раз и публикует их одновременно на общем marketplace и на собственном сайте. После продажи платформа организует оплату, забор и доставку, а продавец не платит процент marketplace с стоимости товара.

В MVP подписка и биллинг продавцов не реализуются. Необходимо лишь заложить сущности `plan`, `subscription`, `entitlement`, feature flags и ограничения так, чтобы их можно было включить позднее.

---

# 2. Цели MVP

MVP должен подтвердить четыре гипотезы:

1. Покупатель готов совершить дорогую покупку на новой площадке, если карточка товара, доверие, оплата и доставка собраны в одном процессе.
2. Продавец ценит единый каталог, который публикуется и на marketplace, и на его собственном сайте.
3. Координацию pickup/delivery можно вести через общую систему статусов без ручного хаоса в мессенджерах.
4. Driver PWA обеспечивает доказуемую цепочку передачи товара: фото, время, геолокация, подписи и замечания.

---

# 3. Границы MVP

## 3.1 Входит в MVP

### Marketplace
- Главная страница.
- Каталог.
- Категории и фильтры.
- Полнотекстовый поиск.
- Страница товара.
- Страница продавца.
- Избранное.
- Корзина.
- Checkout.
- Заказ.
- Статус заказа.
- Запрос цены доставки, если автоматическая цена недоступна.
- Уведомления email.
- SEO-страницы и структурированные данные.

### Seller Storefront
- Автоматический сайт продавца на поддомене.
- Подключение собственного домена через админ-процесс.
- Брендинг: логотип, цвета, hero, текст About, контакты.
- Каталог продавца.
- Категории и коллекции продавца.
- Страница товара.
- Корзина и checkout.
- Все данные берутся из общего каталога, без дублирования.

### Seller Dashboard
- Онбординг продавца.
- Профиль и реквизиты.
- Управление товарами.
- Медиа.
- Инвентарь и доступность.
- Заказы.
- Pickup readiness.
- Клиенты и обращения.
- Настройки storefront.
- Импорт каталога Established Lines из Shopify CSV.
- Экспорт каталога в CSV.
- Базовая аналитика.

### Admin / Operations
- Модерация продавцов.
- Модерация товаров.
- Управление заказами.
- Управление спорами и инцидентами.
- Управление доставками.
- Назначение перевозчика, водителя и маршрута.
- Просмотр фотофиксации.
- Audit log.

### Logistics
- Создание shipment из заказа.
- Pickup и delivery stops.
- Слоты и временные окна.
- Тип услуги.
- Требования: этаж, лифт, лестницы, количество грузчиков, упаковка, сборка.
- Предварительная стоимость доставки: вручную или простым rule engine.
- Назначение водителя.
- Статусы доставки.
- Фото до погрузки и после разгрузки.
- Подписи.
- PIN-подтверждение доставки.
- Инциденты.
- Proof of pickup и proof of delivery.

### Driver PWA
- Авторизация.
- Список маршрутов.
- Карта и stops.
- Детали pickup/delivery.
- Offline-capable сохранение активного маршрута.
- Сканирование QR-кода.
- Фото.
- Геолокация.
- Чек-лист состояния.
- Подпись пальцем.
- PIN.
- Инцидент.
- Синхронизация после восстановления сети.

### Payments
- Архитектура под Stripe Connect.
- Покупатель оплачивает товар и доставку.
- Продавец проходит connected-account onboarding.
- Платформа ведёт внутренний ledger.
- Выплата продавцу инициируется по правилам после подтверждения доставки или ручного решения администратора.
- Refund и cancellation flow.
- Webhook processing с идемпотентностью.

**Юридическая оговорка:** систему нельзя называть escrow без отдельной юридической модели и лицензирования. В интерфейсе использовать формулировки `payment pending`, `seller payout scheduled`, `payout released`.

---

## 3.2 Не входит в MVP

- Полноценный subscription billing.
- Комиссионные тарифы.
- AI-генерация описаний и распознавание стиля.
- Автоматические аукционы.
- Реальный-time bidding.
- Нативные iOS/Android-приложения.
- Сложная динамическая оптимизация маршрутов.
- Собственный fleet management.
- Международная доставка.
- Таможня.
- Автоматическая проверка подлинности.
- AR-примерка мебели в комнате.
- Live chat.
- Многоязычность.
- Мультивалютность.
- Сложная CRM.
- Синхронизация с 1stDibs, Chairish и Incollect.
- Складской WMS.
- Полный accounting.
- Returns portal с reverse logistics.
- Система отзывов до появления достаточного объёма заказов.

---

# 4. Пользовательские роли

## 4.1 Guest
- Просматривает каталог.
- Ищет и фильтрует.
- Просматривает продавцов и товары.
- Добавляет в корзину локально.
- Начинает checkout.

## 4.2 Buyer
- Управляет профилем и адресами.
- Сохраняет избранное.
- Оформляет заказ.
- Получает уведомления.
- Видит timeline.
- Подтверждает получение.
- Сообщает о проблеме.

## 4.3 Seller Owner
- Управляет компанией.
- Управляет сотрудниками.
- Управляет каталогом и заказами.
- Настраивает storefront.
- Выполняет payout onboarding.
- Подтверждает готовность товара к pickup.

## 4.4 Seller Staff
Гранулярные разрешения:
- catalog:read/write
- orders:read/write
- customers:read
- storefront:write
- finance:read
- users:manage

## 4.5 Driver
- Видит только назначенные маршруты.
- Выполняет stops.
- Загружает доказательства.
- Создаёт инциденты.
- Не видит финансовые данные заказа.

## 4.6 Dispatcher
- Создаёт и редактирует shipments.
- Назначает водителей.
- Меняет временные окна.
- Обрабатывает исключения.
- Контролирует SLA.

## 4.7 Admin
- Полный доступ.
- Модерация.
- Refund/payout decisions.
- Audit log.
- Support impersonation только через безопасный audited flow.

---

# 5. Ключевые пользовательские сценарии

## 5.1 Покупка товара на marketplace

1. Buyer открывает товар.
2. Вводит ZIP code.
3. Система показывает:
   - цену товара;
   - оценку доставки или `Request shipping quote`;
   - предполагаемый срок;
   - доступные услуги.
4. Buyer добавляет товар в корзину.
5. Проверяется резерв и доступность.
6. Buyer вводит адрес и параметры доступа.
7. Создаётся order draft.
8. Создаётся payment intent.
9. После успешной оплаты:
   - заказ становится `PAID`;
   - товар резервируется;
   - seller получает уведомление;
   - shipment создаётся в `QUOTE_REQUIRED` или `PLANNING`.
10. Seller подтверждает готовность.
11. Dispatcher назначает pickup.
12. Driver выполняет pickup.
13. Driver выполняет delivery.
14. Buyer вводит PIN/подписывает.
15. Order становится `DELIVERED`.
16. После hold period или admin approval создаётся payout release.

## 5.2 Покупка на персональном сайте продавца

Логика та же, но:
- storefront определяется по hostname;
- отображается branding продавца;
- товары ограничены seller tenant;
- источником заказа фиксируется `SELLER_STOREFRONT`;
- заказ и платежи остаются в общей backend-системе.

## 5.3 Ручной shipping quote

1. Buyer отправляет адрес и данные доступа.
2. Создаётся `ShippingQuoteRequest`.
3. Dispatcher рассчитывает цену.
4. Buyer получает quote со сроком действия.
5. Buyer принимает quote.
6. Quote блокируется в заказе.
7. Checkout продолжается.

## 5.4 Pickup

1. Driver открывает stop.
2. Приложение проверяет геолокацию.
3. Driver сканирует QR заказа.
4. Делает обязательные фотографии:
   - общий вид;
   - каждая сторона;
   - существующие повреждения;
   - упаковка.
5. Заполняет condition checklist.
6. Seller подписывает передачу.
7. Stop становится `COMPLETED`.
8. Shipment становится `IN_TRANSIT`.

## 5.5 Delivery

1. Driver прибывает.
2. Проверяет PIN покупателя.
3. Делает фото до и после установки.
4. Фиксирует состояние.
5. Buyer подписывает.
6. При проблеме shipment переводится в `DELIVERED_WITH_EXCEPTION`.
7. Иначе `DELIVERED`.

## 5.6 Повреждение

1. Driver или buyer создаёт incident.
2. Обязательны фото и комментарий.
3. Payout автоматически блокируется.
4. Admin принимает решение:
   - no issue;
   - partial refund;
   - full refund;
   - claim with carrier;
   - repair credit.
5. Все действия пишутся в audit log.

---

# 6. Функциональные требования

## 6.1 Каталог

### Product
Обязательные поля:
- seller_id
- title
- slug
- short_description
- description
- product_type
- category_id
- condition
- quantity
- price
- currency
- status
- location_id
- width, height, depth
- dimension_unit
- weight
- weight_unit
- materials
- colors
- styles
- era (e.g. `1950s`)
- periods
- maker/designer
- country_of_origin
- estimated_year_from/to
- inventory_sku
- shipping_profile_id
- pickup_ready_days
- authenticity_notes
- provenance
- restoration_notes
- created_at, updated_at

Статусы:
- DRAFT
- SUBMITTED
- NEEDS_CHANGES
- APPROVED
- PUBLISHED
- RESERVED
- SOLD
- ARCHIVED

### Product media
- image/video;
- sort order;
- alt text;
- original, optimized и thumbnail variants;
- checksum;
- moderation status.

### Требования к изображениям
- минимум 4 изображения для публикации;
- главное изображение;
- zoom;
- WebP/AVIF derivatives;
- сохранение оригинала;
- автоматическое удаление EXIF location;
- ограничение размеров и MIME;
- signed upload URL.

---

## 6.2 Поиск и фильтры

MVP:
- PostgreSQL full-text search;
- trigram search;
- фильтры:
  - category;
  - price;
  - seller;
  - condition;
  - style;
  - material;
  - color;
  - dimensions;
  - availability;
  - location;
- сортировки:
  - newest;
  - price asc/desc;
  - featured.

Не использовать отдельный Elasticsearch/OpenSearch в первой версии. Ввести интерфейс `SearchProvider`, чтобы позже заменить реализацию.

---

## 6.3 Корзина и резервирование

Правила:
- один physical item не может быть продан дважды;
- резерв создаётся транзакционно;
- reservation TTL на checkout;
- после TTL reservation снимается worker job;
- успешный payment webhook подтверждает резерв;
- все операции идемпотентны;
- optimistic locking/version field на inventory item;
- корзина может содержать товары разных продавцов, но MVP checkout может создавать отдельный order per seller внутри одного purchase group.

Рекомендуемая модель:
- `PurchaseGroup` — покупательский checkout;
- `Order` — заказ одного seller;
- `OrderItem`;
- `Shipment` может обслуживать один или несколько Order, но MVP — один Shipment на Order.

---

## 6.4 Заказ

Статусы заказа:

- DRAFT
- AWAITING_PAYMENT
- PAYMENT_PROCESSING
- PAID
- SELLER_CONFIRMATION_REQUIRED
- READY_FOR_PICKUP
- PICKED_UP
- IN_TRANSIT
- DELIVERED
- DELIVERED_WITH_EXCEPTION
- CANCELLATION_REQUESTED
- CANCELLED
- REFUND_PENDING
- REFUNDED
- DISPUTED
- CLOSED

Статусы должны меняться только через domain service/state machine, а не прямыми UPDATE из контроллеров.

Каждый transition:
- проверяет права;
- проверяет допустимость;
- создаёт domain event;
- пишет audit log;
- запускает side effects через outbox.

---

## 6.5 Storefront multi-tenancy

Tenant определяется по:
1. custom domain;
2. `<seller-slug>.platform-domain.com`;
3. fallback route `/dealers/<seller-slug>`.

Tenant configuration:
- logo;
- favicon;
- primary/secondary colors;
- typography preset;
- hero image;
- hero title/subtitle;
- About;
- contact;
- social links;
- navigation;
- featured collections;
- SEO title/description;
- policy pages;
- enabled sales channels.

Ограничения MVP:
- только утверждённые шаблоны;
- без drag-and-drop page builder;
- custom CSS запрещён;
- custom JavaScript запрещён;
- custom domain подключается администратором;
- TLS автоматически через hosting provider.

Критически важно:
- tenant_id во всех tenant-owned таблицах;
- uniqueness с tenant_id;
- запрещены cross-tenant reads;
- интеграционные тесты на tenant isolation;
- hostname не является единственным механизмом авторизации;
- server-side tenant resolution.

---

## 6.6 Улучшенная витрина Established Lines

Первый storefront должен устранить проблемы текущей витрины:

### Header
- короткая навигация;
- search;
- favorites;
- cart;
- contact/design help.

### Home
- сильный hero;
- чёткое позиционирование;
- New Arrivals;
- Vintage / Antique / Contemporary / Established Lines Originals;
- curated collections;
- trust section;
- delivery explanation;
- story/about;
- newsletter.

### Product page
- чистый premium title;
- metadata subtitle;
- большая галерея;
- цена;
- availability;
- dimensions;
- condition;
- materials;
- maker;
- period;
- origin;
- provenance;
- restoration;
- delivery estimate by ZIP;
- pickup availability;
- Buy Now;
- Request Shipping Quote;
- Ask a Question;
- trust badges;
- related items.
- скрыть пустые reviews;
- исключить технические строки шаблона.

### Collection
- sticky filters desktop;
- filter drawer mobile;
- product count;
- clean cards;
- no duplicate title rendering;
- skeleton loading;
- canonical URLs.

### Import
MVP должен поддерживать:
- Shopify product CSV;
- сопоставление колонок;
- preview;
- validation report;
- dry run;
- idempotent re-import по external_id/SKU;
- импорт изображений по URL в background jobs.

---

# 7. Логистика

## 7.1 Основные сущности

- Carrier
- Driver
- Vehicle
- Shipment
- ShipmentItem
- Route
- RouteStop
- ShippingQuote
- ShippingQuoteRequest
- ServiceLevel
- AccessRequirements
- Proof
- Signature
- Incident
- TrackingEvent

## 7.2 Типы услуг

MVP:
- CURBSIDE
- THRESHOLD
- ROOM_OF_CHOICE
- WHITE_GLOVE
- LOCAL_PICKUP

Дополнительные опции:
- packing;
- unpacking;
- assembly;
- debris removal;
- stairs;
- extra helper;
- appointment required.

## 7.3 Статусы shipment

- QUOTE_REQUIRED
- QUOTED
- PLANNING
- SCHEDULED
- DRIVER_ASSIGNED
- EN_ROUTE_TO_PICKUP
- AT_PICKUP
- PICKED_UP
- IN_TRANSIT
- EN_ROUTE_TO_DELIVERY
- AT_DELIVERY
- DELIVERED
- DELIVERED_WITH_EXCEPTION
- FAILED_ATTEMPT
- CANCELLED

## 7.4 Quote rule engine

Для пилота достаточно rule-based pricing:
- base fee;
- distance band;
- weight band;
- volume band;
- service level;
- stairs;
- helpers;
- packing;
- minimum charge;
- manual override.

Все расчёты сохраняются:
- input snapshot;
- rule version;
- breakdown;
- override reason;
- author.

Нельзя пересчитывать уже принятый quote без создания новой версии.

---

# 8. Driver PWA

## 8.1 Почему PWA

Одна кодовая база, установка на телефон, доступ к камере, геолокации и offline cache. Архитектура должна позволить позднее заменить PWA на React Native без изменения API.

## 8.2 Offline-first требования

Локально сохраняются:
- активный маршрут;
- stops;
- contact summary;
- item checklist;
- pending photos metadata;
- signatures;
- tracking events;
- incidents.

Sync queue:
- client-generated UUID;
- created_at_client;
- retry_count;
- checksum;
- idempotency_key;
- status.

Конфликты:
- server state authoritative для назначения и отмены;
- append-only proofs/events;
- stop completion требует server acknowledgement;
- при отменённом stop офлайн-действия загружаются как evidence, но не закрывают stop автоматически.

## 8.3 Обязательные разрешения
- camera;
- location while using;
- notifications optional.

## 8.4 Безопасность
- short-lived access token;
- refresh rotation;
- device sessions;
- logout all devices;
- PIN/biometric app lock опционально;
- изображения загружаются по signed URL;
- driver видит минимум персональных данных;
- телефон покупателя можно показывать через masked relay позднее; MVP — только авторизованному driver в активном stop.

---

# 9. Платежи и внутренний ledger

## 9.1 Требования

Не связывать бизнес-логику только со Stripe object IDs.

Сущности:
- Payment
- PaymentAttempt
- Refund
- Payout
- LedgerAccount
- LedgerEntry
- ProviderEvent
- SellerConnectedAccount

Ledger — double-entry:
- buyer funds received;
- seller payable;
- shipping payable;
- platform fees;
- refunds;
- disputes;
- payout release.

Деньги хранить integer minor units:
- USD cents;
- никогда float.

## 9.2 Webhooks
- verify signature;
- persist raw event;
- unique provider_event_id;
- process asynchronously;
- idempotent handlers;
- retry;
- dead-letter state;
- operator replay.

## 9.3 Payout release
Условие MVP:
- shipment `DELIVERED`;
- нет открытого incident;
- прошёл configurable hold period;
- admin может hold/release;
- immutable audit entry.

---

# 10. Архитектура

## 10.1 Подход

**Modular monolith**, не микросервисы.

Причины:
- быстрее MVP;
- одна транзакционная база;
- проще consistency;
- ниже DevOps-затраты;
- доменные границы всё равно сохраняются;
- модули можно выделить позже.

Обязательное правило: модули взаимодействуют через публичные application services и domain events, а не читают внутренние таблицы друг друга напрямую.

## 10.2 Рекомендуемый стек

- Monorepo: pnpm + Turborepo.
- Frontend: Next.js App Router + TypeScript.
- UI: Tailwind CSS + собственная component library.
- API: NestJS с Fastify adapter либо чистый Fastify; в данном ТЗ выбрать NestJS/Fastify.
- Database: PostgreSQL.
- ORM: Prisma.
- Cache/locks/queues: Redis.
- Jobs: BullMQ.
- Object storage: S3-compatible.
- Email: provider abstraction.
- Payments: Stripe Connect adapter.
- Maps/geocoding: provider abstraction.
- Auth: email/password + magic link; secure session cookies.
- Observability: OpenTelemetry, structured logs, Sentry-compatible error reporting.
- Tests: Vitest/Jest, Playwright, Testcontainers.
- Local environment: Docker Compose.
- Production: Docker images, managed Postgres, managed Redis, S3-compatible storage.

## 10.3 Monorepo

```text
/apps
  /web                 marketplace + seller storefronts
  /portal              seller + admin + dispatcher
  /driver              driver PWA
  /api                 NestJS API
  /worker              background jobs
/packages
  /ui
  /contracts           DTO/schema/OpenAPI-generated clients
  /database            Prisma schema and migrations
  /auth
  /config
  /observability
  /testing
  /eslint-config
  /tsconfig
/docs
  /adr
  /api
  /runbooks
  /product
/infrastructure
  /docker
  /terraform-or-provider-config-later
```

## 10.4 Backend modules

- identity
- tenancy
- sellers
- storefronts
- catalog
- media
- search
- carts
- checkout
- orders
- payments
- ledger
- shipping-quotes
- logistics
- driver-operations
- notifications
- imports
- analytics
- admin
- audit

Каждый модуль:
- domain;
- application;
- infrastructure;
- presentation;
- tests.

## 10.5 Event/outbox

Транзакционно сохранять:
- агрегатные изменения;
- outbox event.

Worker:
- читает outbox;
- отправляет email;
- обновляет search projection;
- создаёт shipment;
- синхронизирует payment state;
- генерирует image variants;
- строит analytics events.

---

# 11. Модель данных верхнего уровня

```text
User
Organization
OrganizationMember
Role
Permission

SellerProfile
Storefront
StorefrontDomain
StorefrontTheme
Location

Category
Product
ProductVariant
InventoryItem
ProductMedia
Collection
CollectionProduct
ProductAttribute

BuyerProfile
Address
Favorite
Cart
CartItem
Reservation

PurchaseGroup
Order
OrderItem
OrderTimelineEvent

Payment
PaymentAttempt
Refund
Payout
LedgerAccount
LedgerEntry
ProviderEvent

ShippingQuoteRequest
ShippingQuote
Shipment
ShipmentItem
Route
RouteStop
Carrier
DriverProfile
Vehicle
Proof
Signature
Incident
TrackingEvent

ImportJob
ImportRow
Notification
AuditLog
FeatureFlag
Plan
Subscription
Entitlement
```

Все таблицы:
- UUID;
- created_at;
- updated_at;
- где нужно deleted_at;
- tenant_id/organization_id;
- version для optimistic concurrency;
- metadata JSON только для второстепенных расширений, не вместо нормальной схемы.

---

# 12. API

API versioning: `/api/v1`.

Минимальные группы:

```text
/auth
/users
/organizations
/sellers
/storefronts
/domains
/catalog/products
/catalog/categories
/catalog/collections
/media
/search
/carts
/checkout
/orders
/payments
/refunds
/payouts
/shipping-quotes
/shipments
/routes
/driver
/incidents
/imports
/admin
/webhooks/stripe
```

Требования:
- OpenAPI;
- request validation;
- response schemas;
- standardized error envelope;
- correlation_id;
- pagination cursor-based;
- idempotency key для checkout, payment, route completion и webhook replay;
- rate limits;
- authorization guards;
- no PII in logs.

Ошибка:

```json
{
  "error": {
    "code": "PRODUCT_NOT_AVAILABLE",
    "message": "The item is no longer available.",
    "details": {},
    "correlationId": "..."
  }
}
```

---

# 13. Безопасность

- OWASP ASVS-based checklist.
- Secure, httpOnly, SameSite cookies.
- CSRF protection для cookie-auth mutations.
- Password hashing Argon2id.
- MFA для admin и finance permissions.
- RBAC + tenant authorization.
- Signed upload URLs.
- MIME sniffing и antivirus scan hook.
- Image processing sandbox.
- Webhook signature verification.
- Rate limits.
- Login throttling.
- Secrets только в secret manager/env.
- Encryption at rest provider-side.
- TLS only.
- Audit log для:
  - роли;
  - payout;
  - refund;
  - domain;
  - order override;
  - route assignment;
  - incident resolution.
- Data retention policy.
- Privacy export/delete workflow как admin-runbook в MVP.
- Запрещено хранить card data.
- Dependency scanning.
- Container image scanning.
- SAST и secret scanning в CI.

---

# 14. Нефункциональные требования

## Performance
- LCP публичных страниц: целевой p75 ≤ 2.5 s.
- API read p95 ≤ 500 ms без внешних провайдеров.
- Checkout mutations p95 ≤ 1.5 s без ожидания webhook.
- Image CDN.
- Pagination везде.

## Availability
- MVP target 99.5%.
- graceful degradation search/email/maps.
- payment webhook retry.
- daily backups.
- PITR для production DB.

## Accessibility
- WCAG 2.1 AA.
- keyboard navigation.
- labels.
- contrast.
- focus states.
- alt text.

## SEO
- SSR/ISR public pages.
- canonical.
- sitemap per storefront.
- robots.
- Product JSON-LD.
- Organization JSON-LD.
- redirects from Shopify URLs.
- noindex dashboard.

## Auditability
- immutable timeline events;
- state transitions;
- actor;
- timestamp;
- reason;
- source IP/device where appropriate.

---

# 15. Analytics MVP

События:
- product_view;
- search;
- filter_applied;
- add_to_favorite;
- add_to_cart;
- checkout_started;
- shipping_quote_requested;
- payment_succeeded;
- order_created;
- seller_confirmed;
- pickup_completed;
- delivery_completed;
- incident_created.

Dashboard seller:
- views;
- favorites;
- inquiries;
- add-to-cart;
- orders;
- revenue;
- top products.

Не отправлять PII в analytics.

---

# 16. Уведомления

Email templates:
- welcome;
- seller approved;
- product approved/rejected;
- payment received;
- new order;
- seller confirmation reminder;
- shipping quote ready;
- pickup scheduled;
- driver en route;
- picked up;
- delivery scheduled;
- delivered;
- incident opened/resolved;
- payout scheduled/released;
- refund.

Notification service должен иметь provider adapter и delivery log.

---

# 17. Тестирование

## Unit
- state machines;
- quote calculation;
- ledger entries;
- permissions;
- tenant resolution;
- reservation logic.

## Integration
- PostgreSQL via Testcontainers;
- Redis;
- object storage emulator;
- Stripe webhook fixtures;
- transaction rollback;
- outbox.

## E2E
1. Seller onboarding.
2. Product import and publication.
3. Buyer purchase.
4. Seller readiness.
5. Dispatcher assignment.
6. Driver pickup.
7. Driver delivery.
8. Payout release.
9. Incident blocks payout.
10. Cross-tenant isolation.
11. Reservation race.
12. Webhook duplicate.

## Security tests
- IDOR;
- tenant leakage;
- privilege escalation;
- upload abuse;
- webhook spoofing;
- CSRF;
- brute force;
- rate limit.

---

# 18. CI/CD

Pull request:
- format;
- lint;
- typecheck;
- unit;
- integration;
- build;
- migrations check;
- secret scan;
- dependency audit.

Branches:
- `main` production;
- short-lived feature branches;
- preview environment per PR where possible.

Deploy:
1. build immutable images;
2. run migrations as separate job;
3. deploy API/worker;
4. deploy web apps;
5. smoke tests;
6. rollback instructions.

Database:
- backward-compatible expand/migrate/contract;
- никогда не удалять колонку в том же deploy, где код перестал её использовать.

---

# 19. Roadmap разработки

Сроки ниже — относительные. Codex не должен считать календарные недели гарантией.

## Phase 0 — Discovery и фиксация решений

Результаты:
- final scope;
- user flows;
- information architecture;
- domain glossary;
- wireframes;
- payment legal review;
- shipping operating model;
- список ZIP/регионов пилота;
- ADR-001 modular monolith;
- ADR-002 tenancy;
- ADR-003 payment flow;
- ADR-004 logistics state machine;
- ADR-005 PWA offline model.

Exit criteria:
- нет противоречий между order/payment/shipment;
- известен владелец каждого operational step;
- утверждены MVP exclusions.

## Phase 1 — Foundation

- monorepo;
- Docker Compose;
- CI;
- config validation;
- PostgreSQL/Redis/S3 local;
- auth;
- organizations;
- RBAC;
- tenancy;
- audit;
- observability;
- API conventions;
- seed.

Exit:
- user can log in;
- seller/admin/driver roles;
- tenant isolation tests pass;
- preview deploy works.

## Phase 2 — Catalog + Storefront

- category model;
- products;
- media uploads;
- moderation;
- search/filter;
- marketplace public pages;
- seller storefront hostname resolution;
- Established Lines theme;
- Shopify CSV importer;
- redirects.

Exit:
- Established Lines catalog imported;
- seller edits one product and both channels update;
- Lighthouse/accessibility baseline;
- public SEO pages generated.

## Phase 3 — Cart + Checkout + Orders

- cart;
- reservations;
- addresses;
- purchase group;
- order state machine;
- Stripe Connect test mode;
- webhook inbox;
- ledger;
- order timeline;
- email notifications.

Exit:
- test buyer purchases one item;
- duplicate webhooks safe;
- two buyers cannot buy same item;
- seller sees order.

## Phase 4 — Logistics Operations

- shipping quote request;
- rule engine;
- shipment;
- route/stop;
- dispatcher UI;
- seller pickup readiness;
- assignment;
- operational timeline.

Exit:
- dispatcher can move paid order to scheduled route;
- all transitions audited;
- quote snapshot immutable.

## Phase 5 — Driver PWA

- installable PWA;
- route list;
- offline cache;
- QR;
- photos;
- signature;
- PIN;
- geolocation;
- sync queue;
- incidents;
- proof reports.

Exit:
- complete pickup and delivery with temporary loss of network;
- duplicate sync safe;
- incident blocks payout.

## Phase 6 — Payout, Refund, Support

- hold/release;
- payout UI;
- refund;
- cancellation;
- incident resolution;
- admin overrides;
- runbooks.

Exit:
- delivered order releases payout;
- incident prevents release;
- refund reconciles ledger.

## Phase 7 — Hardening и Pilot

- E2E suite;
- security review;
- performance;
- backup restore drill;
- accessibility;
- analytics;
- support docs;
- pilot data cleanup;
- production rollout.

Exit:
- production readiness checklist signed;
- pilot seller trained;
- first controlled orders completed.

---

# 20. Приоритеты P0/P1/P2

## P0 — без этого запуск невозможен
- tenant isolation;
- catalog;
- storefront;
- import;
- checkout;
- reservation;
- payments;
- order state machine;
- shipment;
- driver proof;
- admin operations;
- audit;
- incident blocks payout.

## P1 — желательно в pilot
- favorites;
- seller analytics;
- automatic simple quotes;
- custom domain automation;
- QR labels;
- offline driver flow;
- product inquiries.

## P2 — после pilot
- subscription billing;
- Make an Offer;
- advanced CRM;
- carrier portal;
- route optimization;
- automated tax;
- native apps;
- AI enrichment;
- multi-currency;
- reviews.

---

# 21. Definition of Done

Задача считается выполненной, только если:

- код соответствует архитектурным границам;
- есть migration;
- есть validation;
- есть authorization;
- есть unit/integration tests;
- есть error states;
- есть loading/empty states;
- есть audit event, если действие критическое;
- обновлена OpenAPI;
- обновлена документация;
- нет TypeScript errors;
- lint/test/build проходят;
- нет TODO без issue reference;
- нет mock в production path;
- нет секретов;
- есть acceptance evidence.

---

# 22. Правила реализации для Codex

1. Не строить микросервисы.
2. Не добавлять Kubernetes.
3. Не добавлять GraphQL.
4. Не добавлять Elasticsearch.
5. Не делать drag-and-drop site builder.
6. Не реализовывать тарифы до отдельной команды.
7. Не использовать float для денег.
8. Не обновлять статусы напрямую из контроллеров.
9. Не выполнять внешние side effects внутри DB transaction.
10. Не доверять tenant_id из body.
11. Не хранить Stripe как единственный источник бизнес-состояния.
12. Не называть payment hold escrow.
13. Не реализовывать функции вне текущего milestone.
14. Перед кодированием каждой фазы создать ADR/plan и список файлов.
15. Каждая фаза заканчивается тестами, документацией и runnable demo.

---

# 23. Первый production slice

Первый вертикальный slice должен быть минимальным, но end-to-end:

1. Admin создаёт seller Established Lines.
2. Seller импортирует 10 товаров CSV.
3. Admin публикует товар.
4. Товар виден:
   - на marketplace;
   - на storefront Established Lines.
5. Buyer оформляет test order.
6. Seller подтверждает readiness.
7. Dispatcher создаёт route.
8. Driver выполняет pickup и delivery.
9. Buyer подтверждает PIN.
10. Admin видит payout ready.
11. Audit log содержит всю цепочку.

Пока этот slice не работает, не расширять каталог, аналитику или дизайн-конструктор.

---

# 24. Критические открытые решения до production

Нужны ответы владельцев бизнеса:

- В каких штатах и ZIP запускается пилот?
- Кто является merchant of record?
- Кто несёт риск chargeback?
- Когда продавец получает payout?
- Какой hold period?
- Кто страхует товар?
- Кто отвечает за damage claim?
- Собственные водители или carrier partners?
- Какие service levels реально доступны?
- Какие правила cancellation до и после pickup?
- Какие товары запрещены?
- Есть ли minimum item price?
- Кто рассчитывает tax?
- Как обрабатывается возврат крупногабаритного товара?
- Нужна ли offer/negotiation в pilot?
- Может ли покупатель оплатить shipping позже отдельным платежом?

До ответов использовать feature flags и configuration, а не жёстко зашитые правила.

---

# 25. Референсная техническая документация

- Next.js multi-tenant guide: https://nextjs.org/docs/app/guides/multi-tenant
- Next.js App Router: https://nextjs.org/docs/app
- Stripe Connect marketplace: https://docs.stripe.com/connect/marketplace
- Stripe marketplace essential tasks: https://docs.stripe.com/connect/marketplace/essential-tasks
- MDN Progressive Web Apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Established Lines: https://www.establishedlines.com/
