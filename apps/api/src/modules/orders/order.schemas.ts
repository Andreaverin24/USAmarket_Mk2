import { z } from 'zod';

const minorAmount = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative().safe()])
  .transform(String);

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
});

export const issueInvoiceSchema = z.object({
  version: z.number().int().positive(),
  externalReference: z.string().trim().min(1).max(120),
  shippingMinor: minorAmount.default('0'),
  dueAt: z.coerce.date().refine((value) => value.getTime() > Date.now(), {
    message: 'Invoice due date must be in the future',
  }),
});

export const orderVersionSchema = z.object({
  version: z.number().int().positive(),
});

export const cancelOrderSchema = orderVersionSchema.extend({
  reason: z.string().trim().min(1).max(2000).optional(),
});

export const orderQueueQuerySchema = z.object({
  status: z
    .enum([
      'AWAITING_SELLER_INVOICE',
      'INVOICE_SENT',
      'PAYMENT_VERIFICATION_PENDING',
      'PAYMENT_CONFIRMED',
      'READY_FOR_FULFILLMENT',
      'CANCELLED',
    ])
    .optional(),
  query: z.string().trim().min(1).max(120).optional(),
  attention: z.enum(['OVERDUE_INVOICE', 'PAYMENT_VERIFICATION']).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>;
export type OrderVersionInput = z.infer<typeof orderVersionSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderQueueQuery = z.infer<typeof orderQueueQuerySchema>;
