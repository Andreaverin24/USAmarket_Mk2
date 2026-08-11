import { z } from 'zod';

const businessAddressSchema = z.object({
  line1: z.string().trim().min(3).max(240),
  line2: z.string().trim().max(240).optional(),
  city: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(3).max(20),
  countryCode: z.literal('US').default('US'),
});

const documentSchema = z.object({
  storageKey: z.string().trim().min(1).max(1000),
  filename: z.string().trim().min(1).max(500),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const dealerApplicationFieldsSchema = z.object({
  legalBusinessName: z.string().trim().min(2).max(240),
  publicDealerName: z.string().trim().min(2).max(200),
  businessType: z.string().trim().min(2).max(120),
  website: z.string().url().max(1000).optional(),
  email: z.string().email().max(320),
  phone: z.string().trim().min(7).max(60),
  businessAddress: businessAddressSchema,
  contactPerson: z.string().trim().min(2).max(200),
  companyDescription: z.string().trim().min(40).max(20_000),
  specialties: z.array(z.string().trim().min(1).max(120)).min(1).max(40),
  yearsInBusiness: z.number().int().min(0).max(200),
  supportingDocuments: z.array(documentSchema).max(20).default([]),
});

export const createDealerApplicationSchema = dealerApplicationFieldsSchema.extend({
  organizationName: z.string().trim().min(2).max(200),
  organizationSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
});

export const updateDealerApplicationSchema = dealerApplicationFieldsSchema
  .partial()
  .extend({ version: z.number().int().positive() });

export const submitDealerApplicationSchema = z.object({
  version: z.number().int().positive(),
});

export const dealerReviewSchema = z.object({
  action: z.enum(['start_review', 'request_changes', 'approve', 'reject', 'suspend']),
  reason: z.string().trim().max(4000).optional(),
  internalNote: z.string().trim().max(4000).optional(),
  version: z.number().int().positive(),
});

export type CreateDealerApplication = z.infer<typeof createDealerApplicationSchema>;
export type UpdateDealerApplication = z.infer<typeof updateDealerApplicationSchema>;
export type DealerReviewInput = z.infer<typeof dealerReviewSchema>;
