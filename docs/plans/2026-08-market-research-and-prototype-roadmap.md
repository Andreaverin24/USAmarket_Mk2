# DecorFlavor: исследование рынка, обязательный функционал и roadmap прототипа

**Дата:** 2026-08-12  
**Статус:** Discovery завершён; prototype scope готов к owner gate.  
**Цель:** определить минимально достаточный состав полноценного самодостаточного прототипа
американского marketplace премиальной винтажной мебели, а затем последовательно его построить.

**Официальное название:** `DecorFlavor`; это актуальное решение владельца и имеет приоритет над
историческим рабочим названием Atlas.

Этот документ заменяет ранний черновик, ошибочно ограничивший задачу существующим `demo/`.
Он не авторизует production, реальные платежи, сбор PII или внешние вызовы.

## 1. Что означает полноценный самодостаточный прототип

1. Запускается локально с fixtures и без API, БД или внешних сервисов.
2. Проводит пользователя через работающий сквозной сценарий, а не переключает макеты.
3. Согласованно хранит состояние товара, корзины, заказа, доставки, инцидента и audit timeline.
4. Даёт каждой роли только разрешённые команды; недопустимые действия нельзя выполнить.
5. Явно помечен как prototype: не принимает деньги, не создаёт обязательств и не собирает real PII.

Фокус первого сценария: США, профессиональные sellers, винтажная/дизайнерская мебель, декор и
коллекционные предметы. Аукционы, международная доставка и тарифы отложены.

## 2. Карта рынка: что действительно обязательно

