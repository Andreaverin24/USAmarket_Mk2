# ADR-003: Opaque server-side sessions

- Status: Accepted
- Date: 2026-07-14

## Context

Foundation должна поддержать email/password сейчас и magic link позже, безопасный logout/revocation, RBAC и browser apps на общей API boundary.

## Decision

Пароли хешируются Argon2id. После login сервер выдаёт криптографически случайный opaque token в `HttpOnly`, `SameSite=Lax`, `Secure` (кроме local/test) cookie. В PostgreSQL хранится только SHA-256 token hash, expiry, revocation и session metadata. Session обновляет `last_seen_at` с ограниченной частотой.

Cookie mutations защищаются проверкой trusted Origin и double-submit CSRF header/cookie. Login throttling использует Redis с fail-closed policy в production. Авторизация строится по active session, memberships, role permissions и tenant context. MFA остаётся будущей фазой, но permission model не препятствует её добавлению.

## Consequences

- немедленная server-side revocation;
- утечка БД не раскрывает bearer tokens;
- API требует Redis/PostgreSQL для полноценного login;
- non-browser clients в будущем потребуют отдельный token ADR.
