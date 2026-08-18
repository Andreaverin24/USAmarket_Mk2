# Environment variables

| Variable               | Required | Purpose                                                          |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `NODE_ENV`             | Yes      | development/test/production behavior                             |
| `PORT`                 | Yes      | API listen port                                                  |
| `DATABASE_URL`         | Yes      | PostgreSQL connection                                            |
| `TEST_DATABASE_URL`    | Tests    | Dedicated local PostgreSQL connection for integration tests      |
| `REDIS_URL`            | Yes      | BullMQ/outbox                                                    |
| `S3_ENDPOINT`          | Yes      | S3-compatible object storage                                     |
| `S3_REGION`            | Yes      | S3 signing region                                                |
| `S3_BUCKET`            | Yes      | media bucket                                                     |
| `S3_ACCESS_KEY`        | Yes      | local/provider credential                                        |
| `S3_SECRET_KEY`        | Yes      | local/provider credential                                        |
| `SESSION_COOKIE_NAME`  | Yes      | session cookie                                                   |
| `SESSION_TTL_SECONDS`  | Yes      | session lifetime                                                 |
| `APP_ORIGINS`          | Yes      | CORS/Origin/CSRF allow-list                                      |
| `NEXT_PUBLIC_SITE_URL` | Web      | public marketplace origin; production: `https://decorflavor.com` |
| `PLATFORM_DOMAIN`      | No       | seller subdomain suffix                                          |
| `LOG_LEVEL`            | No       | structured logging verbosity                                     |
| `SEED_ADMIN_PASSWORD`  | Seed     | local admin password                                             |
| `SEED_SELLER_PASSWORD` | Seed     | local seller/applicant password                                  |
| `SEED_DRIVER_PASSWORD` | Seed     | local driver password                                            |

Secrets belong in environment/secret storage and must not be committed. Phase 3 does not introduce
Stripe, SMTP or payment credentials. EMAIL notification records are queued through the outbox; a
delivery provider is intentionally deferred until provider configuration is approved.

When `TEST_DATABASE_URL` is set, integration tests create a unique temporary schema in that
database and remove it after the suite. Without it, the test harness may use Testcontainers as an
optional isolated fallback.
