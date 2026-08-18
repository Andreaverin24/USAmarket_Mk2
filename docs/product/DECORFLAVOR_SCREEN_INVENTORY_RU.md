# DecorFlavor: полный список экранов

**Статус:** исходная карта экранов для self-contained prototype.  
**Дата:** 2026-08-12.  
**Официальное название:** `DecorFlavor` — это решение владельца и имеет приоритет над прежним
рабочим названием Atlas в старых документах.

## Правило чтения карты

- Каждый пункт — отдельный URL/экран или независимый полноэкранный шаг сценария.
- `P0` строится в полноценном prototype; `P1` добавляется после проверки основного потока;
  `P2` не входит в prototype первой версии.
- Empty/loading/error/permission-denied — обязательные состояния соответствующего экрана, но не
  самостоятельные URL, если это не указано отдельно.

## A. Публичная витрина и доверие

| № | Экран | Предлагаемый route | Приоритет |
| ---: | --- | --- | --- |
| 01 | Главная / curated marketplace | `/` | P0 |
| 02 | Каталог / результаты поиска | `/catalog` | P0 |
| 03 | Категория | `/categories/:slug` | P0 |
| 04 | Результаты поиска | `/search?q=` | P0 |
| 05 | Коллекция / editorial selection | `/collections/:slug` | P1 |
| 06 | Карточка товара | `/products/:slug` | P0 |
| 07 | Увеличенная галерея медиа товара | `/products/:slug/gallery` или modal | P0 |
| 08 | Condition report и provenance | `/products/:slug/condition` | P0 |
| 09 | Доставка, возврат и protection для товара | `/products/:slug/shipping-and-returns` | P0 |
| 10 | Storefront продавца | `/sellers/:sellerSlug` | P0 |
| 11 | Каталог продавца | `/sellers/:sellerSlug/products` | P0 |
| 12 | About / showroom / contact продавца | `/sellers/:sellerSlug/about` | P0 |
| 13 | Политика доставки DecorFlavor | `/policies/shipping` | P0 |
| 14 | Политика возвратов и разрешения проблем | `/policies/returns-and-protection` | P0 |
| 15 | Политика condition/provenance | `/policies/listing-standards` | P0 |
| 16 | Privacy notice | `/privacy` | P0 |
| 17 | Terms of use / marketplace terms | `/terms` | P0 |
| 18 | Help / contact support | `/help` | P0 |
| 19 | Product unavailable / 404 | `/not-found` | P0 |

## B. Доступ и профиль покупателя

| № | Экран | Предлагаемый route | Приоритет |
| ---: | --- | --- | --- |
| 20 | Sign in | `/login` | P0 |
| 21 | Create account | `/register` | P0 |
| 22 | Password reset | `/password-reset` | P1 |
| 23 | Buyer account overview | `/account` | P0 |
| 24 | Profile и communication preferences | `/account/profile` | P1 |
| 25 | Address book | `/account/addresses` | P0 |
| 26 | Favorites / saved items | `/account/favorites` | P1 |
| 27 | Notifications | `/account/notifications` | P1 |
| 28 | Buyer order history | `/account/orders` | P0 |
| 29 | Buyer order detail / tracking timeline | `/account/orders/:orderId` | P0 |
| 30 | Report a delivery or listing problem | `/account/orders/:orderId/report-issue` | P0 |
| 31 | Inquiry / make offer | `/products/:slug/inquiry` | P1 |

## C. Покупка и заказ

| № | Экран | Предлагаемый route | Приоритет |
| ---: | --- | --- | --- |
| 32 | Cart | `/cart` | P0 |
| 33 | Delivery address и access requirements | `/checkout/delivery` | P0 |
| 34 | Shipping quote requested | `/checkout/quote-pending` | P0 |
| 35 | Shipping quote review / accept | `/checkout/shipping-quote` | P0 |
| 36 | Checkout review и payment method | `/checkout/payment` | P0 |
| 37 | Payment processing | `/checkout/processing` | P0 |
| 38 | Payment failed / retry | `/checkout/payment-failed` | P0 |
| 39 | Order confirmation | `/checkout/confirmation/:orderId` | P0 |
| 40 | Buyer delivery confirmation / acceptance | `/account/orders/:orderId/confirm-receipt` | P0 |
| 41 | Cancellation / changed delivery details | `/account/orders/:orderId/change-or-cancel` | P1 |

## D. Seller Commerce OS

