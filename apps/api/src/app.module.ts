import { Module } from '@nestjs/common';
import { DatabaseService } from './common/database.service.js';
import { SessionGuard } from './common/session.guard.js';
import { CsrfGuard } from './common/csrf.guard.js';
import { AuditService } from './modules/audit/audit.service.js';
import { HealthController } from './modules/health/health.controller.js';
import { AuthController } from './modules/identity/auth.controller.js';
import { SessionService } from './modules/identity/session.service.js';
import { TenancyController } from './modules/tenancy/tenancy.controller.js';
import { TenantService } from './modules/tenancy/tenant.service.js';
import { CatalogController } from './modules/catalog/catalog.controller.js';
import { CatalogService } from './modules/catalog/catalog.service.js';
import { PostgresSearchProvider } from './modules/catalog/search.provider.js';
import { ImportController } from './modules/imports/import.controller.js';
import { ImportService } from './modules/imports/import.service.js';
import { MediaController } from './modules/media/media.controller.js';
import { MediaService } from './modules/media/media.service.js';
import { StorefrontController } from './modules/storefronts/storefront.controller.js';
import { StorefrontService } from './modules/storefronts/storefront.service.js';
import { DealerController } from './modules/dealers/dealer.controller.js';
import { DealerService } from './modules/dealers/dealer.service.js';
import { NotificationController } from './modules/notifications/notification.controller.js';
import { NotificationService } from './modules/notifications/notification.service.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    TenancyController,
    CatalogController,
    ImportController,
    MediaController,
    StorefrontController,
    DealerController,
    NotificationController,
  ],
  providers: [
    DatabaseService,
    AuditService,
    SessionService,
    SessionGuard,
    CsrfGuard,
    TenantService,
    CatalogService,
    PostgresSearchProvider,
    ImportService,
    MediaService,
    StorefrontService,
    DealerService,
    NotificationService,
  ],
})
export class AppModule {}
