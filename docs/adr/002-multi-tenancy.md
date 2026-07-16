# ADR-002: Row-level multi-tenancy

- Status: Accepted
- Date: 2026-07-14

## Context

Одна база обслуживает marketplace, platform actors и несколько seller organizations. Наиболее критичный риск — IDOR/cross-tenant leakage.

## Decision

Используем shared schema/shared database и обязательный `organization_id` во всех tenant-owned таблицах. Tenant selector может поступить из route/hostname/header, но становится trusted tenant context только после server-side проверки active membership или platform permission. `organization_id` из request body игнорируется/запрещается.

Repositories tenant-модулей принимают `TenantContext`, добавляют `organization_id` во все predicates и используют tenant-aware compound unique constraints. Public storefront hostname разрешается через `StorefrontDomain`, затем также формирует server-side context. Platform admin bypass является отдельной permission и всегда audited.

PostgreSQL RLS не является первой линией Phase 1: Prisma application guards и scoped repositories обязательны. RLS может быть добавлен отдельным ADR как defense-in-depth.

## Consequences

- простые migration и транзакции;
- каждый tenant access требует membership/permission check;
- integration test обязан доказывать fail-closed для чужого UUID;
- фоновые jobs несут явный `organizationId`, полученный из сохранённого event, не из внешнего payload.
