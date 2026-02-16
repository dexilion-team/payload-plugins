import type { CollectionSlug, SanitizedConfig } from "payload";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { fetchJSON, getRemoteHeaders } from "./comms";
import type {
  CollectionDocumentsResponse,
  CollectionFieldConfigLike,
  PayloadSyncCollectionMetadata,
  SyncRemotePayloadOptions,
  SyncState,
} from "./types";
import { assertCollectionsExistAndEmpty, isUploadCollection } from "./utils";

const DEFAULT_LIMIT = 10;
const GENERATED_UPLOAD_FIELDS = new Set([
  "filename",
  "filesize",
  "focalX",
  "focalY",
  "height",
  "mimeType",
  "sizes",
  "thumbnailURL",
  "url",
  "width",
]);
const STRIP_FIELDS = new Set(["sessions"]);

let mediaFilenameCache: null | Set<string> = null;
let mediaFilenameCachePromise: null | Promise<Set<string>> = null;

const loadMediaFilenameCache = async (): Promise<Set<string>> => {
  if (mediaFilenameCache) {
    return mediaFilenameCache;
  }

  if (!mediaFilenameCachePromise) {
    mediaFilenameCachePromise = (async () => {
      const mediaDirectoryPath = path.resolve(process.cwd(), "media");

      try {
        const entries = await readdir(mediaDirectoryPath, {
          withFileTypes: true,
        });

        return new Set(
          entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
        );
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return new Set<string>();
        }

        throw error;
      }
    })();
  }

  mediaFilenameCache = await mediaFilenameCachePromise;
  return mediaFilenameCache;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asIDValue = (value: unknown): null | number | string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
};

const stringifyID = (value: number | string): string => {
  return String(value);
};

const toSyncedIDType = (
  value: string,
  typeHint: null | number | string,
): number | string => {
  if (typeof typeHint === "number" && /^-?\d+$/.test(value)) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
  }

  return value;
};

const getSyncCacheKey = (
  collection: string,
  remoteID: number | string,
): string => `${collection}:${stringifyID(remoteID)}`;

