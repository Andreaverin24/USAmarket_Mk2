# DecorFlavor — authority: Security hardening P0

**Статус:** ACTIVE — изменения кода разрешены владельцем проекта 18 августа 2026.  
**Уровень по AI-assisted development standard:** Level 2.  
**Decision owner:** владелец DecorFlavor.  
**Вертикальный срез:** безопасная эксплуатация текущего P0 (витрина → заказ → счёт продавца вне платформы → подтверждение → исполнение), без подключения платежей, поставщиков или production-инфраструктуры.

## Confirmed

- API использует cookie session, CSRF guard для защищённых mutating routes, RBAC/tenant boundaries, audit log и outbox.
- Публичный импорт каталога и медиа создаёт исходящие HTTP(S)-запросы из worker; это security-sensitive поверхность SSRF.
- Текущий P0 не хранит реквизиты карт, не запускает эквайринг, не обрабатывает банковские документы и не использует payment webhooks.

## Security changes authorized now

- Безопасное по умолчанию доверие к proxy: `TRUST_PROXY=false`; production preflight требует явного значения. `true` разрешён только за контролируемым ingress.
- API и три Next.js приложения получают defensive response headers. Строгий web CSP не включается до отдельного nonce-based дизайна, чтобы не сломать Next.js App Router.
- Ограничение API request body, rate limit отдельного публичного registration flow и менее раскрывающее сообщение о конфликте регистрации.
- Общая строгая проверка hostname/IP и HTTPS для worker media import; фиксируются пропущенные private/reserved ranges.
- Production configuration отклоняет не-HTTPS CORS origins и S3 endpoint.
- Обновление подтверждённо уязвимой версии Next.js выполняется отдельным dependency-change после получения пакета из разрешённого registry.

## Explicit non-goals

- Не считается проведённым production penetration test, cloud configuration audit, legal/privacy audit, платежный аудит или deployment.
- Не отправляются секреты, `.env` или private dependency inventory третьим сторонам.
- Не принимается риск инфраструктуры за владельца: egress firewall, DNS, WAF/CDN, secret manager, backup, incident owner и monitoring требуют отдельной настройки в целевой среде.

## Residual risks / owner decisions before public launch

1. Назначить production ingress и конкретно определить `TRUST_PROXY`; запретить прямой доступ к API.
2. Разместить web-import browser worker в изолированной сети с deny rules на RFC1918, link-local и metadata endpoints; DNS rebinding нельзя устранить только проверкой приложения.
3. Одобрить внешний registry/dependency-audit workflow и выполнить audit lockfile в доверенной CI среде.
4. В отдельном срезе спроектировать CSP с nonce/report-only, identity recovery/email verification, privacy retention и abuse/WAF policy.
