import type { CollectionSlug, Payload } from "payload";
import { Pool } from "pg";

export type CollectionFieldConfigLike = {
  blocks?: CollectionBlockConfigLike[];
  fields?: CollectionFieldConfigLike[];
  hasMany?: boolean;
  name?: string;
  relationTo?: string | string[];
  required?: boolean;
  tabs?: CollectionTabConfigLike[];
  type?: string;
};

export type CollectionBlockConfigLike = {
  fields?: CollectionFieldConfigLike[];
  slug?: string;
};

export type CollectionTabConfigLike = {
  fields?: CollectionFieldConfigLike[];
  name?: string;
};

export type PayloadSyncCollectionMetadata = {
  slug: CollectionSlug;
  upload: boolean;
  auth: boolean;
  versions: boolean;
  fields: CollectionFieldConfigLike[];
};

export type SyncRemotePayloadOptions = {
  collections: string[];
  priorityCollections?: string[];
  limit?: number;
  logger?: Pick<Console, "error" | "log" | "warn">;
  localPayload: Payload;
  remote: {
    apiKey: string;
    apiKeyCollection: string;
    baseURL: string;
  };
};

export type CollectionDocumentsResponse = {
  docs: Array<Record<string, unknown>>;
  hasNextPage: boolean;
  limit: number;
  page: number;
  totalDocs: number;
  totalPages: number;
};

export type SyncState = {
  existingAuthDocKeys: Set<string>;
  idLookupCache: Map<string, number | string>;
  pool: Pool;
};
