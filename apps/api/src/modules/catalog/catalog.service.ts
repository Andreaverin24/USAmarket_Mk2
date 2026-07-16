import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProductCondition } from '@atlas/database';
import { DatabaseService } from '../../common/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TenantService } from '../tenancy/tenant.service.js';
import type { ProductInput, ProductUpdate } from './catalog.schemas.js';
import { presentProduct } from './product.presenter.js';
import { PostgresSearchProvider } from './search.provider.js';
import { transitionProductStatus, type ProductAction } from './product-state-machine.js';

const include = {
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
export class CatalogService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
    private readonly search: PostgresSearchProvider,
  ) {}

  categories() {
    return this.db.category.findMany({
      where: { products: { some: { status: 'PUBLISHED', organization: { status: 'ACTIVE' } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { status: 'PUBLISHED' } } } } },
    });
  }

  async category(slug: string) {
    const category = await this.db.category.findFirst({
      where: { slug, products: { some: { status: 'PUBLISHED' } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async sellerCategories(userId: string, organizationId: string) {
    await this.tenants.resolve(userId, organizationId, 'catalog:read');
    return this.db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async facets() {
    const products = await this.db.product.findMany({
      where: { status: 'PUBLISHED', organization: { status: 'ACTIVE' } },
      select: {
        materials: true,
        colors: true,
        styles: true,
        condition: true,
        location: { select: { city: true } },
      },
    });
    const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
    return {
      materials: unique(products.flatMap((product) => product.materials)),
      colors: unique(products.flatMap((product) => product.colors)),
      styles: unique(products.flatMap((product) => product.styles)),
      conditions: unique(products.map((product) => product.condition)),
      locations: unique(
        products.flatMap((product) => (product.location ? [product.location.city] : [])),
      ),
    };
  }

  async sitemap() {
    const [products, categories, sellers] = await Promise.all([
      this.db.product.findMany({
        where: { status: 'PUBLISHED', organization: { status: 'ACTIVE' } },
        select: { slug: true, updatedAt: true, organization: { select: { slug: true } } },
      }),
      this.db.category.findMany({
        where: { products: { some: { status: 'PUBLISHED' } } },
        select: { slug: true, updatedAt: true },
      }),
      this.db.organization.findMany({
        where: { status: 'ACTIVE', type: 'SELLER', products: { some: { status: 'PUBLISHED' } } },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    return { products, categories, sellers };
  }

  async publicProducts(filters: {
    q?: string;
    category?: string;
    seller?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    style?: string;
    material?: string;
    color?: string;
    minWidth?: string;
    maxWidth?: string;
    availability?: string;
    location?: string;
    page?: number;
    pageSize?: number;
  }) {
    const ids = filters.q ? await this.search.productIds(filters.q) : undefined;
    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
      organization: { status: 'ACTIVE', ...(filters.seller ? { slug: filters.seller } : {}) },
      ...(ids ? { id: { in: ids } } : {}),
      ...(filters.category ? { category: { slug: filters.category } } : {}),
      ...(filters.condition ? { condition: filters.condition as ProductCondition } : {}),
      ...(filters.style ? { styles: { has: filters.style } } : {}),
      ...(filters.material ? { materials: { has: filters.material } } : {}),
      ...(filters.color ? { colors: { has: filters.color } } : {}),
      ...(filters.minWidth || filters.maxWidth
        ? {
            width: {
              ...(filters.minWidth ? { gte: filters.minWidth } : {}),
              ...(filters.maxWidth ? { lte: filters.maxWidth } : {}),
            },
          }
        : {}),
      ...(filters.availability === 'available'
        ? { inventory: { status: 'AVAILABLE', quantityAvailable: { gt: 0 } } }
        : {}),
      ...(filters.location
        ? { location: { city: { equals: filters.location, mode: 'insensitive' } } }
        : {}),
      ...(filters.minPrice || filters.maxPrice
        ? {
            priceMinor: {
              ...(filters.minPrice ? { gte: BigInt(filters.minPrice) } : {}),
              ...(filters.maxPrice ? { lte: BigInt(filters.maxPrice) } : {}),
            },
          }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      filters.sort === 'price_asc'
        ? [{ priceMinor: 'asc' }]
        : filters.sort === 'price_desc'
          ? [{ priceMinor: 'desc' }]
          : filters.sort === 'featured'
            ? [{ featured: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }]
            : [{ publishedAt: 'desc' }, { id: 'asc' }];
    const pageSize = Math.min(Math.max(filters.pageSize ?? 24, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.product.count({ where }),
    ]);
    return {
      items: products.map(presentProduct),
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    };
  }

  async publicProduct(slug: string, organizationSlug?: string) {
    const product = await this.db.product.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        ...(organizationSlug ? { organization: { slug: organizationSlug } } : {}),
      },
      include,
    });
    if (!product) throw new NotFoundException('Product not found');
    return presentProduct(product);
  }

  async sellerProducts(userId: string, organizationId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:read');
    const products = await this.db.product.findMany({
      where: { organizationId: tenant.organizationId },
      include,
      orderBy: { updatedAt: 'desc' },
    });
    return products.map(presentProduct);
  }

  async sellerProduct(userId: string, organizationId: string, productId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:read');
    const product = await this.db.product.findFirst({
      where: { id: productId, organizationId: tenant.organizationId },
      include,
    });
    if (!product) throw new NotFoundException('Product not found');
    return presentProduct(product);
  }

  async create(userId: string, organizationId: string, input: ProductInput, correlationId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    await this.assertReferences(tenant.organizationId, input.categoryId, input.locationId);
    const product = await this.db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: this.productData(tenant.organizationId, input),
      });
      await tx.inventoryItem.create({
        data: {
          organizationId: tenant.organizationId,
          productId: created.id,
          quantityOnHand: input.quantity,
          quantityAvailable: input.quantityAvailable ?? input.quantity,
          status: (input.quantityAvailable ?? input.quantity) > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
        },
      });
      if (input.attributes.length)
        await tx.productAttribute.createMany({
          data: input.attributes.map((attribute, index) => ({
            organizationId: tenant.organizationId,
            productId: created.id,
            name: attribute.name.trim().toLowerCase(),
            value: attribute.value.trim(),
            normalizedValue: this.normalizeFacet(attribute.value),
            sortOrder: index,
          })),
          skipDuplicates: true,
        });
      await tx.auditLog.create({
        data: this.audit.entry({
          organizationId: tenant.organizationId,
          actorUserId: userId,
          action: 'catalog.product.created',
          resourceType: 'Product',
          resourceId: created.id,
          correlationId,
        }),
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'Product',
          aggregateId: created.id,
          eventType: 'catalog.product.created',
          payload: { productId: created.id },
        },
      });
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include });
    });
    return presentProduct(product);
  }

  async update(
    userId: string,
    organizationId: string,
    productId: string,
    input: ProductUpdate,
    correlationId: string,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    const owned = await this.db.product.findFirst({
      where: { id: productId, organizationId: tenant.organizationId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Product not found');
    if (input.categoryId)
      await this.assertReferences(tenant.organizationId, input.categoryId, input.locationId);
    const { version, attributes, quantityAvailable, ...changes } = input;
    const updated = await this.db.$transaction(async (tx) => {
      const data = Object.fromEntries(
        Object.entries(changes).filter((entry) => entry[1] !== undefined),
      ) as Prisma.ProductUncheckedUpdateManyInput;
      if (changes.priceMinor) data.priceMinor = BigInt(changes.priceMinor);
      data.version = { increment: 1 };
      const result = await tx.product.updateMany({
        where: {
          id: productId,
          organizationId: tenant.organizationId,
          version,
          status: { in: ['DRAFT', 'NEEDS_CHANGES', 'APPROVED', 'PUBLISHED'] },
        },
        data,
      });
      if (!result.count) throw new ConflictException('Product version or state changed');
      if (quantityAvailable !== undefined) {
        await tx.inventoryItem.updateMany({
          where: { productId, organizationId: tenant.organizationId },
          data: {
            quantityAvailable,
            status: quantityAvailable > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
            version: { increment: 1 },
          },
        });
      }
      if (attributes !== undefined) {
        await tx.productAttribute.deleteMany({
          where: { productId, organizationId: tenant.organizationId },
        });
        if (attributes.length)
          await tx.productAttribute.createMany({
            data: attributes.map((attribute, index) => ({
              organizationId: tenant.organizationId,
              productId,
              name: attribute.name.trim().toLowerCase(),
              value: attribute.value.trim(),
              normalizedValue: this.normalizeFacet(attribute.value),
              sortOrder: index,
            })),
            skipDuplicates: true,
          });
      }
      const product = await tx.product.findFirstOrThrow({
        where: { id: productId, organizationId: tenant.organizationId },
        include,
      });
      await tx.auditLog.create({
        data: this.audit.entry({
          organizationId: tenant.organizationId,
          actorUserId: userId,
          action: 'catalog.product.updated',
          resourceType: 'Product',
          resourceId: product.id,
          correlationId,
          metadata: { version: product.version },
        }),
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'Product',
          aggregateId: product.id,
          eventType: 'catalog.product.updated',
          payload: { productId: product.id, version: product.version },
        },
      });
      return product;
    });
    return presentProduct(updated);
  }

  async submit(userId: string, organizationId: string, productId: string, correlationId: string) {
    return this.transition(
      userId,
      organizationId,
      productId,
      'submit',
      'catalog.product.submitted',
      'catalog:submit',
      correlationId,
    );
  }

  async moderate(
    userId: string,
    organizationId: string,
    productId: string,
    action: 'approve' | 'publish' | 'reject' | 'archive',
    note: string | undefined,
    correlationId: string,
  ) {
    return this.transition(
      userId,
      organizationId,
      productId,
      action,
      `catalog.product.${action}`,
      'catalog:moderate',
      correlationId,
      note,
    );
  }

  archive(userId: string, organizationId: string, productId: string, correlationId: string) {
    return this.transition(
      userId,
      organizationId,
      productId,
      'archive',
      'catalog.product.archive',
      'catalog:write',
      correlationId,
    );
  }

  private async transition(
    userId: string,
    organizationId: string,
    productId: string,
    action: ProductAction,
    eventType: string,
    permission: string,
    correlationId: string,
    note?: string,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, permission);
    const product = await this.db.$transaction(async (tx) => {
      const before = await tx.product.findFirst({
        where: { id: productId, organizationId: tenant.organizationId },
        include: { media: true, inventory: true },
      });
      if (!before) throw new NotFoundException('Product not found');
      let to;
      try {
        to = transitionProductStatus(before.status, action, note);
      } catch (error) {
        throw new ConflictException(error instanceof Error ? error.message : 'Invalid transition');
      }
      if (action === 'publish') {
        const readyImages = before.media.filter(
          (media) => media.type === 'IMAGE' && media.processingStatus === 'READY',
        );
        if (readyImages.length < 4)
          throw new ConflictException('At least four processed images are required to publish');
        if (!before.inventory || before.inventory.quantityAvailable < 1)
          throw new ConflictException('Available inventory is required to publish');
      }
      const result = await tx.product.updateMany({
        where: {
          id: productId,
          organizationId: tenant.organizationId,
          status: before.status,
          version: before.version,
        },
        data: {
          status: to,
          moderationNote: action === 'reject' ? note!.trim() : null,
          ...(to === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
          ...(to === 'APPROVED' ? { approvedAt: new Date() } : {}),
          ...(to === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
          version: { increment: 1 },
        },
      });
      if (!result.count) throw new ConflictException('Invalid product state transition');
      const current = await tx.product.findUniqueOrThrow({ where: { id: productId }, include });
      await tx.auditLog.create({
        data: this.audit.entry({
          organizationId: tenant.organizationId,
          actorUserId: userId,
          action: eventType,
          resourceType: 'Product',
          resourceId: productId,
          correlationId,
          before: { status: before.status, version: before.version },
          after: { status: to, version: current.version },
          ...(note ? { metadata: { note } } : {}),
        }),
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'Product',
          aggregateId: productId,
          eventType,
          payload: { productId, status: to },
        },
      });
      return current;
    });
    return presentProduct(product);
  }

  private productData(
    organizationId: string,
    input: ProductInput,
  ): Prisma.ProductUncheckedCreateInput {
    const product = { ...input } as Partial<ProductInput>;
    delete product.attributes;
    delete product.quantityAvailable;
    return {
      ...(Object.fromEntries(
        Object.entries(product).filter((entry) => entry[1] !== undefined),
      ) as unknown as Omit<Prisma.ProductUncheckedCreateInput, 'organizationId' | 'priceMinor'>),
      organizationId,
      priceMinor: BigInt(input.priceMinor),
    };
  }

  private normalizeFacet(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async assertReferences(organizationId: string, categoryId: string, locationId?: string) {
    const [category, location] = await Promise.all([
      this.db.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
      locationId
        ? this.db.location.findFirst({
            where: { id: locationId, organizationId },
            select: { id: true },
          })
        : Promise.resolve({ id: 'none' }),
    ]);
    if (!category || !location) throw new NotFoundException('Catalog reference not found');
  }
}
