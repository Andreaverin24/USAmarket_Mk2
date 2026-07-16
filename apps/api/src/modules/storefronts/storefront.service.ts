import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service.js';
import { appConfig } from '../../config.js';
import { presentProduct } from '../catalog/product.presenter.js';

const productInclude = {
  category: true,
  media: {
    orderBy: { sortOrder: 'asc' as const },
    include: { mediaVariants: { orderBy: [{ kind: 'asc' as const }, { format: 'asc' as const }] } },
  },
  inventory: true,
  attributes: { orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] },
  location: true,
  organization: { select: { id: true, name: true, slug: true } },
};

@Injectable()
export class StorefrontService {
  constructor(private readonly db: DatabaseService) {}

  async resolve(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
    const domain = await this.db.storefrontDomain.findUnique({
      where: { hostname: normalized, verifiedAt: { not: null } },
      include: {
        storefront: {
          include: {
            organization: { select: { id: true, slug: true, name: true, status: true } },
            theme: true,
          },
        },
      },
    });
    if (
      domain?.storefront.status === 'ACTIVE' &&
      domain.storefront.organization.status === 'ACTIVE'
    )
      return domain.storefront;
    const suffix = `.${appConfig().PLATFORM_DOMAIN.toLowerCase()}`;
    if (!normalized.endsWith(suffix)) throw new NotFoundException('Storefront not found');
    const slug = normalized.slice(0, -suffix.length);
    if (!slug || slug.includes('.')) throw new NotFoundException('Storefront not found');
    return this.bySlug(slug);
  }

  async bySlug(slug: string) {
    const storefront = await this.db.storefront.findFirst({
      where: { slug, status: 'ACTIVE', organization: { status: 'ACTIVE' } },
      include: {
        organization: { select: { id: true, slug: true, name: true } },
        theme: true,
        domains: true,
        redirects: true,
      },
    });
    if (!storefront) throw new NotFoundException('Storefront not found');
    return storefront;
  }

  async home(slug: string) {
    const storefront = await this.bySlug(slug);
    const [products, collections] = await Promise.all([
      this.db.product.findMany({
        where: { organizationId: storefront.organizationId, status: 'PUBLISHED' },
        include: productInclude,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
        take: 24,
      }),
      this.db.collection.findMany({
        where: { organizationId: storefront.organizationId },
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
        include: {
          products: {
            where: {
              product: { status: 'PUBLISHED', organizationId: storefront.organizationId },
            },
            take: 8,
            orderBy: { sortOrder: 'asc' },
            include: { product: { include: productInclude } },
          },
        },
      }),
    ]);
    return {
      storefront,
      products: products.map(presentProduct),
      collections: collections.map((collection) => ({
        ...collection,
        products: collection.products.map((entry) => presentProduct(entry.product)),
      })),
    };
  }

  product(slug: string, productSlug: string) {
    return this.db.storefront
      .findFirst({
        where: { slug, status: 'ACTIVE' },
        select: { organization: { select: { slug: true } } },
      })
      .then((storefront) => {
        if (!storefront) throw new NotFoundException('Storefront not found');
        return this.db.product
          .findFirst({
            where: {
              slug: productSlug,
              status: 'PUBLISHED',
              organization: { slug: storefront.organization.slug, status: 'ACTIVE' },
            },
            include: productInclude,
          })
          .then((product) => {
            if (!product) throw new NotFoundException('Product not found');
            return presentProduct(product);
          });
      });
  }

  async redirect(slug: string, sourcePath: string) {
    const storefront = await this.bySlug(slug);
    const redirect = await this.db.redirectMapping.findUnique({
      where: {
        organizationId_sourcePath: { organizationId: storefront.organizationId, sourcePath },
      },
    });
    if (!redirect) throw new NotFoundException('Redirect not found');
    return redirect;
  }

  async policy(slug: string, policySlug: string) {
    const storefront = await this.bySlug(slug);
    const pages = storefront.theme?.policyPages;
    if (!pages || typeof pages !== 'object' || Array.isArray(pages))
      throw new NotFoundException('Policy not found');
    const value = (pages as Record<string, unknown>)[policySlug];
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new NotFoundException('Policy not found');
    const policy = value as Record<string, unknown>;
    if (typeof policy.title !== 'string' || typeof policy.body !== 'string')
      throw new NotFoundException('Policy not found');
    return { slug: policySlug, title: policy.title, body: policy.body, storefront };
  }
}
