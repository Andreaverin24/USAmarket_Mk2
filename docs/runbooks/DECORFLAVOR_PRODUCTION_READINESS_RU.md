# DecorFlavor — техническая готовность к production

**Статус:** технический runbook; он не является разрешением на публичный запуск.  
**Область:** проверяемая подготовка текущего order/support P0 без эквайринга.

## Что уже проверяется кодом

- Prisma migration и типы данных; CI применяет миграции к чистому PostgreSQL.
- Unit/integration tests проверяют state machines, tenant boundaries, audit, outbox и in-app notifications.
- API имеет `GET /health/live` (liveness) и `GET /health` (PostgreSQL, Redis, object storage).
- `pnpm preflight:production` проверяет только форму обязательной конфигурации. Скрипт не читает `.env`, не печатает секреты, не ходит в сеть и ничего не развёртывает.

## Обязательный preflight перед отдельным решением о deploy

1. В staging/production secret store установить, но не коммитить: `DATABASE_URL`, `REDIS_URL`, `S3_*`, `SESSION_*`, `APP_ORIGINS`, `NEXT_PUBLIC_SITE_URL`, `PLATFORM_DOMAIN`, `TRUST_PROXY`.
2. Установить `NODE_ENV=production`; URL сайта и origin должны быть HTTPS, а не `localhost`.
3. Не передавать в production `SEED_*` credentials. Создание development-пользователей через seed запрещено.
4. Выполнить в **инъецированном deployment environment**:

   ```sh
   pnpm preflight:production
   pnpm db:migrate
   pnpm build
   ```

5. После развёртывания проверить `GET /health/live`, затем `GET /health`; второй endpoint должен вернуть `status: "ok"` и все dependencies `up`.
6. Провести smoke path с тестовыми аккаунтами: published object → reserve → external seller invoice → buyer report → platform confirmation → ready for fulfillment → support case.

## Security baseline before deploy

- `TRUST_PROXY=true` допустим только когда API доступен **исключительно** через управляемый reverse proxy / load balancer, который перезаписывает `X-Forwarded-For`; при прямом доступе API оставить `false`.
- Не публиковать API, PostgreSQL, Redis или object storage напрямую в интернет. Разрешить worker исходящий HTTPS только к публичным адресам; на уровне сети запретить private, link-local и cloud metadata ranges. Это необходимо как вторая линия защиты от SSRF и DNS rebinding при импорте каталогов/изображений.
- TLS завершается до приложения и принудительно перенаправляет HTTP на HTTPS. Проверить фактические response headers после deploy, включая HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` и `Permissions-Policy`.
- Перед каждым release выполнить локальные проверки (`pnpm lint`, `pnpm typecheck`, `pnpm test`) и dependency audit в одобренной организации среде. В этом workspace автоматическая отправка private dependency inventory во внешний npm audit endpoint не выполняется.

## Backup и rollback

- До миграции создать проверяемый backup PostgreSQL и записать его идентификатор в change record. Требование по RPO/RTO и владелец backups ещё должны быть утверждены владельцем проекта.
- Миграции текущего среза аддитивны (`support_cases`, `support_case_events`, новые enum). Откат приложения допустим только после проверки совместимости старой версии с новой схемой; удаление таблиц/enum как «rollback» запрещено.
- При incident сначала остановить rollout, сохранить correlation ID/audit evidence, затем восстановить сервис по утверждённой процедуре. Не редактировать вручную order/support state и не удалять audit/outbox.

## Что не делает этот runbook

- Не создаёт домен, облачный аккаунт, production database или почтовый провайдер.
- Не выпускает legal pages, налоговые правила, политику возврата или privacy/retention policy.
- Не подключает email/SMS, платежи, реквизиты, документы, delivery address, courier или refund.
- Не означает, что production deployment уже выполнен.

## Owner decisions до публичного запуска

1. География, merchant-of-record, tax, refund/dispute и delivery policy.
2. DNS/домен, облачный владелец, environments, доступы, backup RPO/RTO и incident owner.
3. Поставщик email/SMS, consent, retention и шаблоны сообщений.
4. Legal/privacy тексты и процесс обработки пользовательских данных.