const createSyncState = async (): Promise<SyncState> => {
  const connectionString = process.env.DATABASE_URI;

  if (!connectionString) {
    throw new Error(
      "[@dexilion/payload-sync] Missing DATABASE_URI environment variable.",
    );
  }

  const pool = new Pool({ connectionString });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "__sync" (
      collection TEXT NOT NULL,
      remote_id TEXT NOT NULL,
      local_id TEXT NOT NULL,
      PRIMARY KEY (collection, remote_id)
    );
  `);

  return {
    existingAuthDocKeys: new Set(),
    idLookupCache: new Map(),
    pool,
  };
};

const recordSyncID = async (
  syncState: SyncState,
  collection: string,
  remoteID: number | string,
  localID: number | string,
): Promise<void> => {
  await syncState.pool.query(
    `
      INSERT INTO "__sync" (collection, remote_id, local_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (collection, remote_id)
      DO UPDATE SET local_id = EXCLUDED.local_id
    `,
    [collection, stringifyID(remoteID), stringifyID(localID)],
  );

  syncState.idLookupCache.set(
    getSyncCacheKey(collection, remoteID),
    toSyncedIDType(stringifyID(localID), remoteID),
  );
};

const lookupLocalID = async (
  syncState: SyncState,
  collection: string,
  remoteID: number | string,
): Promise<number | string | undefined> => {
  const cacheKey = getSyncCacheKey(collection, remoteID);
  const cached = syncState.idLookupCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const result = await syncState.pool.query<{ local_id: string }>(
    `
      SELECT local_id
      FROM "__sync"
      WHERE collection = $1
        AND remote_id = $2
      LIMIT 1
    `,
    [collection, stringifyID(remoteID)],
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  const resolvedID = toSyncedIDType(row.local_id, remoteID);
  syncState.idLookupCache.set(cacheKey, resolvedID);
  return resolvedID;
};

const dropSyncTable = async (syncState: SyncState): Promise<void> => {
  await syncState.pool.query(`DROP TABLE IF EXISTS "__sync";`);
};

const hasOwn = (obj: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

type SplitResult = {
  optionalData: Record<string, unknown>;
  requiredData: Record<string, unknown>;
  handledKeys: Set<string>;
};

const mergeSplitResult = (target: SplitResult, source: SplitResult): void => {
  Object.assign(target.requiredData, source.requiredData);
  Object.assign(target.optionalData, source.optionalData);

  for (const key of source.handledKeys) {
    target.handledKeys.add(key);
  }
};

const hasKeys = (value: Record<string, unknown>): boolean => {
  return Object.keys(value).length > 0;
};

const isMergableRecord = (value: unknown): value is Record<string, unknown> => {
  return isRecord(value) && !Array.isArray(value);
};

const getNestedItemID = (value: unknown): number | string | null => {
  if (!isRecord(value)) {
    return null;
  }

  return asIDValue(value.id);
};

const deepMergeForUpdate = (base: unknown, override: unknown): unknown => {
  if (override === undefined) {
    return base;
  }

  if (Array.isArray(base) && Array.isArray(override)) {
    const canMergeByID =
      base.every((item) => getNestedItemID(item) !== null) &&
      override.every((item) => getNestedItemID(item) !== null);

    if (canMergeByID) {
      const baseByID = new Map<string, unknown>();
      for (const item of base) {
        const id = getNestedItemID(item);
        if (id !== null) {
          baseByID.set(stringifyID(id), item);
        }
      }

      return override.map((item) => {
        const id = getNestedItemID(item);
        if (id === null) {
          return item;
        }

        const existing = baseByID.get(stringifyID(id));
        if (existing === undefined) {
          return item;
        }

        return deepMergeForUpdate(existing, item);
      });
    }

    const maxLength = Math.max(base.length, override.length);
    const merged: unknown[] = [];
    for (let index = 0; index < maxLength; index += 1) {
      if (index >= override.length) {
        merged.push(base[index]);
        continue;
      }

      merged.push(deepMergeForUpdate(base[index], override[index]));
    }

    return merged;
  }

  if (isMergableRecord(base) && isMergableRecord(override)) {
    const merged: Record<string, unknown> = { ...base };

    for (const [key, value] of Object.entries(override)) {
      merged[key] = deepMergeForUpdate(base[key], value);
    }

    return merged;
  }

  return override;
};

const splitRecordByFieldDefinitions = (
  data: Record<string, unknown>,
  fields: CollectionFieldConfigLike[] = [],
): SplitResult => {
  const result: SplitResult = {
    requiredData: {},
    optionalData: {},
    handledKeys: new Set<string>(),
  };

  for (const field of fields) {
    if (field.type === "tabs" && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        if (!Array.isArray(tab.fields)) {
          continue;
        }

        if (typeof tab.name === "string" && tab.name.length > 0) {
          if (!hasOwn(data, tab.name)) {
            continue;
          }

          result.handledKeys.add(tab.name);
          const tabValue = data[tab.name];

          if (!isRecord(tabValue)) {
            result.optionalData[tab.name] = tabValue;
            continue;
          }

          const nested = splitRecordByFieldDefinitions(tabValue, tab.fields);
          if (hasKeys(nested.requiredData)) {
            result.requiredData[tab.name] = nested.requiredData;
          }
          if (hasKeys(nested.optionalData)) {
            result.optionalData[tab.name] = nested.optionalData;
          }
          continue;
        }

        mergeSplitResult(
          result,
          splitRecordByFieldDefinitions(data, tab.fields),
        );
      }
      continue;
    }

    if (field.type === "row" && Array.isArray(field.fields)) {
      mergeSplitResult(
        result,
        splitRecordByFieldDefinitions(data, field.fields),
      );
      continue;
    }

    if (typeof field.name !== "string" || field.name.length === 0) {
      continue;
    }

    if (!hasOwn(data, field.name)) {
      continue;
    }

    const value = data[field.name];
    result.handledKeys.add(field.name);

    if (
      (field.type === "group" ||
        field.type === "collapsible" ||
        field.type === "array") &&
      Array.isArray(field.fields)
    ) {
      if (field.type === "array") {
        if (!Array.isArray(value)) {
          if (field.required === true) {
            result.requiredData[field.name] = value;
          } else {
            result.optionalData[field.name] = value;
          }
          continue;
        }

        const requiredArrayItems: unknown[] = [];
        const optionalArrayItems: unknown[] = [];

        for (const item of value) {
          if (!isRecord(item)) {
            optionalArrayItems.push(item);
            continue;
          }

          const nested = splitRecordByFieldDefinitions(item, field.fields);
          const nestedItemID = hasOwn(item, "id") ? item.id : undefined;
          if (hasKeys(nested.requiredData)) {
            requiredArrayItems.push(
              nestedItemID === undefined
                ? nested.requiredData
                : { id: nestedItemID, ...nested.requiredData },
            );
          }
          if (hasKeys(nested.optionalData)) {
            optionalArrayItems.push(
              nestedItemID === undefined
                ? nested.optionalData
                : { id: nestedItemID, ...nested.optionalData },
            );
          }
        }

        if (requiredArrayItems.length > 0 || field.required === true) {
          result.requiredData[field.name] = requiredArrayItems;
        }
        if (optionalArrayItems.length > 0 || field.required !== true) {
          result.optionalData[field.name] = optionalArrayItems;
        }
        continue;
      }

      if (!isRecord(value)) {
        if (field.required === true) {
          result.requiredData[field.name] = value;
        } else {
          result.optionalData[field.name] = value;
        }
        continue;
      }

      const nested = splitRecordByFieldDefinitions(value, field.fields);
      if (hasKeys(nested.requiredData) || field.required === true) {
        result.requiredData[field.name] = hasKeys(nested.requiredData)
          ? nested.requiredData
          : {};
      }
      if (hasKeys(nested.optionalData)) {
        result.optionalData[field.name] = nested.optionalData;
      }
      continue;
    }

    if (
      field.type === "blocks" &&
      Array.isArray(field.blocks) &&
      Array.isArray(value)
    ) {
      const requiredBlocks: unknown[] = [];
      const optionalBlocks: unknown[] = [];

      for (const blockItem of value) {
        if (!isRecord(blockItem) || typeof blockItem.blockType !== "string") {
          optionalBlocks.push(blockItem);
          continue;
        }

        const blockConfig = field.blocks.find(
          (block) => block.slug === blockItem.blockType,
        );
        if (!blockConfig || !Array.isArray(blockConfig.fields)) {
          optionalBlocks.push(blockItem);
          continue;
        }

        const nested = splitRecordByFieldDefinitions(
          blockItem,
          blockConfig.fields,
        );
        const blockItemID = hasOwn(blockItem, "id") ? blockItem.id : undefined;

        if (hasKeys(nested.requiredData)) {
          requiredBlocks.push({
            ...(blockItemID === undefined ? {} : { id: blockItemID }),
            blockType: blockItem.blockType,
            ...nested.requiredData,
          });
        }
        if (hasKeys(nested.optionalData)) {
          optionalBlocks.push({
            ...(blockItemID === undefined ? {} : { id: blockItemID }),
            blockType: blockItem.blockType,
            ...nested.optionalData,
          });
        }
      }

      if (requiredBlocks.length > 0 || field.required === true) {
        result.requiredData[field.name] = requiredBlocks;
      }
      if (optionalBlocks.length > 0 || field.required !== true) {
        result.optionalData[field.name] = optionalBlocks;
      }
      continue;
    }

    if (field.required === true) {
      result.requiredData[field.name] = value;
      continue;
    }

    result.optionalData[field.name] = value;
  }

  for (const [key, value] of Object.entries(data)) {
    if (!result.handledKeys.has(key)) {
      result.optionalData[key] = value;
    }
  }

  return result;
};

const getRemoteBaseURL = (options: SyncRemotePayloadOptions): string => {
  return options.remote.baseURL.replace(/\/$/, "");
};

const getRemoteApiURL = (options: SyncRemotePayloadOptions): string => {
  const baseURL = getRemoteBaseURL(options);
  return `${baseURL}/api`;
};

const stripGeneratedUploadFields = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (GENERATED_UPLOAD_FIELDS.has(key)) {
      continue;
    }

    next[key] = value;
  }

  return next;
};

const stripHardFilteredSourceFields = (
  data: Record<string, unknown>,
  authCollection: boolean,
): Record<string, unknown> => {
  if (!authCollection) {
    return data;
  }

  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (STRIP_FIELDS.has(key)) {
      continue;
    }

    next[key] = value;
  }

  return next;
};

const buildRemoteUploadFileURL = (
  options: SyncRemotePayloadOptions,
  collection: string,
  doc: Record<string, unknown>,
): string => {
  const baseURL = getRemoteBaseURL(options);
  const url = `${baseURL}${doc.url}`;

  return url;
};

const getSelectedCollections = (
  options: SyncRemotePayloadOptions,
  localConfig: SanitizedConfig,
): PayloadSyncCollectionMetadata[] => {
  const localBySlug = new Map(
    (localConfig.collections ?? []).map((collection) => [
      collection.slug,
      collection,
    ]),
  );
  const missing = options.collections.filter(
    (slug) => !localBySlug.has(slug as CollectionSlug),
  );
  if (missing.length > 0) {
    throw new Error(
      `[@dexilion/payload-sync] Unknown collection slug(s): ${missing.join(", ")}.`,
    );
  }

  return options.collections.map((slug) => {
    const localCollection = localBySlug.get(slug as CollectionSlug)!;

    return {
      slug: localCollection.slug as CollectionSlug,
      upload: isUploadCollection(localCollection),
      auth:
        Object.hasOwn(localCollection, "auth") && Boolean(localCollection.auth),
      versions: Boolean(localCollection.versions),
      fields: (localCollection.fields as CollectionFieldConfigLike[]) ?? [],
    };
  });
};

const getRemoteCollectionPage = async (
  options: SyncRemotePayloadOptions,
  slug: string,
  page: number,
): Promise<CollectionDocumentsResponse> => {
  const syncBaseURL = getRemoteApiURL(options);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const url = `${syncBaseURL}/${encodeURIComponent(slug)}?page=${page}&limit=${limit}&pagination=true&sort=id`;

  return fetchJSON<CollectionDocumentsResponse>(
    url,
    getRemoteHeaders(options.remote),
  );
};

const getLastRemoteCollectionVersionForDoc = async (
  options: SyncRemotePayloadOptions,
  slug: string,
  docID: number | string,
): Promise<Record<string, unknown> | null> => {
  const syncBaseURL = getRemoteApiURL(options);
  const url = `${syncBaseURL}/${encodeURIComponent(slug)}/versions?where[latest][equals]=true&where[parent][equals]=${encodeURIComponent(stringifyID(docID))}`;
  const remotePage = await fetchJSON<CollectionDocumentsResponse>(
    url,
    getRemoteHeaders(options.remote),
  );

  return remotePage.docs[0] ?? null;
};

const splitDocumentForPasses = (
  doc: Record<string, unknown>,
  fields: CollectionFieldConfigLike[],
  uploadCollection: boolean,
  authCollection: boolean,
): {
  optionalData: Record<string, unknown>;
  requiredData: Record<string, unknown>;
} => {
  const sourceDoc = stripHardFilteredSourceFields(
    uploadCollection ? stripGeneratedUploadFields(doc) : doc,
    authCollection,
  );
  const split = splitRecordByFieldDefinitions(sourceDoc, fields);

  if (hasOwn(sourceDoc, "id")) {
    split.requiredData.id = sourceDoc.id;
    delete split.optionalData.id;
  }

  return {
    requiredData: split.requiredData,
    optionalData: split.optionalData,
  };
};

const mapSingleRelationValue = async (
  value: unknown,
  relationCollection: string,
  syncState: SyncState,
  allowMissingMappings: boolean,
): Promise<unknown> => {
  const directID = asIDValue(value);
  if (directID !== null) {
    const localID = await lookupLocalID(
      syncState,
      relationCollection,
      directID,
    );
    if (!allowMissingMappings && localID === undefined) {
      throw new Error(
        `[@dexilion/payload-sync] Missing mapping in __sync for relation ${relationCollection}/${String(directID)}.`,
      );
    }
    return localID ?? value;
  }

  if (isRecord(value)) {
    const nestedID = asIDValue(value.id);
    if (nestedID !== null) {
      const localID = await lookupLocalID(
        syncState,
        relationCollection,
        nestedID,
      );
      if (!allowMissingMappings && localID === undefined) {
        throw new Error(
          `[@dexilion/payload-sync] Missing mapping in __sync for relation ${relationCollection}/${String(nestedID)}.`,
        );
      }
      return localID ?? value;
    }
  }

  return value;
};

const mapRelationFieldValue = async (
  value: unknown,
  field: CollectionFieldConfigLike,
  syncState: SyncState,
  allowMissingMappings: boolean,
): Promise<unknown> => {
  const { relationTo } = field;
  if (!relationTo) {
    return value;
  }

  if (Array.isArray(relationTo)) {
    if (field.hasMany) {
      if (!Array.isArray(value)) {
        return value;
      }

      const mapped = [];
      for (const item of value) {
        if (!isRecord(item) || typeof item.relationTo !== "string") {
          mapped.push(item);
          continue;
        }

        const mappedValue = await mapSingleRelationValue(
          item.value,
          item.relationTo,
          syncState,
          allowMissingMappings,
        );
        mapped.push({ ...item, value: mappedValue });
      }

      return mapped;
    }

    if (!isRecord(value) || typeof value.relationTo !== "string") {
      return value;
    }

    const mappedValue = await mapSingleRelationValue(
      value.value,
      value.relationTo,
      syncState,
      allowMissingMappings,
    );
    return { ...value, value: mappedValue };
  }

  if (field.hasMany) {
    if (!Array.isArray(value)) {
      return value;
    }

    const mapped = [];
    for (const item of value) {
      mapped.push(
        await mapSingleRelationValue(
          item,
          relationTo,
          syncState,
          allowMissingMappings,
        ),
      );
    }

    return mapped;
  }

  return mapSingleRelationValue(
    value,
    relationTo,
    syncState,
    allowMissingMappings,
  );
};

const mapRelationsForFields = async (
  data: Record<string, unknown>,
  fields: CollectionFieldConfigLike[],
  syncState: SyncState,
  allowMissingMappings: boolean,
): Promise<void> => {
  for (const field of fields) {
    if (field.type === "tabs" && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        if (typeof tab.name === "string" && tab.name.length > 0) {
          const tabValue = data[tab.name];
          if (isRecord(tabValue) && Array.isArray(tab.fields)) {
            await mapRelationsForFields(
              tabValue,
              tab.fields,
              syncState,
              allowMissingMappings,
            );
          }
        } else if (Array.isArray(tab.fields)) {
          await mapRelationsForFields(
            data,
            tab.fields,
            syncState,
            allowMissingMappings,
          );
        }
      }
      continue;
    }

    if (
      typeof field.name === "string" &&
      field.name.length > 0 &&
      field.relationTo
    ) {
      data[field.name] = await mapRelationFieldValue(
        data[field.name],
        field,
        syncState,
        allowMissingMappings,
      );
      continue;
    }

    if (field.type === "row" && Array.isArray(field.fields)) {
      await mapRelationsForFields(
        data,
        field.fields,
        syncState,
        allowMissingMappings,
      );
      continue;
    }

    if (
      (field.type === "array" ||
        field.type === "group" ||
        field.type === "collapsible") &&
      typeof field.name === "string" &&
      field.name.length > 0 &&
      Array.isArray(field.fields)
    ) {
      const nestedValue = data[field.name];
      if (field.type === "array" && Array.isArray(nestedValue)) {
        for (const item of nestedValue) {
          if (isRecord(item)) {
            await mapRelationsForFields(
              item,
              field.fields,
              syncState,
              allowMissingMappings,
            );
          }
        }
      } else if (isRecord(nestedValue)) {
        await mapRelationsForFields(
          nestedValue,
          field.fields,
          syncState,
          allowMissingMappings,
        );
      }
      continue;
    }

    if (
      field.type === "blocks" &&
      typeof field.name === "string" &&
      field.name.length > 0 &&
      Array.isArray(field.blocks)
    ) {
      const blocksValue = data[field.name];
      if (!Array.isArray(blocksValue)) {
        continue;
      }

      for (const blockItem of blocksValue) {
        if (!isRecord(blockItem) || typeof blockItem.blockType !== "string") {
          continue;
        }

        const blockConfig = field.blocks.find(
          (block) => block.slug === blockItem.blockType,
        );
        if (blockConfig && Array.isArray(blockConfig.fields)) {
          await mapRelationsForFields(
            blockItem,
            blockConfig.fields,
            syncState,
            allowMissingMappings,
          );
        }
      }
    }
  }
};

const mapRelationIDs = async (
  data: Record<string, unknown>,
  metadata: PayloadSyncCollectionMetadata,
  syncState: SyncState,
  allowMissingMappings: boolean,
): Promise<Record<string, unknown>> => {
  await mapRelationsForFields(
    data,
    metadata.fields,
    syncState,
    allowMissingMappings,
  );
  return data;
};

const syncLatestRemoteVersionForDoc = async (
  options: SyncRemotePayloadOptions,
  metadata: PayloadSyncCollectionMetadata,
  syncState: SyncState,
  remoteID: number | string,
  localID: number | string,
): Promise<void> => {
  if (!metadata.versions) {
    return;
  }

  const latestRemoteVersion = await getLastRemoteCollectionVersionForDoc(
    options,
    metadata.slug,
    remoteID,
  );

  if (!latestRemoteVersion) {
    return;
  }

  if (!isRecord(latestRemoteVersion.version)) {
    throw new Error(
      `[@dexilion/payload-sync] Remote version in "${metadata.slug}" has invalid version payload.`,
    );
  }

  const createdAt = latestRemoteVersion.createdAt;
  if (typeof createdAt !== "string" || createdAt.length === 0) {
    throw new Error(
      `[@dexilion/payload-sync] Remote version in "${metadata.slug}" is missing createdAt.`,
    );
  }

  const updatedAt =
    typeof latestRemoteVersion.updatedAt === "string" &&
    latestRemoteVersion.updatedAt.length > 0
      ? latestRemoteVersion.updatedAt
      : createdAt;

  const sourceVersionData = stripHardFilteredSourceFields(
    metadata.upload
      ? stripGeneratedUploadFields(latestRemoteVersion.version)
      : latestRemoteVersion.version,
    metadata.auth,
  );
  sourceVersionData.id = localID;

  const mappedVersionData = await mapRelationIDs(
    sourceVersionData,
    metadata,
    syncState,
    true,
  );

  await options.localPayload.db.createVersion({
    autosave:
      typeof latestRemoteVersion.autosave === "boolean"
        ? latestRemoteVersion.autosave
        : false,
    collectionSlug: metadata.slug as CollectionSlug,
    createdAt,
    parent: localID,
    ...(typeof latestRemoteVersion.publishedLocale === "string"
      ? { publishedLocale: latestRemoteVersion.publishedLocale }
      : {}),
    ...(latestRemoteVersion.snapshot === true ? { snapshot: true } : {}),
    updatedAt,
    versionData: mappedVersionData,
  });
};

const syncCollection = async (
  options: SyncRemotePayloadOptions,
  metadata: PayloadSyncCollectionMetadata,
  pass: "optional" | "required",
  syncState: SyncState,
): Promise<number> => {
  const logger = options.logger ?? console;
  const collection = metadata.slug;
  let page = 1;
  let processed = 0;

  while (true) {
    const remotePage = await getRemoteCollectionPage(options, collection, page);

    for (const doc of remotePage.docs) {
      const id = doc.id;
      const remoteID = asIDValue(id);
      if (remoteID === null) {
        throw new Error(`Remote document in "${collection}" is missing id.`);
      }

      const { optionalData, requiredData } = splitDocumentForPasses(
        doc,
        metadata.fields,
        metadata.upload,
        metadata.auth,
      );

      if (pass === "optional") {
        if (
          metadata.auth &&
          syncState.existingAuthDocKeys.has(
            getSyncCacheKey(collection, remoteID),
          )
        ) {
          processed += 1;
          logger.log(
            `[@dexilion/payload-sync] ${collection}: skipped optional update for existing auth document ${stringifyID(remoteID)}`,
          );
          continue;
        }

        const hasOptionalData = Object.keys(optionalData).length > 0;
        if (!hasOptionalData && !metadata.versions) {
          continue;
        }

        const localID = await lookupLocalID(syncState, collection, remoteID);
        if (localID === undefined) {
          throw new Error(
            `[@dexilion/payload-sync] Missing mapping in __sync for ${collection}/${String(remoteID)}.`,
          );
        }

        if (hasOptionalData) {
          const mappedOptionalData = await mapRelationIDs(
            optionalData,
            metadata,
            syncState,
            false,
          );

          const existingLocalDoc = await options.localPayload.db.findOne<
            {
              id: number | string;
            } & Record<string, unknown>
          >({
            collection: collection as CollectionSlug,
            where: {
              id: {
                equals: localID,
              },
            },
          });

          if (!existingLocalDoc) {
            throw new Error(
              `[@dexilion/payload-sync] Missing local document for ${collection}/${String(localID)}.`,
            );
          }

          await options.localPayload.db.updateOne({
            id: localID,
            collection: collection as CollectionSlug,
            data: deepMergeForUpdate(
              existingLocalDoc,
              mappedOptionalData,
            ) as Record<string, unknown>,
            returning: false,
          });
        }

        await syncLatestRemoteVersionForDoc(
          options,
          metadata,
          syncState,
          remoteID,
          localID,
        );

        processed += 1;
        logger.log(
          `[@dexilion/payload-sync] ${collection}: synced optional pass for document ${processed}`,
        );
        continue;
      }

      let createdDoc;
      if (metadata.auth) {
        const existingAuthDoc = await options.localPayload.db.findOne<
          {
            id: number | string;
          } & Record<string, unknown>
        >({
          collection: collection as CollectionSlug,
          where: {
            id: {
              equals: remoteID,
            },
          },
        });

        if (existingAuthDoc) {
          const existingLocalID = asIDValue(existingAuthDoc.id);
          if (existingLocalID === null) {
            throw new Error(
              `[@dexilion/payload-sync] Existing auth document in "${collection}" is missing id.`,
            );
          }

          await recordSyncID(syncState, collection, remoteID, existingLocalID);
          syncState.existingAuthDocKeys.add(
            getSyncCacheKey(collection, remoteID),
          );
          processed += 1;
          logger.log(
            `[@dexilion/payload-sync] ${collection}: existing auth document ${stringifyID(remoteID)} found, skipping override`,
          );
          continue;
        }
      }

      const mappedRequiredData = await mapRelationIDs(
        requiredData,
        metadata,
        syncState,
        true,
      );

      if (metadata.upload) {
        const filename = String(doc.filename ?? "");
        const mediaFilenames = await loadMediaFilenameCache();
        if (!mediaFilenames.has(filename)) {
          const fileURL = buildRemoteUploadFileURL(options, collection, doc);
          const fileRes = await fetch(fileURL, {
            headers: getRemoteHeaders(options.remote),
            method: "GET",
          });
          if (!fileRes.ok) {
            const body = await fileRes.text();
            throw new Error(
              `Failed to fetch upload file for ${collection}/${doc.id} (${fileRes.status}): ${fileURL}`,
            );
          }

          const buffer = Buffer.from(await fileRes.arrayBuffer());
          const fallbackMimeType = fileRes.headers.get("content-type");
          const mimeType =
            typeof doc.mimeType === "string" && doc.mimeType.length > 0
              ? doc.mimeType
              : fallbackMimeType || "application/octet-stream";
          const sizeFromDoc =
            typeof doc.filesize === "number" && Number.isFinite(doc.filesize)
              ? doc.filesize
              : buffer.byteLength;

          createdDoc = await options.localPayload.create<any, any>({
            collection,
            data: mappedRequiredData,
            file: {
              data: buffer,
              mimetype: mimeType,
              name: filename,
              size: sizeFromDoc,
            },
            overrideAccess: true,
            showHiddenFields: true,
            draft: false,
          });
        } else {
          createdDoc = await options.localPayload.db.create({
            collection: collection as CollectionSlug,
            data: mappedRequiredData,
          });
        }
      } else {
        createdDoc = await options.localPayload.db.create({
          collection: collection as CollectionSlug,
          data: mappedRequiredData,
        });
      }
      const createdID = asIDValue(createdDoc.id);
      if (createdID === null) {
        throw new Error(
          `[@dexilion/payload-sync] Created document in "${collection}" is missing id.`,
        );
      }
      await recordSyncID(syncState, collection, remoteID, createdID);

      processed += 1;
      logger.log(
        `[@dexilion/payload-sync] ${collection}: synced required fields for document ${processed}`,
      );
    }

    if (!remotePage.hasNextPage) {
      break;
    }

    page += 1;
  }

  return processed;
};

export const syncRemotePayload = async (
  options: SyncRemotePayloadOptions,
  localConfig: SanitizedConfig,
): Promise<void> => {
  const logger = options.logger ?? console;
  const syncState = await createSyncState();
  const collections = getSelectedCollections(options, localConfig);

  logger.log(
    `[@dexilion/payload-sync] Collections selected: ${collections.length}`,
  );
  logger.log("[@dexilion/payload-sync] Created __sync mapping table.");

  try {
    await assertCollectionsExistAndEmpty(options.localPayload, collections);
    logger.log(
      "[@dexilion/payload-sync] Local collection checks passed. Starting clone process.",
    );

    // First sync all collections with only the required fields
    for (const collection of collections) {
      logger.log(
        `[@dexilion/payload-sync] Syncing required fields for collection: ${collection.slug}`,
      );
      const count = await syncCollection(
        options,
        collection,
        "required",
        syncState,
      );
      logger.log(
        `[@dexilion/payload-sync] Required-field pass complete: ${collection.slug} (${count} documents).`,
      );
    }

    // Do a second pass for the optional fields
    for (const collection of collections) {
      logger.log(
        `[@dexilion/payload-sync] Syncing optional fields for collection: ${collection.slug}`,
      );
      const count = await syncCollection(
        options,
        collection,
        "optional",
        syncState,
      );
      logger.log(
        `[@dexilion/payload-sync] Optional-field pass complete: ${collection.slug} (${count} documents).`,
      );
    }

    logger.log("[@dexilion/payload-sync] Sync completed successfully.");
  } finally {
    await dropSyncTable(syncState);
    await syncState.pool.end();
    logger.log("[@dexilion/payload-sync] Dropped __sync mapping table.");
  }
};
