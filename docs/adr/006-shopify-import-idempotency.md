# ADR-006: Shopify CSV import idempotency

- Status: Accepted
- Date: 2026-07-15

## Context

Повторный импорт Shopify CSV не должен создавать дубли, а ошибки одной строки не должны скрывать validation report остальных строк.

## Decision

CSV сначала парсится в bounded preview и `ImportRow`. Dry run сохраняет report, но не меняет catalog. Apply upsert-ит product по `(organization_id, external_source, external_id)`; если external ID отсутствует — по `(organization_id, inventory_sku)`. Каждая строка имеет status, normalized payload и errors. Image URLs сохраняются как pending media и создают outbox event после product upsert.

ImportJob имеет checksum входного файла и idempotency key, уникальные в tenant scope. Повтор с тем же key возвращает исходный job. Product write и соответствующие outbox events выполняются одной transaction на строку.

## Consequences

- безопасный retry и прозрачный validation report;
- partial success виден явно;
- сетевое скачивание изображений не выполняется в API request;
- malformed/oversized CSV отклоняется до записи строк.
