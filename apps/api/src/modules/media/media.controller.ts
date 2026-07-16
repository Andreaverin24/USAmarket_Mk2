import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../common/request.js';
import { SessionGuard } from '../../common/session.guard.js';
import { CsrfGuard } from '../../common/csrf.guard.js';
import { MediaService } from './media.service.js';

const uploadSchema = z.object({
  filename: z
    .string()
    .max(255)
    .regex(/\.(jpe?g|png|webp|avif)$/i),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  size: z.number().int().positive().max(20_000_000),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
});

const mediaUpdateSchema = z.object({
  altText: z.string().trim().min(1).max(300).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isPrimary: z.boolean().optional(),
});

@ApiTags('media')
@ApiCookieAuth()
@UseGuards(SessionGuard, CsrfGuard)
@Controller('organizations/:organizationId/catalog/products/:productId/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post('upload-url')
  uploadUrl(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() body: unknown,
  ) {
    const input = uploadSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.media.uploadUrl(request.auth!.userId, organizationId, productId, input.data);
  }

  @Post(':mediaId/complete')
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
  ) {
    return this.media.complete(request.auth!.userId, organizationId, productId, mediaId);
  }

  @Patch(':mediaId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() body: unknown,
  ) {
    const input = mediaUpdateSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.media.update(request.auth!.userId, organizationId, productId, mediaId, input.data);
  }
}
