import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service.js';

@ApiTags('storefronts')
@Controller('storefronts')
export class StorefrontController {
  constructor(private readonly storefronts: StorefrontService) {}
  @Get('resolve') resolve(@Query('hostname') hostname: string) {
    return this.storefronts.resolve(hostname);
  }
  @Get(':slug') home(@Param('slug') slug: string) {
    return this.storefronts.home(slug);
  }
  @Get(':slug/products/:productSlug') product(
    @Param('slug') slug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.storefronts.product(slug, productSlug);
  }
  @Get(':slug/policies/:policySlug') policy(
    @Param('slug') slug: string,
    @Param('policySlug') policySlug: string,
  ) {
    return this.storefronts.policy(slug, policySlug);
  }
  @Get(':slug/redirect') redirect(@Param('slug') slug: string, @Query('path') path: string) {
    return this.storefronts.redirect(slug, path);
  }
}
