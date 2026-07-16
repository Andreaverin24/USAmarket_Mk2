# ADR-001: Modular monolith

- Status: Accepted
- Date: 2026-07-14

## Context

MVP требует строгих доменных границ, транзакционной согласованности и низкой операционной сложности. Микросервисы, Kubernetes и распределённые транзакции запрещены ТЗ.

## Decision

Используем modular monolith: один API deployable, один worker deployable и одна PostgreSQL. Backend-модуль имеет `domain`, `application`, `infrastructure`, `presentation`; наружу экспортирует только application services/contracts. Модуль не читает приватные таблицы другого модуля. Асинхронная коммуникация идёт через domain events, сохранённые в outbox.

В Phase 1 активны модули `identity`, `tenancy`, `audit`, `health`, `outbox`. Следующие домены не создаются заранее.

## Consequences

- атомарные транзакции и простой local/CI runtime;
- границы проверяются структурой импортов и review, а не сетью;
- worker масштабируется отдельно, но разделяет contracts/database;
- модуль можно выделить позже по стабильному application contract.
