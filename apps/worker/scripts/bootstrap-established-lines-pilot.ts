import { PrismaClient } from '@atlas/database';

const db = new PrismaClient();

try {
  const organization = await db.organization.upsert({
    where: { slug: 'established-lines' },
    update: { name: 'Established Lines', type: 'SELLER', status: 'ACTIVE' },
    create: {
      slug: 'established-lines',
      name: 'Established Lines',
      type: 'SELLER',
      status: 'ACTIVE',
    },
    select: { id: true, slug: true, name: true },
  });
  const role = await db.role.upsert({
    where: { code: 'established-lines-pilot-importer' },
    update: { name: 'Established Lines pilot importer', organizationId: organization.id },
    create: {
      code: 'established-lines-pilot-importer',
      name: 'Established Lines pilot importer',
      organizationId: organization.id,
    },
    select: { id: true },
  });
  const user = await db.user.upsert({
    where: { email: 'pilot-importer@establishedlines.invalid' },
    update: { status: 'SUSPENDED', displayName: 'Established Lines Pilot Importer' },
    create: {
      email: 'pilot-importer@establishedlines.invalid',
      passwordHash: 'disabled-pilot-account',
      displayName: 'Established Lines Pilot Importer',
      status: 'SUSPENDED',
    },
    select: { id: true, status: true },
  });
  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: organization.id, userId: user.id },
    },
    update: { roleId: role.id, status: 'ACTIVE' },
    create: {
      organizationId: organization.id,
      userId: user.id,
      roleId: role.id,
      status: 'ACTIVE',
    },
  });
  console.log(JSON.stringify({ organization, actorStatus: user.status }, null, 2));
} finally {
  await db.$disconnect();
}
