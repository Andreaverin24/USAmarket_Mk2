import { hashPassword } from '@atlas/auth';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const passwords = {
    admin: process.env.SEED_ADMIN_PASSWORD ?? 'AtlasAdmin123!',
    seller: process.env.SEED_SELLER_PASSWORD ?? 'AtlasSeller123!',
    driver: process.env.SEED_DRIVER_PASSWORD ?? 'AtlasDriver123!',
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
      where: { code: 'platform-admin' },
      update: {},
      create: { code: 'platform-admin', name: 'Platform Admin', organizationId: platform.id },
    }),
    db.role.upsert({
      where: { code: 'established-lines-owner' },
      update: {},
      create: { code: 'established-lines-owner', name: 'Seller Owner', organizationId: seller.id },
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
        name: 'Second Seller Owner',
        organizationId: other.id,
      },
    }),
    db.role.upsert({
      where: { code: 'established-lines-staff' },
      update: {},
      create: {
        code: 'established-lines-staff',
        name: 'Seller Catalog Staff',
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
            ['catalog:read', 'catalog:write', 'catalog:submit', 'storefront:write'].includes(
              p.code,
            ),
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
            ['catalog:read', 'catalog:write', 'catalog:submit', 'storefront:write'].includes(
              p.code,
            ),
        )
        .map((p) => p.id),
    ],
    [
      staffRole.id,
      permissionRows
        .filter((p) => ['catalog:read', 'catalog:write', 'catalog:submit'].includes(p.code))
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
  await db.category.upsert({
    where: { slug: 'furniture' },
    update: {},
    create: {
      slug: 'furniture',
      name: 'Furniture',
      description: 'Collectible furniture and design.',
    },
  });
  await db.location.upsert({
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
  console.log(
    JSON.stringify({
      seeded: true,
      users: users.map((u) => u.email),
      organizations: [platform.slug, seller.slug, other.slug],
    }),
  );
}

main().finally(() => db.$disconnect());
