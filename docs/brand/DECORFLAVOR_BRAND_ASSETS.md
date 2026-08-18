# DecorFlavor brand assets

## Canonical identity

- Product and public-site name: `DecorFlavor`.
- Public marketplace origin: `https://decorflavor.com`.
- Development origin: `http://localhost:3000` unless `NEXT_PUBLIC_SITE_URL` is configured.

## Approved local assets

| Context                                                 | Asset                                                   |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Public-site header and other wide horizontal placements | `apps/web/public/brand/decorflavor-logo-horizontal.svg` |
| Square placements, such as the browser icon             | `apps/web/public/brand/decorflavor-logo-stacked.svg`    |

The public marketplace header uses the horizontal logo. The stacked logo is registered as the
browser icon. Both files are committed locally so the interface has no external image dependency.

## Usage rules for future solutions

- Reuse these paths instead of recreating the wordmark or importing a remote logo.
- Preserve the logos' proportions, colours and clear space; do not crop, recolour or add effects.
- Use `https://decorflavor.com` for production canonical URLs and sitemap entries. Configure the
  deployed web app with `NEXT_PUBLIC_SITE_URL=https://decorflavor.com`; local development keeps
  the localhost value from `.env.example`.
- Domain/DNS, Vercel configuration and publication are operational changes and are not performed
  by this repository change.

## Related design research

The researched visual direction, UX principles, competitive analysis and implementation boundaries
for the premium marketplace are documented in
[`DECORFLAVOR_PREMIUM_EXPERIENCE_RESEARCH_RU.md`](./DECORFLAVOR_PREMIUM_EXPERIENCE_RESEARCH_RU.md).
Its recommendations become implementation authority only after owner acceptance.
