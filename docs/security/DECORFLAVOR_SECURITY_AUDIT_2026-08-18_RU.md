# DecorFlavor — аудит кибербезопасности и статус готовности

**Дата:** 18 августа 2026  
**Статус:** code/security review выполнен; это не penetration test и не разрешение на публичный запуск.  
**Объект:** monorepo DecorFlavor, текущий P0 без эквайринга: витрина → reserve → счёт продавца вне платформы → сообщение покупателя → подтверждение платформой → ready for fulfillment.

## Резюме

- Подтверждённые проблемы в текущем коде исправлены: безопасное доверие reverse proxy, SSRF-проверка медиа-import, публичная регистрация, response headers, строгая production-конфигурация и зависимость Next.js.
- Next.js обновлён с `15.5.20` до `15.5.21`. Это закрывает опубликованную для версий `<15.5.21` проблему раскрытия внутренних Server Function endpoints ([GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp)).
- Секреты не были прочитаны или выведены. `.env` игнорируется Git; по tracked файлам не найдены high-confidence паттерны credential.
- Полный DB integration test в этой среде не выполнен: отсутствует доступный Docker/container runtime. Это инфраструктурный блокер верификации, а не подтверждённый дефект P0.

## Что проверено

1. Статический обзор API, сессий/cookies, CSRF, RBAC/tenant boundaries, order/support flow, worker и всех трёх Next.js приложений.
2. Исходящие запросы worker: HTTP import каталога, Chromium capture, media download, redirects, DNS/IP validation и ограничения payload.
3. Публичная поверхность: CORS, proxy IP, headers, request size, registration/login throttling, JSON-LD output.
4. Конфигурация и supply chain: lockfile, версия Next.js, production preflight, Git ignore и сканирование tracked имён/паттернов без вывода секретов.
5. Автоматические unit/security tests, type checks, ESLint, Prettier и production builds.

## Найденные риски и выполненные исправления

| ID     | Риск                                 | До исправления                                                                                                             | Исправление                                                                                                                        | Статус                                                     |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| SEC-01 | Подмена IP через `X-Forwarded-For`   | API всегда доверял proxy (`trustProxy: true`), что в неправильной сети может обходить login rate limit и портить audit IP. | Введён обязательный явный `TRUST_PROXY`; безопасный default — `false`. Production preflight проверяет значение.                    | Исправлено в коде; deployment decision остаётся владельцу. |
| SEC-02 | Устаревший Next.js                   | Использовался `15.5.20`, затронутый advisory GHSA-955p-x3mx-jcvp для `<15.5.21`.                                           | Все web/portal/driver обновлены до `15.5.21`, lockfile перегенерирован.                                                            | Исправлено.                                                |
| SEC-03 | SSRF при скачивании media            | Отдельный media importer имел менее полную проверку private/reserved адресов, чем web importer; допускал HTTP.             | Общая strict hostname/IP guard, запрет literal IP и private/reserved ranges, HTTPS-only media, redirect запрет и regression tests. | Исправлено в приложении.                                   |
| SEC-04 | Abuse публичной регистрации          | Регистрация не имела собственного rate limit и явно сообщала, что email существует.                                        | Введён отдельный Redis rate limit (5/5 min на email+IP), сообщение о conflict обобщено.                                            | Исправлено.                                                |
| SEC-05 | Недостаток browser hardening headers | API и Next applications не выставляли базовые response headers.                                                            | API: CSP для JSON API, anti-frame, anti-sniff, referrer/permissions/COOP/HSTS (production). Next apps: safe headers/HSTS.          | Исправлено.                                                |
| SEC-06 | Неполная production validation       | Origins не валидировались как origins, production мог принять HTTP CORS/S3 endpoint.                                       | Валидация canonical HTTP(S) origins; в production разрешены только HTTPS origins и S3 endpoint.                                    | Исправлено.                                                |

## Что уже реализовано в продукте

- Витрина DecorFlavor: большой поиск, фильтры, каталог/карточки/страницы товара и витрина случайных позиций.
- Identity foundation: cookie sessions, CSRF, роли/permissions, organisation tenancy, audit log, outbox.
- Seller/admin catalogue workflows: импорт, модерация, публикация, media processing, dealer pages/policies.
- Сквозной P0 заказа без платежей в приложении: reserve товара, seller invoice вне платформы, buyer report, platform verification, готовность к исполнению; отмена до подтверждения освобождает товар.
- Buyer account, seller/admin order queues, in-app notifications, private support cases и operational queues.
- Prisma schema/migrations, local seed/dev setup, health checks, production-preflight и runbooks.

