import { z } from 'zod';

export const supportCaseCategorySchema = z.enum([
  'ORDER_STATUS',
  'EXTERNAL_INVOICE',
  'FULFILLMENT',
  'OTHER',
]);

export const createSupportCaseSchema = z.object({
  orderId: z.string().uuid(),
  category: supportCaseCategorySchema,
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(2000),
});

export const updateSupportCaseSchema = z
  .object({
    version: z.number().int().positive(),
    action: z.enum(['start-review', 'resolve']),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .superRefine((input, context) => {
    if (input.action === 'resolve' && !input.note)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A buyer-visible resolution note is required when resolving a support case',
        path: ['note'],
      });
  });

export const supportCaseQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']).optional(),
});

export type CreateSupportCaseInput = z.infer<typeof createSupportCaseSchema>;
export type UpdateSupportCaseInput = z.infer<typeof updateSupportCaseSchema>;
export type SupportCaseQuery = z.infer<typeof supportCaseQuerySchema>;
