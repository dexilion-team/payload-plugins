import { type CollectionConfig, type Payload } from "payload";
import type { PayloadSyncCollectionMetadata } from "./types";

export const isUploadCollection = (collection: CollectionConfig): boolean => {
  return Object.hasOwn(collection, "upload") && collection.upload !== false;
};

const collectionHasDocuments = async (
  payload: Payload,
  collection: string,
): Promise<boolean> => {
  const result = await payload.find<any, any>({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
  });

  return result.docs.length > 0;
};

export const assertCollectionsExistAndEmpty = async (
  payload: Payload,
  collections: PayloadSyncCollectionMetadata[],
): Promise<void> => {
  const localCollections = new Map(
    payload.config.collections.map((collection) => [
      collection.slug,
      collection,
    ]),
  );

  const missing: string[] = [];
  const uploadMismatch: string[] = [];
  const nonEmpty: string[] = [];

  for (const remoteCollection of collections) {
    const local = localCollections.get(remoteCollection.slug);
    if (!local) {
      missing.push(remoteCollection.slug);
      continue;
    }

    if (remoteCollection.upload && !isUploadCollection(local)) {
      uploadMismatch.push(remoteCollection.slug);
      continue;
    }

    if (remoteCollection.auth) {
      continue;
    }

    if (await collectionHasDocuments(payload, remoteCollection.slug)) {
      nonEmpty.push(remoteCollection.slug);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[@dexilion/payload-sync] Local Payload is missing required collections: ${missing.join(", ")}.`,
    );
  }

  if (uploadMismatch.length > 0) {
    throw new Error(
      `[@dexilion/payload-sync] These collections are upload-enabled remotely but not locally: ${uploadMismatch.join(
        ", ",
      )}.`,
    );
  }

  if (nonEmpty.length > 0) {
    throw new Error(
      `[@dexilion/payload-sync] Local collections must be empty before sync. Non-empty: ${nonEmpty.join(", ")}.`,
    );
  }
};
