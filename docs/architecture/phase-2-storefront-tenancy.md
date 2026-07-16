# Phase 2 storefront tenancy

## Resolution order

1. Normalize `Host`: lowercase, strip a valid port and trailing dot, reject malformed hostnames.
2. Match an active, verified `StorefrontDomain` for a custom domain.
3. Match `<seller-slug>.<configured platform domain>` or `<seller-slug>.localhost` in development.
4. For explicit fallback pages, resolve `/dealers/:sellerSlug` independently of Host.
5. Unknown/inactive/unverified domains return 404 without revealing tenant metadata.

Resolution creates a public `StorefrontContext` only: storefront ID, organization ID, slug and approved presentation configuration. It never creates membership, session or administrative authorization. Protected seller APIs still use session, permission and tenant membership checks.

## Isolation

- Storefront queries add resolved `organizationId`, active organization/storefront and `PUBLISHED` status.
- Product routes require both storefront organization and product slug.
- Redirect and policy queries include storefront/organization scope.
- Marketplace and storefront projections serialize the same Product UUID.
- Cache keys, when introduced, must contain storefront ID and hostname.

## Theme contract

Only approved fields are rendered: preset, logo, favicon, palette, typography token, hero, about, contact, social links, navigation, featured collections, SEO and policy pages. Values are validated; seller custom CSS/JavaScript and arbitrary templates are forbidden.

Established Lines uses the `established-lines` preset with compact navigation, curated sections, trust/delivery content and policy pages. TLS/DNS provisioning is outside the application and delegated to the hosting provider.
