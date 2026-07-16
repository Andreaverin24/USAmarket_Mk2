# Точное дерево monorepo после Phase 1

```text
.
├── .env.example
├── .github/workflows/ci.yml
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc.json
├── README.md
├── docker-compose.yml
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
├── apps
│   ├── api
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   ├── tsconfig.build.json
│   │   ├── tsconfig.json
│   │   ├── vitest.integration.config.ts
│   │   ├── src
│   │   │   ├── app.module.ts
│   │   │   ├── config.ts
│   │   │   ├── main.ts
│   │   │   ├── common
│   │   │   │   ├── database.service.ts
│   │   │   │   ├── request.ts
│   │   │   │   └── session.guard.ts
│   │   │   └── modules
│   │   │       ├── audit/audit.service.ts
│   │   │       ├── health/health.controller.ts
│   │   │       ├── identity/auth.controller.ts
│   │   │       ├── identity/session.service.ts
│   │   │       ├── tenancy/tenancy.controller.ts
│   │   │       ├── tenancy/tenant.service.ts
│   │   │       └── tenancy/tenant.service.test.ts
│   │   └── test/tenant-isolation.integration.test.ts
│   ├── worker
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   │       ├── main.ts
│   │       └── outbox-worker.ts
│   ├── web
│   │   ├── next-env.d.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── app
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── portal
│   │   ├── next-env.d.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── app
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx
│   └── driver
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── app
│           ├── globals.css
│           ├── layout.tsx
│           └── page.tsx
├── packages
│   ├── auth
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   │       ├── index.test.ts
│   │       └── index.ts
│   ├── config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   │       ├── index.test.ts
│   │       └── index.ts
│   ├── contracts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── database
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/index.ts
│   │   └── prisma
│   │       ├── schema.prisma
│   │       ├── seed.ts
│   │       └── migrations
│   │           ├── migration_lock.toml
│   │           └── 20260714172956_foundation/migration.sql
│   ├── eslint-config/package.json
│   ├── observability
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── testing
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── tsconfig
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── package.json
│   └── ui
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.tsx
├── infrastructure/docker/docker-compose.yml
└── docs
    ├── adr
    │   ├── 001-modular-monolith.md
    │   ├── 002-multi-tenancy.md
    │   ├── 003-auth-session.md
    │   └── 004-transactional-outbox.md
    ├── api/openapi.json
    ├── architecture
    │   ├── phase-1-data-model.md
    │   └── phase-1-monorepo-tree.md
    ├── plans
    │   ├── phase-1-acceptance-tests.md
    │   ├── phase-1-foundation.md
    │   └── phase-1-foundation-report.md
    ├── product/(исходные продуктовые документы)
    └── runbooks/local-development.md
```

В дерево не включены ignored/generated `.env`, `node_modules`, `dist`, `.next`, `.turbo` и `*.tsbuildinfo`. Файлы внутри `modules` ограничены `health`, `identity`, `tenancy`, `audit`; catalog/payments/logistics directories отсутствуют.
