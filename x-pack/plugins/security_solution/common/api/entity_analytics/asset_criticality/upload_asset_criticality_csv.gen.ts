/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Asset Criticality CSV Upload Schema
 *   version: 1
 */

import { z } from '@kbn/zod';

export type AssetCriticalityCsvUploadErrorItem = z.infer<typeof AssetCriticalityCsvUploadErrorItem>;
export const AssetCriticalityCsvUploadErrorItem = z.object({
  message: z.string(),
  index: z.number().int(),
});

export type AssetCriticalityCsvUploadStats = z.infer<typeof AssetCriticalityCsvUploadStats>;
export const AssetCriticalityCsvUploadStats = z.object({
  successful: z.number().int(),
  failed: z.number().int(),
  total: z.number().int(),
});

export type InternalUploadAssetCriticalityRecordsResponse = z.infer<
  typeof InternalUploadAssetCriticalityRecordsResponse
>;
export const InternalUploadAssetCriticalityRecordsResponse = z.object({
  errors: z.array(AssetCriticalityCsvUploadErrorItem),
  stats: AssetCriticalityCsvUploadStats,
});

export type UploadAssetCriticalityRecordsResponse = z.infer<
  typeof UploadAssetCriticalityRecordsResponse
>;
export const UploadAssetCriticalityRecordsResponse = z.object({
  errors: z.array(AssetCriticalityCsvUploadErrorItem),
  stats: AssetCriticalityCsvUploadStats,
});
