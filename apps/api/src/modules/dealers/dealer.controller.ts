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
import type { AuthenticatedRequest } from '../../common/request.js';
import { CsrfGuard } from '../../common/csrf.guard.js';
import { SessionGuard } from '../../common/session.guard.js';
import {
  createDealerApplicationSchema,
  dealerReviewSchema,
  submitDealerApplicationSchema,
  updateDealerApplicationSchema,
} from './dealer.schemas.js';
import { DealerService } from './dealer.service.js';

@ApiTags('dealers')
@ApiCookieAuth()
@Controller()
@UseGuards(SessionGuard)
export class DealerController {
  constructor(private readonly dealers: DealerService) {}

  @Get('dealer-applications/mine')
  mine(@Req() request: AuthenticatedRequest) {
    return this.dealers.mine(request.auth!.userId);
  }

  @Post('dealer-applications')
  @UseGuards(CsrfGuard)
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = createDealerApplicationSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.dealers.create(request.auth!.userId, input.data, request.correlationId);
  }

  @Get('organizations/:organizationId/dealer-application')
  owned(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.dealers.owned(request.auth!.userId, organizationId);
  }

  @Patch('organizations/:organizationId/dealer-application')
  @UseGuards(CsrfGuard)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: unknown,
  ) {
    const input = updateDealerApplicationSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.dealers.update(
      request.auth!.userId,
      organizationId,
      input.data,
      request.correlationId,
    );
  }

  @Post('organizations/:organizationId/dealer-application/submit')
  @UseGuards(CsrfGuard)
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: unknown,
  ) {
    const input = submitDealerApplicationSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.dealers.submit(
      request.auth!.userId,
      organizationId,
      input.data.version,
      request.correlationId,
    );
  }

  @Get('admin/dealer-applications')
  queue(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    return this.dealers.reviewQueue(request.auth!.userId, status);
  }

  @Get('admin/dealer-applications/:applicationId')
  detail(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.dealers.adminDetail(request.auth!.userId, applicationId);
  }

  @Post('admin/dealer-applications/:applicationId/review')
  @UseGuards(CsrfGuard)
  review(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() body: unknown,
  ) {
    const input = dealerReviewSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.dealers.review(
      request.auth!.userId,
      applicationId,
      input.data,
      request.correlationId,
    );
  }
}
