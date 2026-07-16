# Модель данных Phase 1

| Entity             | Tenant                       | Ключевые поля и ограничения                                                     |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------- |
| User               | global                       | id, email unique, password_hash, display_name, status, timestamps, version      |
| Session            | global/user                  | token_hash unique, user_id, expires_at, revoked_at, csrf_hash, last_seen_at     |
| Organization       | self                         | id, slug unique, name, type, status, timestamps, version                        |
| OrganizationMember | organization                 | `(organization_id,user_id)` unique, status, role_id                             |
| Role               | organization/global template | organization_id nullable, code, name; scoped unique code                        |
| Permission         | global                       | code unique, description                                                        |
| RolePermission     | role                         | `(role_id,permission_id)` unique                                                |
| Storefront         | organization                 | organization_id unique, slug unique, status, timestamps, version                |
| StorefrontDomain   | organization                 | hostname unique, storefront_id, verified_at, primary flag                       |
| AuditLog           | organization optional        | immutable actor/action/resource, correlation_id, before/after JSON, occurred_at |
| FeatureFlag        | organization optional        | key + organization scope unique, enabled, JSON value                            |
| OutboxEvent        | organization optional        | aggregate/event identity, payload, attempts, lease, processed_at                |

## Инварианты

- IDs — UUID; timestamps — UTC `timestamptz`;
- email и hostname нормализуются в lowercase;
- tenant-owned access всегда фильтруется `organization_id`;
- session plaintext token никогда не хранится;
- `AuditLog` не обновляется и не удаляется application code;
- outbox создаётся в той же transaction, что critical change;
- JSON используется только для metadata/payload, не заменяет основные отношения.

## Seed

- platform organization и seller organizations `established-lines`, `second-seller`;
- permission catalog Phase 1;
- roles: platform admin, seller owner, driver;
- `admin@atlas.local`, `seller@atlas.local`, `driver@atlas.local`, cross-tenant fixture user;
- storefront Established Lines и local domain;
- development passwords задаются `SEED_*_PASSWORD` и не используются production runtime.
