import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/request.js';
import { SessionGuard } from '../../common/session.guard.js';
import { TenantService } from './tenant.service.js';

@ApiTags('tenancy')
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('organizations')
export class TenancyController {
  constructor(private readonly tenants: TenantService) {}
  @Get(':organizationId/members')
  members(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.tenants.members(request.auth!.userId, organizationId);
  }
}
