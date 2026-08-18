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
import { SessionGuard } from '../../common/session.guard.js';
import { CsrfGuard } from '../../common/csrf.guard.js';
import { CatalogService } from './catalog.service.js';
import {
  moderationCommentSchema,
  moderationSchema,
  productInputSchema,
  productUpdateSchema,
} from './catalog.schemas.js';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog/categories') categories() {
    return this.catalog.categories();
  }
  @Get('catalog/categories/:slug') category(@Param('slug') slug: string) {
    return this.catalog.category(slug);
  }
  @Get('catalog/facets') facets() {
    return this.catalog.facets();
  }
  @Get('catalog/spotlight') spotlight(@Query('limit') limit?: string) {
    return this.catalog.spotlightProducts(limit ? Number(limit) : undefined);
  }
  @Get('catalog/sitemap') sitemap() {
    return this.catalog.sitemap();
  }
  @Get('catalog/products') products(@Query() query: Record<string, string | undefined>) {
    return this.catalog.publicProducts({
      ...(query.q ? { q: query.q } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.seller ? { seller: query.seller } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.minPrice ? { minPrice: query.minPrice } : {}),
      ...(query.maxPrice ? { maxPrice: query.maxPrice } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
      ...(query.style ? { style: query.style } : {}),
      ...(query.era ? { era: query.era } : {}),
      ...(query.material ? { material: query.material } : {}),
      ...(query.color ? { color: query.color } : {}),
      ...(query.minWidth ? { minWidth: query.minWidth } : {}),
      ...(query.maxWidth ? { maxWidth: query.maxWidth } : {}),
      ...(query.availability ? { availability: query.availability } : {}),
      ...(query.location ? { location: query.location } : {}),
      ...(query.page ? { page: Number(query.page) } : {}),
      ...(query.pageSize ? { pageSize: Number(query.pageSize) } : {}),
    });
  }

  @Post('organizations/:organizationId/catalog/products/:productId/archive')
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.catalog.archive(
      request.auth!.userId,
      organizationId,
      productId,
      request.correlationId,
    );
  }
  @Get('catalog/products/:slug') product(@Param('slug') slug: string) {
    return this.catalog.publicProduct(slug);
  }

  @Get('organizations/:organizationId/catalog/products')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  sellerProducts(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.catalog.sellerProducts(request.auth!.userId, organizationId);
  }

  @Get('organizations/:organizationId/catalog/categories')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  sellerCategories(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.catalog.sellerCategories(request.auth!.userId, organizationId);
  }

  @Get('organizations/:organizationId/catalog/products/:productId')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  sellerProduct(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.catalog.sellerProduct(request.auth!.userId, organizationId, productId);
  }

  @Post('organizations/:organizationId/catalog/products')
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() body: unknown,
  ) {
    const input = productInputSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.catalog.create(
      request.auth!.userId,
      organizationId,
      input.data,
      request.correlationId,
    );
  }

  @Patch('organizations/:organizationId/catalog/products/:productId')
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  update(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() body: unknown,
  ) {
    const input = productUpdateSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.catalog.update(
      request.auth!.userId,
      organizationId,
      productId,
      input.data,
      request.correlationId,
    );
  }

  @Post('organizations/:organizationId/catalog/products/:productId/submit')
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.catalog.submit(
      request.auth!.userId,
      organizationId,
      productId,
      request.correlationId,
    );
  }

  @Get('organizations/:organizationId/catalog/products/:productId/moderation')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  moderationHistory(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.catalog.moderationHistory(request.auth!.userId, organizationId, productId);
  }

  @Get('admin/product-moderation')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  moderationQueue(@Req() request: AuthenticatedRequest) {
    return this.catalog.moderationQueue(request.auth!.userId);
  }

  @Post('admin/product-moderation/:reviewId/comments')
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  addModerationComment(
    @Req() request: AuthenticatedRequest,
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: unknown,
  ) {
    const input = moderationCommentSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.catalog.addModerationComment(
      request.auth!.userId,
      reviewId,
      input.data.body,
      input.data.visibility,
      request.correlationId,
    );
  }

  @Post('organizations/:organizationId/catalog/products/:productId/moderation')
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  moderate(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() body: unknown,
  ) {
    const input = moderationSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.catalog.moderate(
      request.auth!.userId,
      organizationId,
      productId,
      input.data.action,
      input.data.note,
      request.correlationId,
    );
  }
}