## Результаты автоматической верификации

| Проверка                                        | Результат                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Security/config/SSRF unit tests                 | 32/32 passed                                                                                                                             |
| P0 order/support state-machine tests            | 7/7 passed                                                                                                                               |
| TypeScript: config, API, worker                 | passed                                                                                                                                   |
| ESLint затронутых файлов                        | passed                                                                                                                                   |
| Prettier затронутых файлов                      | passed                                                                                                                                   |
| `git diff --check`                              | passed                                                                                                                                   |
| Production build витрины                        | passed, Next.js 15.5.21                                                                                                                  |
| Production build seller/admin portal            | passed, Next.js 15.5.21                                                                                                                  |
| Production build driver UI                      | passed, Next.js 15.5.21                                                                                                                  |
| Production preflight с безопасным synthetic env | passed; deploy не выполнялся                                                                                                             |
| DB integration: полный P0 flow                  | не выполнен — container runtime недоступен                                                                                               |
| Online `pnpm audit`                             | не выполнен — запуск был отклонён, так как отправил бы private dependency inventory во внешний npm audit service без отдельного согласия |

## Остаточные риски и обязательные действия до публичного запуска

### Blockers for public launch

1. Развернуть staging/production: домен, TLS, DNS, managed PostgreSQL/Redis/S3, secret manager, backup и owner incident response.
2. Явно определить ingress: API не должен быть доступен напрямую. `TRUST_PROXY=true` включать только за reverse proxy/load balancer, который перезаписывает forwarded headers.
3. Изолировать worker web import: outbound firewall должен запрещать RFC1918, link-local и cloud metadata ranges. Проверка DNS в коде не гарантирует защиту от DNS rebinding сама по себе.
4. Выполнить полный integration suite с доступным Docker runtime или выделенным test PostgreSQL и провести ручной P0 smoke path с тестовыми аккаунтами.
5. Утвердить legal/privacy/retention, tax/merchant-of-record, возвраты/споры, delivery policy и customer support SLA. Платёжных данных в продукте нет — оплата остаётся внешним счётом продавца.

### Important follow-up, not a code blocker

- Одобрить частный dependency-audit workflow в CI и запустить `pnpm audit --prod` в организации/среде, где допустима передача dependency inventory. Не отправлять `.env` или lockfile в неутверждённые сервисы.
- Добавить WAF/ingress rate limiting для API в целом; сейчас application-level limit покрывает login/registration, но не заменяет защиту на edge.
- Спроектировать CSP для Next.js отдельно: nonce/report-only режим нужен, чтобы строгий `script-src` не сломал App Router. До этого на web apps применены безопасные headers без CSP.
- Добавить email verification/recovery, уведомления вне приложения, monitoring/alerting, vulnerability scan и независимый penetration test перед ростом аудитории.
- Устранить предупреждение Next.js о не подключенном eslint plugin: оно не ломает сборку и не выявило security defect, но снижает качество CI feedback.

## Оценка готовности

Оценка не является сертификацией и намеренно разделяет работающий P0 от публичного production.

| Контур                                      | Готовность | Пояснение                                                                                                          |
| ------------------------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------ |
| Функциональный P0 в локальной/staging среде |   **~80%** | Основной ручной-invoice путь, роли, support и UI реализованы и собраны; нужна DB integration повторная проверка.   |
| Техническая готовность к controlled testing |   **~70%** | Есть schema, preflight, headers, security hardening и builds; ещё нужны runtime, smoke/E2E и environment setup.    |
| Готовность к открытому public launch        |   **~40%** | Отсутствуют production infrastructure/security operations, legal/privacy decisions и независимая внешняя проверка. |

## Связанные документы

- [Security hardening authority](../product/DECORFLAVOR_SECURITY_HARDENING_P0_AUTHORITY_RU.md)
- [Production readiness runbook](../runbooks/DECORFLAVOR_PRODUCTION_READINESS_RU.md)
- [P0 manual-invoice authority](../product/DECORFLAVOR_MANUAL_INVOICE_P0_AUTHORITY_RU.md)
