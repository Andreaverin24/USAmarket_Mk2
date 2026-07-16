# Acceptance tests — Phase 1 Foundation

| ID  | Проверка     | Команда/доказательство                     | Ожидаемый результат                                         |
| --- | ------------ | ------------------------------------------ | ----------------------------------------------------------- |
| A01 | dependencies | `pnpm install --frozen-lockfile`           | exit 0                                                      |
| A02 | local infra  | `docker compose up -d`                     | postgres, redis, minio, mailpit healthy/running             |
| A03 | migration    | `pnpm db:migrate`                          | migration applied, exit 0                                   |
| A04 | seed         | `pnpm db:seed`                             | admin/seller/driver и tenants существуют                    |
| A05 | health       | `GET /health`                              | 200; postgres/redis/objectStorage statuses и correlation ID |
| A06 | login        | `POST /auth/login` seeded admin            | 200; opaque HttpOnly session cookie                         |
| A07 | current user | `GET /auth/me` with cookie                 | admin identity и memberships без password hash              |
| A08 | tenant allow | seller читает members своей organization   | 200                                                         |
| A09 | tenant deny  | seller запрашивает чужую organization      | 404 (fail closed, без leakage)                              |
| A10 | logout       | `POST /auth/logout` with CSRF              | session revoked; subsequent `/auth/me` = 401                |
| A11 | OpenAPI      | `GET /openapi.json` и generated artifact   | valid OpenAPI с Phase 1 routes                              |
| A12 | outbox       | integration test commit/dispatch           | event сохраняется атомарно и становится processed           |
| A13 | quality      | `pnpm lint && pnpm typecheck && pnpm test` | exit 0                                                      |
| A14 | integration  | `pnpm test:integration`                    | real PostgreSQL Testcontainer, isolation passes             |
| A15 | build        | `pnpm build`                               | все apps/packages build, exit 0                             |
| A16 | scope        | repository scan                            | нет catalog/payment/logistics implementation                |

## Security assertions

- body `organizationId` не влияет на tenant context;
- invalid/expired/revoked session возвращает 401;
- cross-tenant UUID возвращает 404, а не раскрывает existence;
- password/token hashes отсутствуют в API/logs;
- mutation с cookie без trusted Origin/CSRF отклоняется;
- correlation ID создаётся/валидируется и попадает в audit/log context.
