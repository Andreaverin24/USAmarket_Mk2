# ADR-005: Catalog and storefront boundaries

- Status: Accepted
- Date: 2026-07-15

## Context

Один seller-owned product должен отображаться на marketplace и storefront без дублирования, при этом seller write operations обязаны оставаться tenant-scoped.

## Decision

`catalog` владеет Category, Product, ProductMedia, Collection и импортом. `storefronts` владеет presentation configuration, domain/slug resolution и redirect mapping, но читает опубликованную catalog projection только через публичный `CatalogQueryService`.

Product является единственным источником commerce content. Marketplace и storefront используют одинаковый product UUID и разные query scopes: marketplace — все `PUBLISHED`, storefront — `PUBLISHED` одной organization. Seller mutations принимают server-derived `TenantContext`; `organizationId` из body запрещён. Публикация проходит application service и записывает audit/outbox.

Search Phase 2 реализуется PostgreSQL (`pg_trgm` + full-text expression) за интерфейсом `SearchProvider`. Media upload использует signed S3 URL; import image URLs превращаются в outbox events для worker.

## Consequences

- изменение seller product отражается в обоих каналах без синхронизации;
- storefront не владеет копией product data;
- публичный read отделён от tenant-authorized write;
- Elasticsearch, drag-and-drop builder и custom JS/CSS не добавляются.
