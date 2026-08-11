# Phase 3 plan — dealer onboarding and moderation

## Scope

Реализовать только dealer onboarding, dealer review, historical product moderation,
publication gate, notifications, admin/seller UI и security tests. Не начинать conversations,
offers, reservations или order flow.

## Work packages

1. **Database**
   - dealer/profile/verification enums and models;
   - versioned product moderation review/comments;
   - outbox-driven notifications;
   - indexes, unique constraints and migration.
2. **Authorization**
   - canonical platform and organization role permissions;
   - exact platform permission resolver;
   - approved dealer gate;
   - cross-tenant 404.
3. **Dealer services/API**
   - create/update/submit application;
   - own application read;
   - admin queue/detail and explicit review actions;
   - audit/outbox for every lifecycle command.
4. **Moderation services/API**
   - review history per submission/version;
   - request changes, approve and publish;
   - seller-visible feedback and internal comments;
   - admin queue.
5. **Notifications**
   - worker projection from outbox;
   - in-app list/read endpoint;
   - idempotent email queue record.
6. **UI**
   - dealer onboarding form and status;
   - seller organization switcher and moderation feedback;
   - admin dealer and product moderation queues;
   - notifications page.
7. **Tests and acceptance**
   - state machines and permissions;
   - clean/current migration;
   - tenant/IDOR and seller-cannot-moderate tests;
   - full Phase 3 scenario;
   - Phase 2 import/media compatibility.

## Acceptance

1. Candidate creates and submits dealer application.
2. Platform admin starts review and approves it.
3. Approved dealer creates draft product and submits it.
4. Moderator requests changes with a reason.
5. Dealer reads feedback, edits canonical product and resubmits.
6. Moderator approves and publishes.
7. Product appears in marketplace.
8. Same UUID appears in seller storefront.
9. Audit, review history, verification history and notifications exist.
10. Other seller receives 404 for protected product/application access.

## Verification

`pnpm install`, formatting, lint, typecheck, unit, integration, build, Prisma validate/status/generate,
relevant Playwright and the Phase 3 acceptance runner.
