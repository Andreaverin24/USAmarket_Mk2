# Project Atlas

Modular-monolith foundation, Phase 2 catalog/storefront and Phase 3 dealer onboarding/product
moderation for a premium furniture marketplace. Applications run directly on Windows through
Node.js/pnpm with Prisma and local PostgreSQL; Docker is optional infrastructure, not an
application runtime requirement.

See the [Phase 1 plan](docs/plans/phase-1-foundation.md), [Phase 2 plan](docs/plans/phase-2-catalog-storefront.md), and [local runbook](docs/runbooks/local-development.md).

## Investor catalog preview

The Vercel build publishes the read-only portal dashboard at `/catalog-dashboard`. On Vercel,
`NEXT_PUBLIC_INVESTOR_DEMO` defaults to `true`: the portal loads the bundled 30-card Established
Lines snapshot, performs no API calls, hides import and authentication controls, redirects `/` to
the catalog, and asks search engines not to index the demo. Local development keeps the operational
mode unless the flag is set explicitly.
