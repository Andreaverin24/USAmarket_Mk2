# Roadmap: самодостаточный прототип Atlas

**Дата:** 2026-08-12  
**Статус:** исследование завершено, первый vertical slice запланирован.  
**Уровень проектирования:** 1 — изолированный, обратимый офлайн-прототип. Реальные платежи,
персональные данные, внешние вызовы и production не входят в этот документ; для них потребуется
отдельный шлюз проектирования уровня 2.

## 1. Цель

Превратить существующий каталог визуальных экранов в полноценный локальный прототип, который
демонстрирует один сквозной сценарий premium furniture marketplace:

`каталог → уникальный товар → корзина → доставка → имитация оплаты → заказ → готовность продавца → маршрут → pickup → delivery → подтверждение`.

Прототип должен запускаться как статический сайт, не требовать API, базы данных, Stripe,
геолокации, аккаунтов или сети. Он нужен для проверки пользовательского и операционного потока,
а не для обработки настоящих заказов.

## 2. Current context

### KNOWN

- Репозиторий уже содержит modular monolith: `apps/api`, `apps/web`, `apps/portal`, `apps/worker`,
  `apps/driver` и Prisma/PostgreSQL. Каталог, витрины, tenancy, аудит, outbox, onboarding продавца
  и product moderation уже описаны и частично реализованы.
- Действующая authority для текущих незавершённых изменений —
  `docs/architecture/universal-product-ingestion.md`; она ограничена ingestion и не разрешает
  заказы, платежи или производство.
- Целевая order state machine уже принята в `docs/ORDER_STATE_MACHINE.md`, но таблицы и команды
  заказов пока не реализованы.
- В `demo/` есть 40 локальных HTML-страниц. Проверка `node demo/tests/check-demo.mjs` проходит,
  но интерфейс имеет только демонстрационные уведомления и часть экранов — placeholders.

### CONFLICT

- Документ MVP называет Cart/Checkout/Orders «Phase 3», тогда как уже реализованный plan с тем же
  номером использует его для onboarding/moderation, а target order state machine сдвигает этот
  поток на Phase 5–7. Новый roadmap не меняет эти нумерации: он использует независимые
  `Prototype Slice` и не является production roadmap.
- Текущий demo использует Tailwind CDN, Google Fonts и часть внешних placeholder-изображений.
  Поэтому он не является самодостаточным/offline-first прототипом в смысле этой задачи.

### UNKNOWN / DEFERRED

- Штаты и ZIP пилота, merchant of record, tax owner, chargeback owner, страховка, payout hold,
  cancellation/return policy и настоящие service levels.
- Stripe Connect configuration, налоговый провайдер, carrier/driver partner, email provider и
  production hosting.

Эти вопросы не блокируют безопасный прототип, но блокируют настоящий checkout и запуск в США.

## 3. Базовые элементы, обязательные для прототипа

| Область | Что должно быть в прототипе | Почему это P0 |
| --- | --- | --- |
| Каталожная карточка | Фото, название, цена/валюта, продавец, состояние, размеры, наличие, delivery context | Покупатель дорогостоящего уникального предмета должен видеть предмет, его состояние и выполнимость доставки до добавления в корзину. |
| Уникальность товара | Один товар можно положить в корзину/зарезервировать один раз; второй покупатель видит `Reserved`/`Unavailable` | Уникальные collectible objects нельзя моделировать как массовый inventory. |
| Checkout | Адрес, access requirements, shipping quote, прозрачный итог и подтверждение заказа | Доставка крупной мебели — часть покупки, а не послепродажное примечание. |
| Order timeline | Текущий статус, следующий владелец шага, история событий, отмена/инцидент | Позволяет проверить, что покупатель, seller и operations одинаково понимают состояние заказа. |
| Seller flow | Order ready/not ready, предмет и окно pickup | Подтверждает handoff от продажи к логистике. |
| Operations flow | Quote, назначение маршрута/водителя, timeline, incident block | Демонстрирует диспетчерский контур без выдачи ложного статуса payout. |
| Driver flow | Мобильный маршрут, чек-лист pickup/delivery, фото-плейсхолдер, PIN и incident | Показывает доказуемую цепочку передачи предмета; реальные GPS/камера не требуются. |
| Доверие и disclosure | Видимые `Prototype — no real payment`, sample policies, приватность тестовых данных | Не позволяет принять симуляцию за работающий коммерческий сервис. |
| Качество интерфейса | Клавиатурная навигация, видимый focus, семантические формы, alt-тексты, адаптивность | WCAG 2.2 Level AA — реалистичная техническая планка для публичной витрины. |