| Игрок / источник | Наблюдаемый паттерн | Вывод для DecorFlavor |
| --- | --- | --- |
| [1stDibs: purchase](https://support.1stdibs.com/hc/en-us/articles/14516206865691-How-to-Purchase) и [shipping quote](https://support.1stdibs.com/hc/en-us/articles/14517075376539-Shipping-Quotes) | Checkout включает адрес, доставку, оплату и review; quote зависит от адреса, габаритов и сложности. | Нужны address-first quote, прозрачный total и статус `awaiting quote`; нельзя подменять это flat-rate. |
| [1stDibs: buyer protection](https://support.1stdibs.com/hc/en-us/articles/14552578793371-Money-Back-Guarantee-Policy) | Для повреждения, недоставки и not-as-described нужны срок обращения, фото и документы; исход — refund, repair или return. | Нужны condition evidence до продажи, incident intake, evidence и case timeline; incident блокирует payout path. |
| [Incollect listing](https://www.incollect.com/listings/furniture/lighting/scandinavian-modern-pendant-lamp-832935) | Product detail показывает seller, price/price-on-request, inquiry/offer, origin, period, materials, condition, dimensions и shipping context. | P0-карточка включает trust attributes; `Price on request` и inquiry — штатный путь. |
| [Christie’s buying guide](https://www.christies.com/en/help/buying-guide/overview/) и [payment & shipping](https://www.christies.com/help/buying-guide/payment-and-shipping) | Доверие строится на authentication, provenance, condition report, invoice, полной стоимости и bespoke shipping. | Нужны seller status, provenance/condition records, упорядоченные media и неизменяемый quote snapshot. |
| [Sotheby’s buyer guide](https://help.sothebys.com/en/support/solutions/articles/44002518078-guide-for-buyers-global) | Для дорогих лотов важны buyer identity, invoice, taxes, shipping/insurance и правильный владелец платежа. | KYC/tax/payment model — production gate; prototype показывает лишь mock boundary. |
| [Etsy Purchase Protection](https://help.etsy.com/hc/en-us/articles/7471925990807-Etsy-s-Purchase-Protection-Program) | Marketplace должен различать delay, non-delivery, damage и not-as-described и уметь вмешаться. | Нужны case state, seller SLA и разделение ordinary return от damage/dispute. |

**Вывод:** ценность — не «каталог с корзиной», а доказуемое доверие к уникальному предмету и
управляемая передача владения. Поэтому первый prototype обязан включать Buyer, Seller, Operations
и Driver, а не только публичную витрину.

## 3. Матрица обязательного функционала

### P0 — без этого нет законченного marketplace-сценария

| Домен | Минимальный capability | Проверка в prototype |
| --- | --- | --- |
| Каталожная правда | Один физический предмет/лот, canonical ID, seller, availability, цена или `price on request`, media, condition, provenance, dimensions, materials, period/style, location | Одинаковый item согласован в catalog/storefront/seller view; отсутствие факта явно показано. |
| Discovery | Catalog, search, filters: category/price/style/material/condition/location; product detail; seller storefront | Buyer находит fixture item через фильтр и открывает корректную карточку. |
| Доверие | Seller verification, condition report, provenance/document references, policies, availability | Карточка показывает, кто подтвердил факт и что требует запроса. |
| Unique inventory | `AVAILABLE`, `RESERVED`, `SOLD`, `UNAVAILABLE`; reserve/release/expiry | Две buyer sessions не подтверждают один item; cancel/failure освобождает его. |
| Сделка | Cart, address/access requirements, quote request/snapshot, total breakdown, checkout review, order confirmation | Order создаётся только из согласованного product/quote/version; stale quote отклонён. |
| Payment boundary | `AWAITING_PAYMENT`, `PAYMENT_PROCESSING`, `PAID`, `PAYMENT_FAILED`; payment event abstraction | Simulated success/failure не собирает карточные данные; статус не меняется напрямую. |
| Seller handoff | Seller order, availability/readiness и pickup window | Seller не подтверждает чужой order; без readiness dispatch запрещён. |
| Logistics | Shipment, stops, service level, quote, route/driver assignment, tracking timeline | Dispatcher создаёт route только для order с корректными prerequisites. |
| Proof & incident | Pickup/delivery checklist, photo/signature/PIN substitute, incident/evidence/resolver | Incident блокирует completion/eligible status; damage отделён от cancel. |
| States & audit | Command layer, transition guards, history, actor, timestamp, idempotency key | Normal и negative cases не допускают произвольный переход/дубль event. |
| Roles & UX | Guest/Buyer/Seller/Dispatcher/Driver/Admin; keyboard, responsive, error/empty/loading states | Cross-role actions отклоняются; buyer и driver flow проходят mobile/keyboard check. |

### P1 — важно для пилота, но после первого прототипа

- Favorites, alerts, buyer account, inquiries и `Make Offer`.
- Несколько sellers, custom domains, storefront editor, import/export и analytics.
- Automatic quote engine, QR, настоящая offline PWA queue, email/SMS и support inbox.
- Реальный DSR/privacy request UX, policy acceptance и standard-return workflow.

### P2 — после проверки ядра

- Live auctions, bidding, buyer’s premium и международная доставка.
- Subscriptions, rate cards, CRM, route optimisation, AI enrichment и reviews.

## 4. Внешние и операционные gates

| Область | Обязательство до реального запуска | Прототип |
| --- | --- | --- |
| Seller verification | [INFORM Consumers Act](https://www.ftc.gov/business-guidance/resources/INFORMAct): для high-volume third-party sellers нужны collection/verification/disclosure, suspension и suspicious-reporting. | Mock `pending/verified/suspended`, без документов, bank или tax data. |
| Delivery promise | [FTC Mail/Internet Order Rule](https://www.ftc.gov/legal-library/browse/rules/mail-internet-or-telephone-order-merchandise-rule): срок должен быть обоснован; при delay — consent или refund. | Delivery window, delay notice и cancel/refund branch. |
| Product safety | [CPSC](https://www.cpsc.gov/Business--Manufacturing/Business-Education/Business-Guidance/Retailers-Product-Safety-and-Your-Responsibilities): recalled/hazardous item нельзя продавать; существенный риск требует report. | `safety hold`, listing removal, incident/audit UI. |
| Privacy | [CCPA](https://oag.ca.gov/privacy/ccpa?bot_detected=1): для подпадающих компаний notices и процессы прав субъекта. | Только test data и privacy placeholder; real DSR — production/P1. |
| Payments | [Stripe Connect](https://docs.stripe.com/connect/marketplace/essential-tasks) требует определения money flow, refunds/disputes/payouts; [webhook](https://docs.stripe.com/webhooks?lang=node) требует signature verification raw body. | Deterministic mock payment; Stripe/ledger/webhook — отдельный Level 2 gate. |
| Taxes/reporting | Нормы marketplace facilitator различаются по штатам; [IRS 1099-K](https://www.irs.gov/businesses/understanding-your-form-1099-k) распространяется на marketplaces/payment apps. | `Tax to be calculated`; реальное решение — merchant/tax advisor gate. |
| Logistics | Применимость USDOT/MC зависит от carrier/broker model, geography и vehicle; см. [FMCSA](https://www.fmcsa.dot.gov/registration/do-i-need-usdot-number). | Различаются `platform-managed`/`partner carrier`; не заявляется лицензирование. |
| Security | [FTC guidance](https://www.ftc.gov/business-guidance/small-businesses/cybersecurity) требует базовых controls: MFA, least privilege, encryption, incident response. | Нет PII/secrets; security — production acceptance requirement. |

Это не юридическое заключение. До pilot нужен американский counsel и операционный владелец
платежей/доставки.

## 5. Сквозной сценарий prototype

1. Guest находит unique fixture item через catalog/filter.
2. Product detail показывает verification, condition, provenance, dimensions, availability и delivery context.
3. Buyer резервирует item; второй buyer видит reservation.
4. Buyer указывает delivery/access requirements; получает quote или `quote requested`.
5. Buyer подтверждает total и выполняет simulated payment.
6. Seller подтверждает readiness; Dispatcher назначает quote, pickup slot, route и driver.
7. Driver фиксирует pickup, затем delivery/PIN/evidence.
8. Buyer видит timeline и подтверждает receipt; Admin видит `payout eligible`, но не payout.

Negative cases: reserved/sold item; stale/declined quote; failed payment; seller unready; delay с
accept/cancel; incident hold; cross-role denial; idempotent command retry.

## 6. Дорожная карта и контроль прогресса

| № | Этап | Результат | Exit criteria | Статус |
| ---: | --- | --- | --- | --- |
| 0 | Discovery | Конкурентный анализ, P0/P1/P2, compliance gates и scope | Этот документ принят как направление; нет противоречия с current authority | **PASS** |
| 1 | Product authority | Glossary, roles/permissions, state-machine map, fixture contract, acceptance scenarios и mock boundaries | Независимый cold read верно пересказывает normal/negative paths | **NEXT** |
| 2 | Prototype foundation | Изолированный app shell, fixtures, local state, reset, role switcher, no-network rule | Запуск без API/DB/network; corrupt state recoverable; reset idempotent | PENDING |
| 3 | Buyer commerce | Catalog/detail/trust/cart/reservation/address/quote/checkout/simulated payment/timeline | E2E normal + reserved + quote-expired + payment-failed PASS | PENDING |
| 4 | Seller & operations | Readiness, quote, route, assignment, audit timeline | Route недоступен без seller/payment/order prerequisites | PENDING |
| 5 | Driver & incidents | Mobile route, proof substitutes, PIN и incident | Driver видит только свой route; incident блокирует completion | PENDING |
| 6 | Quality & handoff | E2E, keyboard/mobile/accessibility, demo report, walkthrough | Все checks PASS; no-network/API evidence; owner walkthrough | PENDING |
| 7 | Production design gate | Level 2 authority, ADR и legal/operations decisions | Explicit owner approval после merchant/tax/insurance/logistics/security decisions | NOT AUTHORIZED |

Каждый этап получает report с шестью полями: `Status`, `Changed`, `Verification`, `Evidence`,
`Remaining risks`, `One next step`. Прогресс считается только по evidence, не по заявлению.

## 7. Ближайший шаг: этап 1 — Product authority

До кода создать один краткий канонический документ с:

- glossary: `Product`, `Listing`, `Reservation`, `Quote`, `Order`, `Shipment`, `Stop`, `Incident`,
  `Proof`, `Eligible`;
- таблицей ролей и разрешений;
- state-machine map: команда, actor, guard, state change, audit event, idempotency;
- fixture contract: один seller, один unique product, два buyers, dispatcher и driver;
- acceptance scenarios и явно указанными mock boundaries.

## 8. Решения, нужные только перед production

1. Pilot geography/ZIP и реальные service levels.
2. Merchant of record, chargeback/refund owner и Stripe Connect flow.
3. Payout trigger/hold, insurance, damage claim, return/cancellation policy.
4. Tax collection/remittance/reporting owner and provider.
5. Own fleet vs carrier/broker model, FMCSA/insurance obligations.
6. Privacy retention, KYC provider и DSR/support owner.

Они не блокируют self-contained prototype, но блокируют production.
