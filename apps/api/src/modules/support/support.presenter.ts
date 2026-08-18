import type { Prisma } from '@atlas/database';

export const supportCaseInclude = {
  order: {
    select: {
      id: true,
      sellerOrganizationId: true,
      productTitleSnapshot: true,
      status: true,
      seller: { select: { name: true } },
    },
  },
  buyer: { select: { id: true, displayName: true, email: true } },
  events: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      action: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SupportCaseInclude;

export type SupportCaseWithDetails = Prisma.SupportCaseGetPayload<{
  include: typeof supportCaseInclude;
}>;

export function presentSupportCase(supportCase: SupportCaseWithDetails) {
  const { sellerOrganizationId, ...order } = supportCase.order;
  void sellerOrganizationId;
  return { ...supportCase, order };
}
