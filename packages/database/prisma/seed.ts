import { hashPassword } from '@atlas/auth';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const passwords = {
    admin: process.env.SEED_ADMIN_PASSWORD ?? 'AtlasAdmin123!',
    seller: process.env.SEED_SELLER_PASSWORD ?? 'AtlasSeller123!',
    driver: process.env.SEED_DRIVER_PASSWORD ?? 'AtlasDriver123!',
    buyer: process.env.SEED_BUYER_PASSWORD ?? 'DecorFlavorBuyer123!',
  };
  const permissions = [
    ['platform:admin', 'Full platform administration'],
    ['organization:members:read', 'Read members of an authorized organization'],
    ['organization:settings:write', 'Change organization settings'],
    ['driver:access', 'Access driver application shell'],
    ['catalog:read', 'Read tenant catalog'],
    ['catalog:write', 'Create and update tenant catalog'],
    ['catalog:submit', 'Submit tenant catalog products for moderation'],
    ['catalog:moderate', 'Moderate and publish catalog products'],
    ['storefront:write', 'Manage approved storefront presentation settings'],
    ['dealer:application:read', 'Read the tenant dealer application'],
    ['dealer:application:write', 'Create, edit and submit the tenant dealer application'],
    ['dealer:read', 'Read dealer profiles and applications for platform operations'],
    ['dealer:review', 'Review and decide dealer applications'],
    ['notifications:read', 'Read personal notifications'],
    ['orders:read', 'Read orders for an authorized seller or platform queue'],
    ['orders:write', 'Issue external invoices and move seller orders to fulfillment'],
    ['orders:verify', 'Read the platform payment-verification queue'],
    ['support:read', 'Read platform support cases'],
    ['support:manage', 'Move platform support cases through their operational states'],
  ] as const;
  for (const [code, description] of permissions) {
    await db.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
  }
  const platform = await db.organization.upsert({
    where: { slug: 'atlas-platform' },
    update: {},
    create: { slug: 'atlas-platform', name: 'Atlas Platform', type: 'PLATFORM' },
  });
  const seller = await db.organization.upsert({
    where: { slug: 'established-lines' },
    update: {},
    create: { slug: 'established-lines', name: 'Established Lines', type: 'SELLER' },
  });
  const other = await db.organization.upsert({
    where: { slug: 'second-seller' },
    update: {},
    create: { slug: 'second-seller', name: 'Second Seller', type: 'SELLER' },
  });
  const roles = await Promise.all([
    db.role.upsert({
      where: { code: 'PLATFORM_ADMIN' },
      update: {},
      create: { code: 'PLATFORM_ADMIN', name: 'PLATFORM_ADMIN', organizationId: platform.id },
    }),
    db.role.upsert({
      where: { code: 'established-lines-owner' },
      update: {},
      create: { code: 'established-lines-owner', name: 'OWNER', organizationId: seller.id },
    }),
    db.role.upsert({
      where: { code: 'atlas-driver' },
      update: {},
      create: { code: 'atlas-driver', name: 'Driver', organizationId: platform.id },
    }),
    db.role.upsert({
      where: { code: 'second-seller-owner' },
      update: {},
      create: {
        code: 'second-seller-owner',
        name: 'OWNER',
        organizationId: other.id,
      },
    }),
    db.role.upsert({
      where: { code: 'established-lines-staff' },
      update: {},
      create: {
        code: 'established-lines-staff',
        name: 'CATALOG_MANAGER',
        organizationId: seller.id,
      },
    }),
  ]);
  const [adminRole, sellerRole, driverRole, otherRole, staffRole] = roles;
  const permissionRows = await db.permission.findMany();
  const grants: Array<[string, string[]]> = [
    [adminRole.id, permissionRows.map((p) => p.id)],
    [
      sellerRole.id,
      permissionRows
        .filter(
          (p) =>
            p.code.startsWith('organization:') ||
            [
              'catalog:read',
              'catalog:write',
              'catalog:submit',
              'storefront:write',
              'dealer:application:read',
              'dealer:application:write',
              'notifications:read',
              'orders:read',
              'orders:write',
            ].includes(p.code),
        )
        .map((p) => p.id),
    ],
    [driverRole.id, permissionRows.filter((p) => p.code === 'driver:access').map((p) => p.id)],
    [
      otherRole.id,
      permissionRows
        .filter(
          (p) =>
            p.code.startsWith('organization:') ||
            [
              'catalog:read',
              'catalog:write',
              'catalog:submit',
              'storefront:write',
              'dealer:application:read',
              'dealer:application:write',
              'notifications:read',
              'orders:read',
              'orders:write',
            ].includes(p.code),
        )
        .map((p) => p.id),
    ],
    [
      staffRole.id,
      permissionRows
        .filter((p) =>
          ['catalog:read', 'catalog:write', 'catalog:submit', 'notifications:read'].includes(
            p.code,
          ),
        )
        .map((p) => p.id),
    ],
  ];
  for (const [roleId, ids] of grants)
    for (const permissionId of ids)
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
  const additionalRoles = [
    {
      code: 'PLATFORM_OPERATOR',
      name: 'PLATFORM_OPERATOR',
      organizationId: platform.id,
      permissions: ['dealer:read', 'dealer:review', 'notifications:read', 'orders:verify'],
    },
    {
      code: 'PLATFORM_MODERATOR',
      name: 'PLATFORM_MODERATOR',
      organizationId: platform.id,
      permissions: ['dealer:read', 'catalog:moderate', 'notifications:read'],
    },
    {
      code: 'PLATFORM_SUPPORT',
      name: 'PLATFORM_SUPPORT',
      organizationId: platform.id,
      permissions: [
        'dealer:read',
        'catalog:read',
        'notifications:read',
        'support:read',
        'support:manage',
      ],
    },
    ...[seller, other].flatMap((organization) =>
      [
        [
          'ADMIN',
          [
            'organization:members:read',
            'organization:settings:write',
            'dealer:application:read',
            'dealer:application:write',
            'catalog:read',
            'catalog:write',
            'catalog:submit',
            'storefront:write',
            'notifications:read',
            'orders:read',
            'orders:write',
          ],
        ],
        [
          'CATALOG_MANAGER',
          ['catalog:read', 'catalog:write', 'catalog:submit', 'notifications:read'],
        ],
        ['SALES_MANAGER', ['catalog:read', 'notifications:read', 'orders:read', 'orders:write']],
        [
          'FULFILLMENT_MANAGER',
          ['catalog:read', 'notifications:read', 'orders:read', 'orders:write'],
        ],
        ['VIEWER', ['catalog:read', 'notifications:read', 'orders:read']],
      ].map(([name, rolePermissions]) => ({
        code: `${organization.slug}:${name as string}`,
        name: name as string,
        organizationId: organization.id,
        permissions: rolePermissions as string[],
      })),
    ),
  ];
  for (const definition of additionalRoles) {
    const role = await db.role.upsert({
      where: { code: definition.code },
      update: { name: definition.name, organizationId: definition.organizationId },
      create: {
        code: definition.code,
        name: definition.name,
        organizationId: definition.organizationId,
      },
    });
    for (const permission of permissionRows.filter((row) =>
      definition.permissions.includes(row.code),
    ))
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
  }
  const users = await Promise.all([
    db.user.upsert({
      where: { email: 'admin@atlas.local' },
      update: {},
      create: {
        email: 'admin@atlas.local',
        displayName: 'Atlas Admin',
        passwordHash: await hashPassword(passwords.admin),
      },
    }),
    db.user.upsert({
      where: { email: 'seller@atlas.local' },
      update: {},
      create: {
        email: 'seller@atlas.local',
        displayName: 'Established Lines Owner',
        passwordHash: await hashPassword(passwords.seller),
      },
    }),
    db.user.upsert({
      where: { email: 'driver@atlas.local' },
      update: {},
      create: {
        email: 'driver@atlas.local',
        displayName: 'Atlas Driver',
        passwordHash: await hashPassword(passwords.driver),
      },
    }),
    db.user.upsert({
      where: { email: 'other-seller@atlas.local' },
      update: {},
      create: {
        email: 'other-seller@atlas.local',
        displayName: 'Other Seller',
        passwordHash: await hashPassword(passwords.seller),
      },
    }),
    db.user.upsert({
      where: { email: 'staff@atlas.local' },
      update: {},
      create: {
        email: 'staff@atlas.local',
        displayName: 'Established Lines Catalog Staff',
        passwordHash: await hashPassword(passwords.seller),
      },
    }),
    db.user.upsert({
      where: { email: 'applicant@atlas.local' },
      update: {},
      create: {
        email: 'applicant@atlas.local',
        displayName: 'Prospective Dealer',
        passwordHash: await hashPassword(passwords.seller),
      },
    }),
    db.user.upsert({
      where: { email: 'buyer@decorflavor.local' },
      update: {},
      create: {
        email: 'buyer@decorflavor.local',
        displayName: 'DecorFlavor Buyer',
        passwordHash: await hashPassword(passwords.buyer),
      },
    }),
  ]);
  const memberships: Array<[string, string, string]> = [
    [platform.id, users[0].id, adminRole.id],
    [seller.id, users[1].id, sellerRole.id],
    [platform.id, users[2].id, driverRole.id],
    [other.id, users[3].id, otherRole.id],
    [seller.id, users[4].id, staffRole.id],
  ];
  for (const [organizationId, userId, roleId] of memberships)
    await db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: { roleId, status: 'ACTIVE' },
      create: { organizationId, userId, roleId },
    });
  const storefront = await db.storefront.upsert({
    where: { organizationId: seller.id },
    update: {},
    create: { organizationId: seller.id, slug: 'established-lines', status: 'ACTIVE' },
  });
  await db.storefrontDomain.upsert({
    where: { hostname: 'established-lines.localhost' },
    update: {},
    create: {
      organizationId: seller.id,
      storefrontId: storefront.id,
      hostname: 'established-lines.localhost',
      isPrimary: true,
      verifiedAt: new Date(),
    },
  });
  const themeData = {
    preset: 'established-lines',
    primaryColor: '#1d241f',
    secondaryColor: '#eee9df',
    typographyPreset: 'editorial',
    heroTitle: 'Objects with a past. Interiors with a point of view.',
    heroSubtitle: 'Vintage, antique and contemporary furniture selected for enduring rooms.',
    about:
      'Established Lines presents collectible furniture and objects with context, condition and provenance.',
    contactEmail: 'design@establishedlines.local',
    seoTitle: 'Established Lines — Vintage and Designer Furniture',
    seoDescription: 'Curated vintage, antique and contemporary furniture from Established Lines.',
    navigation: [
      { label: 'New Arrivals', href: '/dealers/established-lines#new-arrivals' },
      { label: 'Vintage', href: '/dealers/established-lines#vintage' },
      { label: 'Antique', href: '/dealers/established-lines#antique' },
      { label: 'Contemporary', href: '/dealers/established-lines#contemporary' },
      { label: 'Originals', href: '/dealers/established-lines#originals' },
    ],
    policyPages: {
      shipping: {
        title: 'Delivery & Pickup',
        body: 'Delivery timing and handling are confirmed for each object before purchase. Local pickup is available by appointment.',
      },
      returns: {
        title: 'Returns',
        body: 'Because each object is unique, condition and return eligibility are confirmed before purchase.',
      },
      privacy: {
        title: 'Privacy',
        body: 'Contact details are used only to answer product and delivery enquiries.',
      },
    },
  } as const;
  await db.storefrontTheme.upsert({
    where: { storefrontId: storefront.id },
    update: themeData,
    create: {
      organizationId: seller.id,
      storefrontId: storefront.id,
      ...themeData,
    },
  });
  for (const [slug, title, featured, sortOrder] of [
    ['new-arrivals', 'New Arrivals', true, 0],
    ['vintage', 'Vintage', true, 1],
    ['antique', 'Antique', true, 2],
    ['contemporary', 'Contemporary', true, 3],
    ['established-lines-originals', 'Established Lines Originals', true, 4],
  ] as const)
    await db.collection.upsert({
      where: { organizationId_slug: { organizationId: seller.id, slug } },
      update: { title, featured, sortOrder },
      create: { organizationId: seller.id, slug, title, featured, sortOrder },
    });
  await db.redirectMapping.upsert({
    where: {
      organizationId_sourcePath: {
        organizationId: seller.id,
        sourcePath: '/products/italian-travertine-console',
      },
    },
    update: { targetPath: '/dealers/established-lines/products/italian-travertine-console' },
    create: {
      organizationId: seller.id,
      storefrontId: storefront.id,
      sourcePath: '/products/italian-travertine-console',
      targetPath: '/dealers/established-lines/products/italian-travertine-console',
    },
  });
  const furnitureCategory = await db.category.upsert({
    where: { slug: 'furniture' },
    update: {},
    create: {
      slug: 'furniture',
      name: 'Furniture',
      description: 'Collectible furniture and design.',
    },
  });
  const galleryLocation = await db.location.upsert({
    where: {
      organizationId_name: { organizationId: seller.id, name: 'Established Lines Gallery' },
    },
    update: {},
    create: {
      organizationId: seller.id,
      name: 'Established Lines Gallery',
      city: 'New York',
      region: 'NY',
      postalCode: '10013',
    },
  });
  await db.featureFlag.upsert({
    where: { organizationId_key: { organizationId: seller.id, key: 'foundation.ready' } },
    update: { enabled: true },
    create: { organizationId: seller.id, key: 'foundation.ready', enabled: true },
  });
  for (const organization of [seller, other])
    await db.dealerProfile.upsert({
      where: { organizationId: organization.id },
      update: { status: 'APPROVED', approvedAt: new Date() },
      create: {
        organizationId: organization.id,
        status: 'APPROVED',
        publicDealerName: organization.name,
        description: `${organization.name} is an approved THE GUILD dealer.`,
        specialties: ['Vintage furniture'],
        yearsInBusiness: 10,
        approvedAt: new Date(),
      },
    });
  await db.dealerProfile.update({
    where: { organizationId: seller.id },
    data: {
      publicDealerName: 'Established Lines',
      website: 'https://www.establishedlines.com/',
      description: 'Established Lines catalog is loaded from the local owner-authorized fixture.',
      specialties: ['Vintage furniture', 'Decor', 'Fine art'],
    },
  });
  // The former hard-coded fixtures are retained only for an explicit local legacy test run.
  // A normal seed is followed by the validated Established Lines local catalog import below.
  const sampleProducts = [
    {
      organization: seller,
      slug: 'italian-travertine-console',
      title: 'Italian Travertine Console',
      productType: 'Console',
      condition: 'EXCELLENT' as const,
      priceMinor: 485_000n,
      inventorySku: 'EL-CONSOLE-001',
      maker: 'Italian, 1970s',
      materials: ['Travertine'],
      colors: ['Ivory'],
      styles: ['Italian modern'],
      era: '1970s',
    },
    {
      organization: seller,
      slug: 'walnut-sculptural-lounge-chair',
      title: 'Walnut Sculptural Lounge Chair',
      productType: 'Lounge chair',
      condition: 'RESTORED' as const,
      priceMinor: 365_000n,
      inventorySku: 'EL-CHAIR-001',
      maker: 'American, 1960s',
      materials: ['Walnut', 'Bouclé'],
      colors: ['Walnut', 'Cream'],
      styles: ['Mid-century modern'],
      era: '1960s',
    },
    {
      organization: seller,
      slug: 'pair-of-brass-sconces',
      title: 'Pair of Brass Sconces',
      productType: 'Lighting',
      condition: 'GOOD' as const,
      priceMinor: 128_000n,
      inventorySku: 'EL-SCONCE-001',
      maker: 'French, 1950s',
      materials: ['Brass'],
      colors: ['Gold'],
      styles: ['French modern'],
      era: '1950s',
    },
    {
      organization: other,
      slug: 'oak-burl-cabinet',
      title: 'Oak Burl Cabinet',
      productType: 'Cabinet',
      condition: 'EXCELLENT' as const,
      priceMinor: 720_000n,
      inventorySku: 'SS-CABINET-001',
      maker: 'European, 1980s',
      materials: ['Oak burl'],
      colors: ['Honey'],
      styles: ['Postmodern'],
      era: '1980s',
    },
  ].filter(() => process.env.SEED_LEGACY_DEMO_PRODUCTS === 'true');
  for (const sample of sampleProducts) {
    const product = await db.product.upsert({
      where: { organizationId_slug: { organizationId: sample.organization.id, slug: sample.slug } },
      update: {
        title: sample.title,
        productType: sample.productType,
        condition: sample.condition,
        priceMinor: sample.priceMinor,
        maker: sample.maker,
        materials: sample.materials,
        colors: sample.colors,
        styles: sample.styles,
        era: sample.era,
      },
      create: {
        organizationId: sample.organization.id,
        categoryId: furnitureCategory.id,
        ...(sample.organization.id === seller.id ? { locationId: galleryLocation.id } : {}),
        title: sample.title,
        slug: sample.slug,
        shortDescription: `One unique ${sample.productType.toLowerCase()} from ${sample.maker}.`,
        description: `A singular ${sample.title} offered by an approved DecorFlavor seller.`,
        productType: sample.productType,
        condition: sample.condition,
        priceMinor: sample.priceMinor,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        inventorySku: sample.inventorySku,
        maker: sample.maker,
        materials: sample.materials,
        colors: sample.colors,
        styles: sample.styles,
        era: sample.era,
      },
    });
    await db.inventoryItem.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        organizationId: sample.organization.id,
        productId: product.id,
        quantityOnHand: 1,
        quantityAvailable: 1,
        status: 'AVAILABLE',
      },
    });
  }
  console.log(
    JSON.stringify({
      seeded: true,
      users: users.map((u) => u.email),
      organizations: [platform.slug, seller.slug, other.slug],
    }),
  );
}

main().finally(() => db.$disconnect());
