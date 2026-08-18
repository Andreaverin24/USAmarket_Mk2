import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CsrfGuard } from '../../common/csrf.guard.js';
import type { AuthenticatedRequest } from '../../common/request.js';
import { SessionGuard } from '../../common/session.guard.js';
import {
  createSupportCaseSchema,
  supportCaseQuerySchema,
  updateSupportCaseSchema,
} from './support.schemas.js';
import { SupportService } from './support.service.js';

@ApiTags('support')
@ApiCookieAuth()
@Controller()
@UseGuards(SessionGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('me/support-cases')
  buyerCases(@Req() request: AuthenticatedRequest) {
    return this.support.buyerCases(request.auth!.userId);
  }

  @Get('me/support-cases/:supportCaseId')
  buyerCase(
    @Req() request: AuthenticatedRequest,
    @Param('supportCaseId', new ParseUUIDPipe()) supportCaseId: string,
  ) {
    return this.support.buyerCase(request.auth!.userId, supportCaseId);
  }

  @Post('me/support-cases')
  @UseGuards(CsrfGuard)
  createBuyerCase(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = createSupportCaseSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.support.createBuyerCase(request.auth!.userId, input.data, request.correlationId);
  }

  @Get('admin/support-cases')
  adminCases(@Req() request: AuthenticatedRequest, @Query() query: unknown) {
    const input = supportCaseQuerySchema.safeParse(query);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.support.adminCases(request.auth!.userId, input.data);
  }

  @Get('admin/support-cases/:supportCaseId')
  adminCase(
    @Req() request: AuthenticatedRequest,
    @Param('supportCaseId', new ParseUUIDPipe()) supportCaseId: string,
  ) {
    return this.support.adminCase(request.auth!.userId, supportCaseId);
  }

  @Patch('admin/support-cases/:supportCaseId')
  @UseGuards(CsrfGuard)
  updateCase(
    @Req() request: AuthenticatedRequest,
    @Param('supportCaseId', new ParseUUIDPipe()) supportCaseId: string,
    @Body() body: unknown,
  ) {
    const input = updateSupportCaseSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.support.updateCase(
      request.auth!.userId,
      supportCaseId,
      input.data,
      request.correlationId,
    );
  }
}
