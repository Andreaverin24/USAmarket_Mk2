import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/request.js';
import { SessionGuard } from '../../common/session.guard.js';
import { CsrfGuard } from '../../common/csrf.guard.js';
import { ImportService, type ShopifyColumnMapping } from './import.service.js';

const inputSchema = z.object({
  csv: z.string().min(1),
  dryRun: z.boolean().default(true),
  idempotencyKey: z.string().min(8).max(200),
  mapping: z
    .object({
      externalId: z.string().min(1).max(200).optional(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().min(1).max(200).optional(),
      vendor: z.string().min(1).max(200).optional(),
      productType: z.string().min(1).max(200).optional(),
      sku: z.string().min(1).max(200).optional(),
      price: z.string().min(1).max(200).optional(),
      condition: z.string().min(1).max(200).optional(),
      materials: z.string().min(1).max(200).optional(),
      colors: z.string().min(1).max(200).optional(),
      styles: z.string().min(1).max(200).optional(),
      imageUrl: z.string().min(1).max(200).optional(),
    })
    .optional(),
});

const webInputSchema = z.object({
  siteUrl: z.string().url().max(2000),
  categoryUrls: z.array(z.string().url().max(2000)).min(1).max(20),
  maxProducts: z.number().int().min(1).max(200).default(50),
  maxCategoryPages: z.number().int().min(1).max(20).default(5),
  idempotencyKey: z.string().min(8).max(200),
});

const webApplySchema = z.object({ rightsConfirmed: z.literal(true) });

@ApiTags('imports')
@ApiCookieAuth()
@UseGuards(SessionGuard, CsrfGuard)
@Controller('organizations/:organizationId/imports')
export class ImportController {
  constructor(private readonly imports: ImportService) {}
  @Post('shopify')
  shopify(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: unknown,
  ) {
    const input = inputSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.imports.shopify(request.auth!.userId, organizationId, {
      csv: input.data.csv,
      dryRun: input.data.dryRun,
      idempotencyKey: input.data.idempotencyKey,
      ...(input.data.mapping
        ? {
            mapping: Object.fromEntries(
              Object.entries(input.data.mapping).filter((entry) => entry[1] !== undefined),
            ) as ShopifyColumnMapping,
          }
        : {}),
      correlationId: request.correlationId,
    });
  }

  @Post('web')
  web(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: unknown,
  ) {
    const input = webInputSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.imports.web(request.auth!.userId, organizationId, {
      ...input.data,
      correlationId: request.correlationId,
    });
  }
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.imports.list(request.auth!.userId, organizationId);
  }
  @Get(':jobId')
  report(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.imports.report(request.auth!.userId, organizationId, jobId);
  }

  @Post(':jobId/retry')
  retry(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.imports.retry(request.auth!.userId, organizationId, jobId);
  }

  @Post(':jobId/apply')
  apply(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Body() body: unknown,
  ) {
    const input = webApplySchema.safeParse(body);
    if (!input.success) throw new BadRequestException('Rights confirmation is required');
    return this.imports.apply(request.auth!.userId, organizationId, jobId, input.data);
  }

  @Get('catalog/export.csv')
  async exportCsv(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', 'attachment; filename="atlas-catalog.csv"');
    return this.imports.exportCsv(request.auth!.userId, organizationId);
  }
}
