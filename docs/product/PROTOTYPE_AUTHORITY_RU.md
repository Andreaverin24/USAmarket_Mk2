# Prototype Authority: DecorFlavor end-to-end marketplace

## 0. Паспорт

- **Проект:** DecorFlavor — premium furniture marketplace.
- **Функция:** самодостаточный локальный E2E prototype.
- **Версия:** 0.1.
- **Статус:** ready for implementation of Slice 2 (prototype foundation).
- **Дата:** 2026-08-12.
- **Owner intent:** пользователь запросил исследование обязательных элементов, roadmap и
  полноценный работающий prototype.
- **Уровень проектирования:** 1. Prototype изолирован от production и не затрагивает реальные
  деньги, external calls, PII, migration, permissions production-системы или текущую ingestion
  authority.

## 1. Бизнес-результат

За один локальный walkthrough владелец видит, как уникальный предмет проходит путь от discovery
до подтверждённой доставки: доверие к товару, reservation, quote, mock payment, seller readiness,
dispatch, proof of pickup/delivery и incident hold. Результат должен объяснять, где в будущем
появится настоящий payment/ledger/logistics, но не имитировать их как production.

## 2. Подтверждённый контекст

### KNOWN

- Product, seller storefront, multi-tenancy, moderation и audit/outbox существуют как production
  направление; order/payment/shipment persistence пока не реализованы.
- `docs/ORDER_STATE_MACHINE.md` — утверждённая терминология целевых order states.
- MVP задаёт роли Buyer, Seller, Dispatcher, Driver и Admin и их основную последовательность.
- Product research и P0/P1/P2 находятся в
  `docs/plans/2026-08-market-research-and-prototype-roadmap.md`.

### CONFLICT

- Нумерация старых Phase 3–7 расходится между историческими планами. Prototype использует
  нумерацию `Slice`, не меняя production roadmap.

### DEFERRED

- Merchant of record, payout/hold/refund, tax, insurance, carrier/FMSCA model, KYC, real privacy
  workflow и service geography. Они не нужны для mock prototype, но блокируют production.

## 3. Scope

### Входит

- Новый изолированный статический application в `/prototype`, работающий с local fixtures и
  browser storage без network/API/DB.
- Один seller, один physical `Product`, два simulated buyers, dispatcher, driver и admin.
- Catalog/discovery, product trust panel, reservation, cart, delivery quote, checkout review,
  deterministic simulated payment, order timeline, seller readiness, dispatch, driver proof and
  incident.
- Role switcher только для walkthrough, reset scenario и local audit timeline.
- Normal и negative paths из раздела 9.

### Не входит

- Реальные account/session, payment, tax, payout, email/SMS, file upload, camera/GPS, map,
  Stripe, carrier, database, cloud или external HTTP requests.
- Аукцион, offer/negotiation, subscription, multiple sellers, international shipping, реальный
  возврат или dispute resolution.
- Изменение `apps/*`, Prisma, API, production authorization или worktree текущего ingestion.

## 4. Канонические термины

| Термин | Определение |
| --- | --- |
| `Product` | Одна уникальная физическая вещь или продаваемый set, доступный максимум в одном экземпляре. |
| `Listing` | Коммерческое представление Product от verified seller; содержит цену/price-on-request и policies. |
| `Reservation` | Временная привязка AVAILABLE Product к одному buyer/cart до завершения или release. |
| `Quote` | Адресный снимок услуги доставки: service, цена, срок действия, access requirements и version. |
| `Order` | Покупательское обязательство, создаваемое из Product/Reservation/accepted Quote. |
| `Shipment` | Операционный контейнер перемещения по order. |
| `Stop` | Один pickup или delivery шаг Shipment, назначенный конкретному driver. |
| `Proof` | Prototype evidence: checklist result, generated photo marker, PIN/signature substitute и timestamp. |
| `Incident` | Повреждение/исключение, требующее operations review и блокирующее final completion. |
| `Eligible` | Внутренний indicator после успешной цепочки; не payout и не денежное действие. |

## 5. Принятые решения и assumptions

- **DEC-P01:** `/prototype` — отдельный local-first artifact, чтобы не смешивать walkthrough с
  production app или старым static demo.
- **DEC-P02:** Все данные — deterministic fixtures. Контакты, платежи и proof синтетические.
- **DEC-P03:** Первый vertical scenario покрывает все роли для одного Product вместо широкого
  каталога или нескольких feature silos.
- **DEC-P04:** Payment является локальной командой, генерирующей `PAID` или `PAYMENT_FAILED`;
  никакие card inputs и Stripe-like claims запрещены.
- **A-P01:** Основной UI English; документация и reports Russian. Изменение обратимо.
- **A-P02:** Price-on-request существует в data model и UI, но checkout path использует fixture с
  фиксированной USD price.

## 6. Неприкосновенные ограничения

1. На любой странице присутствует `PROTOTYPE — no real payment, delivery or personal data`.
2. Запрещены network requests, external font/CDN/image dependencies и secrets.
3. Нельзя назвать состояние `escrow`, `insured`, `authenticated`, `paid out` или гарантированной
   доставкой.
4. Критические действия меняют state только через command functions и добавляют audit event.
5. `Incident` запрещает переход к `COMPLETED` и `ELIGIBLE` до явной Admin resolution.
6. Role switcher не является authentication и это явно видно.

