# DecorFlavor — P0 заказ с внешним счётом

**Статус:** ACTIVE — owner-authorized 17 августа 2026 года  
**Design level:** 2  
**Заменяет для P0:** части `MVP_TECH_SPEC_RU.md` и `ORDER_STATE_MACHINE.md`, описывающие Stripe, payment intent, webhook, `PAID`, payout и payment failure. Эти документы остаются историческими планами и не являются authority для данного потока.

## Цель ближайшего вертикального среза

Покупатель резервирует один опубликованный товар и создаёт заказ. Продавец выставляет счёт **вне DecorFlavor**, затем вносит в систему только номер, сумму и срок счёта. Покупатель сообщает, что оплатил счёт. Администратор вручную подтверждает оплату, и продавец переводит заказ в готовность к исполнению.

## KNOWN

- Публичный каталог, продавцы, пользовательские сессии, tenant permission, audit log, outbox и `ProductStatus.RESERVED` уже существуют.
- Заказов, счетов, покупательского кабинета, API заказа и состояния оплаты в коде пока нет.
- Внешняя рабочая среда не используется для разработки или теста. Локальная БД будет отдельным этапом.

## OWNER DECISIONS

1. DecorFlavor не принимает карты, ACH, банковские реквизиты, payment links, escrow, payouts и не вызывает платёжные провайдеры.
2. Счёт выпускает сам продавец вне платформы.
3. Покупатель может только заявить, что перевод отправлен; это не подтверждение оплаты.
4. Только `platform:admin` подтверждает оплату и выпускает заказ к исполнению.
5. В P0 один заказ относится к одному уникальному товару и одному продавцу; товар резервируется до отмены либо исполнения.

## State machine

```text
PUBLISHED product
  -> AWAITING_SELLER_INVOICE
  -> INVOICE_SENT
  -> PAYMENT_VERIFICATION_PENDING
  -> PAYMENT_CONFIRMED
  -> READY_FOR_FULFILLMENT

Any pre-confirmation state -> CANCELLED -> product returns to PUBLISHED.
Admin may reject payment verification: PAYMENT_VERIFICATION_PENDING -> INVOICE_SENT.
```

`PAYMENT_CONFIRMED` значит только: администратор вручную зафиксировал внешнее подтверждение. Это не заявление о том, что DecorFlavor получил деньги.

## Авторизация

| Команда | Кто | Обязательное условие |
| --- | --- | --- |
| Создать заказ | Buyer | опубликованный доступный товар |
| Смотреть заказ | Buyer owner / seller tenant / platform admin | tenant boundary |
| Внести номер, сумму, срок счёта | Seller with `orders:write` | `AWAITING_SELLER_INVOICE` |
| Сообщить об оплате | Buyer owner | `INVOICE_SENT` |
| Подтвердить/отклонить сообщение | Platform admin with `orders:verify` | `PAYMENT_VERIFICATION_PENDING` |
| Подтвердить готовность к исполнению | Seller with `orders:write` | `PAYMENT_CONFIRMED` |
| Отменить | Buyer owner, seller tenant или platform admin | до `PAYMENT_CONFIRMED` |

## Данные и границы

`Order` хранит snapshot товара, покупателя, продавца, сумму товара, вручную внесённую стоимость доставки, итог и статус. `ManualInvoice` хранит только внешний номер счёта, сумму, срок, даты и audit-связанные отметки.

**Не храним:** карту, банковский счёт, чек/выписку, платёжную ссылку, invoice PDF, платёжный webhook или payout balance.

## Negative paths

1. Два покупателя одновременно резервируют товар: ровно один создаёт заказ; второй получает conflict.
2. Продавец не может подтвердить оплату собственного счёта.
3. Покупатель не может заявить об оплате до внесения счёта.
4. Admin не может подтвердить оплату вне `PAYMENT_VERIFICATION_PENDING`.
5. Отмена до подтверждения возвращает товар в публичный каталог; отмена после подтверждения отклоняется и требует будущего dispute/refund process.
6. Повторная или устаревшая команда с неверной версией заказа получает conflict и не создаёт повторный audit/outbox event.

## Scope

- Prisma schema + migration: Order, ManualInvoice, OrderEvent;
- API, authorization, optimistic version, audit/outbox;
- buyer: action from product, orders list/detail, payment-reported action;
- seller: orders queue/detail, external-invoice metadata, readiness;
- admin: verification queue/detail, approve/reject;
- unit and integration tests plus a local test-environment runbook.

## Out of scope

- реальная отправка счёта, e-mail/SMS, загрузка документов, налоги, refund, payout;
- cart с несколькими продавцами, promotion, partial payment, finance ledger;
- маршруты, водитель, фото/POD и delivery incident (следующий P0 срез после readiness);
- настоящие денежные действия или внешние API.

## Verification contract

1. Unit tests покрывают все допустимые и запрещённые переходы state machine.
2. API tests подтверждают owner/tenant/admin boundaries и reservation race.
3. Buyer, seller и admin экраны не показывают карточные данные и не совершают внешних запросов.
4. При создании/переходе создаются audit и outbox записи в той же транзакции.
5. Изолированная локальная БД подтверждает весь flow от товара до `READY_FOR_FULFILLMENT`.

