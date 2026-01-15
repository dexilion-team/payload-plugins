import type { CollectionSlug, PayloadRequest } from "payload";

import { getActiveTenantIDFromReq } from "../utils";

type SearchParams = Record<string, string | string[] | undefined>;

const buildQueryString = (searchParams?: SearchParams): string => {
  if (!searchParams) {
    return "";
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry != null) {
          query.append(key, entry);
        }
      }
      continue;
    }

    if (value != null) {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const normalizeAdminRoute = (adminRoute: string): string => {
  if (adminRoute === "/") {
    return "";
  }

  return adminRoute.endsWith("/") ? adminRoute.slice(0, -1) : adminRoute;
};

export const getGlobalViewRedirect = async ({
  collectionSlug,
  req,
  searchParams,
  tenantFieldName,
}: {
  collectionSlug: CollectionSlug;
  req: PayloadRequest;
  searchParams?: SearchParams;
  tenantFieldName: string;
}): Promise<string | null> => {
  const tenantID = await getActiveTenantIDFromReq(req, tenantFieldName);
  if (tenantID == null) {
    return null;
  }

  const existing = await req.payload.find({
    collection: collectionSlug,
    limit: 1,
    pagination: false,
    req,
    where: {
      [tenantFieldName]: {
        equals: tenantID,
      },
    },
  });

  const adminRoute = normalizeAdminRoute(
    req.payload.config.routes?.admin ?? "/admin",
  );
  const basePath = `${adminRoute}/collections/${collectionSlug}`;
  const suffix = buildQueryString(searchParams);

  if (existing.docs.length > 0) {
    const docID = String(existing.docs[0].id);
    return `${basePath}/${docID}${suffix}`;
  }

  return `${basePath}/create${suffix}`;
};
