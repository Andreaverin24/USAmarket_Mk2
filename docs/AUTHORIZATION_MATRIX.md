# Authorization matrix

Permissions are authoritative; role names describe the default grants.

| Action                    | OWNER | ADMIN | CATALOG_MANAGER | SALES_MANAGER | FULFILLMENT_MANAGER | VIEWER | Platform reviewer        |
| ------------------------- | ----- | ----- | --------------- | ------------- | ------------------- | ------ | ------------------------ |
| Read organization catalog | Yes   | Yes   | Yes             | Yes           | Yes                 | Yes    | With platform permission |
| Create/edit product       | Yes   | Yes   | Yes             | No            | No                  | No     | No                       |
| Submit product            | Yes   | Yes   | Yes             | No            | No                  | No     | No                       |
| Manage dealer application | Yes   | Yes   | No              | No            | No                  | No     | Review only              |
| Read team                 | Yes   | Yes   | No              | No            | No                  | No     | Support/admin only       |
| Moderate product          | No    | No    | No              | No            | No                  | No     | `catalog:moderate`       |
| Review dealer             | No    | No    | No              | No            | No                  | No     | `dealer:review`          |

Platform roles:

- `PLATFORM_ADMIN`: all platform permissions;
- `PLATFORM_OPERATOR`: dealer review/read and operational queues;
- `PLATFORM_MODERATOR`: product moderation and dealer read;
- `PLATFORM_SUPPORT`: read-only support access.

Tenant-scoped object reads and writes always include organization ownership. IDOR-sensitive misses
return 404. Public storefront resolution does not grant any protected permission.
