# DecorFlavor P0: локальная проверка ручного счёта

Этот прогон использует только локальный PostgreSQL в Docker. Он не читает корневой `.env`, не подключается к Supabase и не выполняет платёжных, e-mail или иных внешних вызовов.

## Что проверяется

`PUBLISHED товар -> резерв -> внешний счёт -> сообщение покупателя -> подтверждение platform admin -> готовность к исполнению`.

Тест также проверяет конфликт двойного резерва, запрет продавцу подтверждать оплату, запрет отмены после подтверждения, а также `OrderEvent`, audit и outbox.

## Запуск

1. Запустить Docker Desktop.
2. В корне репозитория выполнить:

```powershell
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
$env:TEST_DATABASE_URL = 'postgresql://atlas:atlas@localhost:15432/atlas'
$env:TEST_DATABASE_ISOLATION = 'database'
Push-Location apps/api
..\..\node_modules\.bin\vitest.cmd run --config vitest.integration.config.ts test/manual-invoice-order.integration.test.ts
Pop-Location
docker compose -f infrastructure/docker/docker-compose.yml stop postgres
```

`TEST_DATABASE_ISOLATION=database` создаёт случайную временную базу, применяет миграции и удаляет эту базу по окончании теста. Обычный schema-режим интеграционных тестов не менялся.

## Важная граница P0

DecorFlavor хранит только номер внешнего счёта, сумму, срок и операционные статусы. В приложении нет карточных/банковских реквизитов, платёжных ссылок, invoice PDF, эквайринга, webhook или payout.

## Локальные данные для ручной проверки интерфейса

После `migrate deploy` и `db:seed` seed публикует четыре уникальных товара с инвентарём. Для локального теста доступны:

- buyer: `buyer@decorflavor.local` / значение `SEED_BUYER_PASSWORD`;
- seller: `seller@atlas.local` / значение `SEED_SELLER_PASSWORD`;
- platform admin: `admin@atlas.local` / значение `SEED_ADMIN_PASSWORD`.

Это только development-аккаунты. В рабочую среду они не переносятся.