## 7. Fixture contract

| Entity | Fixture |
| --- | --- |
| Seller | `Established Lines`, статус `VERIFIED`, domestic white-glove availability. |
| Product | `EL-CH-001`, один винтажный chair, USD fixed price, condition report, provenance note, dimensions/material/period, 0/1 availability. |
| Buyers | `buyer-alex` и `buyer-jordan`; второй используется для conflict reservation case. |
| Dispatcher | `dispatcher-sam`, назначает quote/route/driver. |
| Driver | `driver-lee`, видит только route `route-001`. |
| Admin | `admin-riley`, разрешает incident только как mock operation. |
| Quote | `quote-001`, address-specific, expiry и white-glove service. |

## 8. Роли и разрешения prototype

| Команда | Buyer | Seller | Dispatcher | Driver | Admin |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reserve/release Product | Yes | No | No | No | No |
| Submit address / accept Quote / simulate payment | Yes | No | No | No | No |
| Confirm readiness | No | Yes | No | No | No |
| Create route / assign driver | No | No | Yes | No | No |
| Complete assigned pickup/delivery / create incident | No | No | No | Yes | No |
| Confirm receipt / report issue | Yes | No | No | No | No |
| Resolve incident / see eligible state | No | No | No | No | Yes |
| View audit timeline | Own order | Own order | Operational order | Assigned route only | All |

Любая другая комбинация возвращает visible `Not permitted in this role` и не изменяет fixture state.

## 9. State map и команды

| Command | Actor | Guard | Переход |
| --- | --- | --- | --- |
| `reserveProduct` | Buyer | Product AVAILABLE, нет живой чужой reservation | `AVAILABLE → RESERVED` |
| `releaseReservation` | Buyer/system | Owner reservation или expiry | `RESERVED → AVAILABLE` |
| `requestQuote` | Buyer | Active reservation, валидный fixture address | `DRAFT → AWAITING_SHIPPING_QUOTE` |
| `issueQuote` | Dispatcher | Address/access requirements exist | `AWAITING_SHIPPING_QUOTE → QUOTE_READY` |
| `acceptQuote` | Buyer | Quote current and unexpired | `QUOTE_READY → AWAITING_PAYMENT` |
| `simulatePayment` | Buyer | Accepted Quote + active reservation | `AWAITING_PAYMENT → PAYMENT_PROCESSING → PAID|PAYMENT_FAILED` |
| `confirmReadiness` | Seller | Order PAID | `PAID → SELLER_CONFIRMATION_REQUIRED → CONFIRMED` |
| `schedulePickup` | Dispatcher | Order CONFIRMED | `CONFIRMED → PICKUP_SCHEDULED` |
| `completePickup` | Assigned Driver | Pickup stop, checklist complete | `PICKUP_SCHEDULED → PICKED_UP → IN_TRANSIT` |
| `completeDelivery` | Assigned Driver | Delivery stop, PIN/proof complete, no incident | `IN_TRANSIT → DELIVERED → ACCEPTANCE_PERIOD` |
| `confirmReceipt` | Buyer | Own DELIVERED order, no incident | `ACCEPTANCE_PERIOD → COMPLETED → ELIGIBLE` |
| `createIncident` | Buyer/Driver | Related active order/stop | `* → DELIVERY_EXCEPTION`; eligible completion blocked |
| `resolveIncident` | Admin | Open incident and mock resolution | `DELIVERY_EXCEPTION → ACCEPTANCE_PERIOD|REFUND_PENDING` |
| `cancelOrder` | Buyer/Admin | Before pickup; policy branch displayed | `* → CANCELLED`, reservation released when applicable |

`PAYMENT_FAILED`, `CANCELLED`, `DELIVERY_EXCEPTION`, `REFUND_PENDING` и `ELIGIBLE` — terminal or
resolution-gated screens for this prototype. A command with the same idempotency key must reuse its
previous result and must not append a second audit event.

## 10. Acceptance contract

1. Normal path: discovery → reserve → quote → mock paid → ready → scheduled → pickup → delivery →
   receipt → eligible.
2. Second buyer cannot reserve the active item; cancel/payment failure releases it.
3. Quote expiry prevents payment until a new quote is issued.
4. Seller cannot route, driver cannot see finance, dispatcher cannot simulate payment, buyer cannot
   resolve incident.
5. Driver can complete only assigned stop and must supply fixture checklist/PIN/proof.
6. Incident blocks eligible state until Admin resolution.
7. Every accepted command gives one ordered audit event; retries are idempotent.
8. Site works offline with browser cache/storage only; a corrupt saved state falls back to fixtures.
9. Keyboard path, visible focus, semantic labels and mobile driver viewport pass manual review.

## 11. Verification evidence

- Deterministic unit tests for commands, guards and idempotency.
- Browser E2E: normal path plus all scenarios in section 10.
- Asset/network check: no external URL requested; all local references resolve.
- Screenshots/video or scripted walkthrough for every role.
- Report with exact commands, results, known limitations and next slice.

## 12. Следующий разрешённый vertical slice

**Prototype foundation:** создать isolated shell, local fixture repository, command/state store,
audit event store, role switcher, reset/recovery и no-network test. Buyer checkout, route UI и
driver UI ещё не реализуются в этом slice.
