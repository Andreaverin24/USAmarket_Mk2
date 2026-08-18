import type { ProductCondition } from '@atlas/database';

export type NormalizedSourceKind =
  | 'WEBSITE'
  | 'MARKETPLACE'
  | 'AUCTION_HOUSE'
  | 'API'
  | 'CSV'
  | 'MANUAL';

export type NormalizedListingAvailability =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'SOLD'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export type NormalizedListingSaleType = 'FIXED_PRICE' | 'PRICE_ON_REQUEST' | 'AUCTION' | 'UNKNOWN';

export interface NormalizedSourceDescriptor {
  key: string;
  name: string;
  kind: NormalizedSourceKind;
  baseUrl?: string;
  adapterKey: string;
  adapterVersion: string;
}

export interface NormalizedExternalListing {
  externalId: string;
  canonicalUrl?: string;
  sourceSku?: string;
  title?: string;
  saleType: NormalizedListingSaleType;
  availability: NormalizedListingAvailability;
  priceMinor?: string;
  currency?: string;
  estimateLowMinor?: string;
  estimateHighMinor?: string;
  auctionSaleName?: string;
  auctionLotNumber?: string;
  auctionStartsAt?: string;
  auctionEndsAt?: string;
}

export interface ExtractionProvenance {
  source: string;
  confidence: number;
  rawValue?: unknown;
}

/**
 * Source-independent contract written by every adapter. Price fields are integer
 * minor units encoded as strings so JSON and PostgreSQL BIGINT stay lossless.
 */
export interface NormalizedProductDraft {
  source?: NormalizedSourceDescriptor;
  listing?: NormalizedExternalListing;
  externalSource?: string;
  sourceUrl?: string;
  externalId?: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  productType: string;
  sku: string;
  priceMinor: string;
  currency?: string;
  condition: ProductCondition;
  conditionDescription?: string;
  pieceCount?: number;
  width?: string;
  height?: string;
  depth?: string;
  diameter?: string;
  seatHeight?: string;
  dimensionUnit?: string;
  weight?: string;
  weightUnit?: string;
  materials: string[];
  colors: string[];
  styles: string[];
  era?: string;
  periods?: string[];
  maker?: string;
  designer?: string;
  manufacturer?: string;
  modelName?: string;
  medium?: string;
  countryOfOrigin?: string;
  estimatedYearFrom?: number;
  estimatedYearTo?: number;
  authenticityNotes?: string;
  provenanceText?: string;
  restorationNotes?: string;
  signedDetails?: string;
  editionDetails?: string;
  literature?: string;
  exhibitionHistory?: string;
  imageUrl?: string;
  imageUrls?: string[];
  attributes?: Record<string, string[]>;
  provenance?: Record<string, ExtractionProvenance>;
  captureMethod?: 'http' | 'browser' | 'csv' | 'api' | 'manual';
}

export type NormalizedShopifyRow = NormalizedProductDraft;
