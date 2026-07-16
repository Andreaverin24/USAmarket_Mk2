import { z } from 'zod';

const stringList = z.array(z.string().trim().min(1).max(120)).max(40).default([]);

export const productInputSchema = z.object({
  title: z.string().trim().min(3).max(240),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(240),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20_000).optional(),
  productType: z.string().trim().min(2).max(120),
  categoryId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  condition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'RESTORED', 'AS_IS']),
  quantity: z.number().int().min(0).max(100).default(1),
  priceMinor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative().safe()])
    .transform(String),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default('USD'),
  width: z.coerce.number().positive().max(100_000).optional(),
  height: z.coerce.number().positive().max(100_000).optional(),
  depth: z.coerce.number().positive().max(100_000).optional(),
  dimensionUnit: z.enum(['in', 'cm']).default('in'),
  weight: z.coerce.number().positive().max(100_000).optional(),
  weightUnit: z.enum(['lb', 'kg']).default('lb'),
  materials: stringList,
  colors: stringList,
  styles: stringList,
  periods: stringList,
  maker: z.string().trim().max(240).optional(),
  countryOfOrigin: z.string().trim().max(120).optional(),
  estimatedYearFrom: z.number().int().min(1000).max(2200).optional(),
  estimatedYearTo: z.number().int().min(1000).max(2200).optional(),
  inventorySku: z.string().trim().min(1).max(120),
  pickupReadyDays: z.number().int().min(0).max(90).default(3),
  authenticityNotes: z.string().max(10_000).optional(),
  provenance: z.string().max(20_000).optional(),
  restorationNotes: z.string().max(20_000).optional(),
  seoTitle: z.string().max(240).optional(),
  seoDescription: z.string().max(500).optional(),
  featured: z.boolean().default(false),
  quantityAvailable: z.number().int().min(0).max(100_000).optional(),
  attributes: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        value: z.string().min(1).max(500),
      }),
    )
    .max(100)
    .default([]),
});

export const productUpdateSchema = productInputSchema
  .partial()
  .extend({ version: z.number().int().positive() });
export const moderationSchema = z.object({
  action: z.enum(['approve', 'publish', 'reject', 'archive']),
  note: z.string().max(2000).optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
