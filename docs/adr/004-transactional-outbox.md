# ADR-004: Transactional outbox

- Status: Accepted
- Date: 2026-07-14

## Context

Внешний side effect нельзя выполнять внутри database transaction, а потеря события после commit недопустима.

## Decision

Application service в одной Prisma transaction сохраняет aggregate/audit change и `OutboxEvent`. Event содержит UUID, organization, aggregate type/id, event type, schema version, JSON payload, occurrence time и processing state.

Worker выбирает pending events небольшими batches с lock lease, публикует/исполняет handler, затем выставляет `processed_at`. Ошибка увеличивает attempts, сохраняет sanitized error и назначает `available_at` с backoff. Handlers обязаны быть idempotent по event UUID. Phase 1 включает безопасный dispatcher и no-op foundation handler; продуктовые handlers не реализуются.

## Consequences

- commit и намерение side effect атомарны;
- доставка at-least-once, поэтому consumers идемпотентны;
- задержка обработки наблюдается через health/logs;
- cleanup/retention определяется runbook до production.