## 4. Результаты внешнего исследования

| Источник | Вывод для продукта | Реакция в roadmap |
| --- | --- | --- |
| [FTC Mail, Internet, or Telephone Order Merchandise Rule](https://www.ftc.gov/legal-library/browse/rules/mail-internet-or-telephone-order-merchandise-rule) | Обещанный срок отправки должен быть обоснован; без срока действует правило 30 дней. При задержке нужны уведомление, согласие на задержку или refund. | Прототип показывает окно доставки, состояние задержки и явный вариант cancel/refund; production policy требует юридического решения. |
| [Stripe Connect marketplace essentials](https://docs.stripe.com/connect/marketplace/essential-tasks) | Marketplace обязан определить onboarding connected accounts, money flow, refunds/disputes и payout rules. | Никаких карточных полей или Stripe-запросов в prototype. Реальный payment slice будет отдельным Level 2 gate. |
| [Stripe webhook security](https://docs.stripe.com/webhooks?lang=node) | Настоящий webhook требует проверки подписи по raw payload и endpoint secret. | В прототипе есть только локальное имитированное событие оплаты; production webhook inbox и idempotency остаются обязательными. |
| [California DOJ: CCPA](https://oag.ca.gov/privacy/ccpa?bot_detected=1) | Для подпадающих под CCPA бизнесов нужны notice at collection, privacy policy и процессы прав субъекта данных. | Прототип не собирает реальный PII; production roadmap обязан иметь privacy notice, DSR workflow и решение о применимости по штатам/обороту. |
| [Streamlined Sales Tax marketplace guidance](https://www.streamlinedsalestax.org/for-businesses/marketplace-sellers) | Обязанности marketplace facilitator и продавца различаются по штатам и могут зависеть от nexus/порогов. | Tax не вычисляется и не заявляется как точный в prototype. До запуска нужен выбор tax owner и штатов пилота. |
| [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) | Маркетинговые письма требуют корректных отправителя/темы/адреса и unsubscribe; transactional письма нужно отделять от marketing. | В prototype уведомления локальны. Production разделяет transactional и marketing preferences. |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Conformance проверяется для полной страницы; Level AA включает A и AA criteria. | Для всех изменённых prototype-страниц — keyboard path, labels, contrast, focus и responsive проверка. |

## 5. Scope и жёсткие границы

### Входит

- Изолированное развитие `demo/` без изменения production приложений, Prisma, API или текущей
  ingestion authority.
- Детерминированные fixture-данные Established Lines и два покупательских состояния для проверки
  резервирования.
- Browser state в localStorage, reset-demo control и явный `PROTOTYPE` banner.
- Один сквозной сценарий для Buyer, Seller, Dispatcher и Driver плюс `cancel` и `incident`.
- Локальные assets/styles/scripts: работа при отключённой сети.
- Автоматизированный локальный smoke/E2E и ручной accessibility checklist.

### Не входит

- Реальная аутентификация, персональные данные, карточные данные, Stripe, email/SMS, maps, GPS,
  камера, S3, база данных или сетевой API.
- Реальные tax, shipping, payout, refund или юридические обещания.
- Изменение production order/payment/shipment state machine или её persistence.
- Публикация демо, миграции, доступ к внешним сайтам или облачным средам.

## 6. Канонические состояния для prototype

Прототип визуализирует уже принятую целевую терминологию, но хранит её только в браузере:

`AVAILABLE → RESERVED → AWAITING_SHIPPING_QUOTE → QUOTE_READY → AWAITING_PAYMENT → PAYMENT_PROCESSING → PAID (simulated) → SELLER_CONFIRMATION_REQUIRED → CONFIRMED → PICKUP_SCHEDULING → PICKUP_SCHEDULED → PICKED_UP → IN_TRANSIT → DELIVERED → ACCEPTANCE_PERIOD → COMPLETED`.

Ветви: `CANCELLED`, `PAYMENT_FAILED`, `DELIVERY_EXCEPTION`. `DELIVERY_EXCEPTION` всегда блокирует
переход к `COMPLETED` и отображает переданный operations owner. Никакой из статусов не означает
реального платёжного hold, escrow или payout.

## 7. Roadmap по вертикальным срезам

| Срез | Результат | Граница и доказательство | Статус |
| --- | --- | --- | --- |
| 0. Исследование и baseline | Зафиксированы обязательные элементы, legal/product gates и состояние demo | Этот roadmap; `node demo/tests/check-demo.mjs` PASS | Завершён |
| 1. Offline core | Demo грузится без CDN; fixtures, state store, reset и prototype disclosure доступны на каждой изменённой странице | Отключённая сеть не ломает страницы; reset возвращает fixture state | Следующий |
| 2. Buyer purchase | Покупатель проходит товар → cart → delivery quote → simulated payment → confirmation; повторный reserve безопасно виден | Playwright проходит normal, unavailable и cancel path | Ожидает Slice 1 |
| 3. Seller and operations | Seller подтверждает readiness; dispatcher задаёт quote, назначает driver и переводит заказ в маршрут | Порядок действий и audit timeline проверяются автоматизированно | Ожидает Slice 2 |
| 4. Driver and exception | Водитель выполняет pickup/delivery, PIN; incident блокирует завершение до operations resolution | Mobile viewport test проходит normal и incident path | Ожидает Slice 3 |
| 5. Quality handoff | Полный E2E, local asset check, keyboard/manual WCAG check, demo report и список ограничений | Воспроизводимые команды и evidence, без network/API calls | Ожидает Slice 4 |
| 6. Production design gate | Отдельная authority для настоящего cart/orders/payments/logistics | Owner decisions, ADR, data/state model, security and legal review | Не авторизован |

## 8. Ближайший разрешённый vertical slice

**Slice 1 — Offline core.**

1. Инвентаризировать все CDN/внешние ресурсы `demo/` и заменить их локальными стилями, шрифтами
   или системными fallback, не ухудшая существующую навигацию.
2. Ввести единственный локальный fixture/state contract: товар, корзина, quote, order, audit events
   и selected role.
3. Добавить заметный `PROTOTYPE — no real payment or delivery` disclosure и reset-control.
4. Не реализовывать checkout, не менять production-код и не выполнять внешние requests в этом срезе.

**Негативные сценарии:** corrupted localStorage не ломает demo; повторный reset идемпотентен;
отсутствующий fixture даёт понятный empty state; запрещённый статус не меняется произвольной
кнопкой.

**Контракт проверки:** все HTML/локальные assets разрешаются, запуск локального server не требует
network, normal reset и corrupted-state fallback проходят тестом, а старый buyer-navigation path не
регрессирует.

## 9. Assumptions

- **A-P01:** интерфейс demo остаётся английским, так как рынок и существующие Stitch-экраны
  англоязычные; документация остаётся русской. Изменение обратимо.
- **A-P02:** Established Lines остаётся единственным fixture seller, а данные имеют статус sample.
  Добавление нескольких продавцов — после сценария одного уникального товара.
- **A-P03:** simulated payment используется только для перехода состояния и никогда не собирает
  номер карты, адрес или настоящие контакты.
- **A-P04:** `demo/` — единственное место prototype-кода. Это исключает столкновение с незавершённым
  production ingestion worktree.

## 10. Блокирующие owner decisions до production

1. География пилота и фактические уровни сервиса доставки.
2. Merchant of record, ownership chargeback/refund и точная модель Stripe Connect.
3. Payout trigger, hold period, insurance и damage-claim owner.
4. Tax owner/calculation provider и state-by-state compliance approach.
5. Cancellation, returns и delay policy; запрещённые товары и minimum price.
6. Privacy/retention, email provider и data-subject-request owner.

Без этих решений нельзя переносить prototype-контур в `apps/api`, `apps/web`, `apps/portal` или
`apps/driver` и нельзя принимать реальные деньги.