| № | Экран | Предлагаемый route | Приоритет |
| ---: | --- | --- | --- |
| 42 | Start selling / seller onboarding | `/seller/onboarding` | P0 |
| 43 | Business profile | `/seller/onboarding/business` | P0 |
| 44 | Verification status / request changes | `/seller/onboarding/verification` | P0 |
| 45 | Seller dashboard | `/seller` | P0 |
| 46 | Seller product inventory | `/seller/products` | P0 |
| 47 | Create/edit product | `/seller/products/:productId` | P0 |
| 48 | Media, condition and provenance editor | `/seller/products/:productId/media-and-condition` | P0 |
| 49 | Product moderation history | `/seller/products/:productId/moderation` | P0 |
| 50 | Bulk import upload | `/seller/import` | P1 |
| 51 | Import validation preview | `/seller/import/:jobId/preview` | P1 |
| 52 | Import results and errors | `/seller/import/:jobId/results` | P1 |
| 53 | Seller orders | `/seller/orders` | P0 |
| 54 | Seller order detail / pickup readiness | `/seller/orders/:orderId` | P0 |
| 55 | Storefront branding/settings | `/seller/storefront` | P1 |
| 56 | Customers and inquiries | `/seller/customers` | P1 |
| 57 | Seller analytics | `/seller/analytics` | P1 |

## E. Operations и Admin

| № | Экран | Предлагаемый route | Приоритет |
| ---: | --- | --- | --- |
| 58 | Operations command center | `/ops` | P0 |
| 59 | Seller application queue | `/ops/seller-applications` | P0 |
| 60 | Seller application review | `/ops/seller-applications/:applicationId` | P0 |
| 61 | Product moderation queue | `/ops/product-moderation` | P0 |
| 62 | Product moderation review | `/ops/product-moderation/:reviewId` | P0 |
| 63 | Orders queue | `/ops/orders` | P0 |
| 64 | Operations order detail | `/ops/orders/:orderId` | P0 |
| 65 | Shipping quote queue | `/ops/shipping-quotes` | P0 |
| 66 | Quote builder / approval | `/ops/shipping-quotes/:quoteId` | P0 |
| 67 | Routes board | `/ops/routes` | P0 |
| 68 | Route planning and assignment | `/ops/routes/:routeId` | P0 |
| 69 | Driver assignment / availability | `/ops/drivers` | P1 |
| 70 | Incidents queue | `/ops/incidents` | P0 |
| 71 | Incident review and resolution | `/ops/incidents/:incidentId` | P0 |
| 72 | Mock ledger / payout eligibility | `/ops/payouts` | P0 |
| 73 | Audit log | `/ops/audit-log` | P0 |
| 74 | Safety hold / recalled listing queue | `/ops/safety-holds` | P1 |

## F. Driver PWA

| № | Экран | Предлагаемый route | Приоритет |
| ---: | --- | --- | --- |
| 75 | Driver sign in | `/driver/login` | P0 |
| 76 | Assigned routes | `/driver/routes` | P0 |
| 77 | Route detail / stops | `/driver/routes/:routeId` | P0 |
| 78 | Pickup stop checklist and proof | `/driver/stops/:stopId/pickup` | P0 |
| 79 | In-transit stop status | `/driver/stops/:stopId/in-transit` | P0 |
| 80 | Delivery stop, PIN and proof | `/driver/stops/:stopId/delivery` | P0 |
| 81 | Create incident | `/driver/stops/:stopId/incident` | P0 |
| 82 | Offline sync queue and conflict resolution | `/driver/sync` | P1 |

## G. Экранные состояния, обязательные на P0

1. Пустой каталог, нет результатов поиска и снятый с продажи товар.
2. Товар `Reserved` и товар `Sold`/`Unavailable`.
3. Quote pending, quote expired, quote rejected и quote accepted.
4. Payment processing и payment failed — без карточных данных в prototype.
5. Seller readiness pending, pickup scheduled, in transit, delivered и acceptance period.
6. Delivery delay: покупатель принимает новую дату либо отменяет до pickup.
7. Incident hold: payout eligibility/completion заблокированы до решения operations.
8. Unauthorized role action, 404 tenant boundary и recoverable validation error.
9. Loading/empty/error при каждом сетевом production action; в self-contained prototype —
   deterministic local equivalents.

## Итог

- Всего: **82 самостоятельных экрана**.
- P0: **66** экранов/шагов, необходимых для сквозного marketplace prototype.
- P1: **16** экранов, расширяющих pilot после проверки P0.
- P2 не включены: live auction, international shipping/customs, subscription billing, advanced CRM,
  route optimisation, native apps и AI enrichment.

Начинаем разработку не со всех 82 экранов, а с P0 вертикальными срезами roadmap: foundation →
buyer commerce → seller/operations → driver/incidents → quality acceptance.
