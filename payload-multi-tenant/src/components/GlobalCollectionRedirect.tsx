import type { CollectionSlug, ListViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  getActiveTenantIDFromUser,
  parseCookie,
  TENANT_COOKIE_NAME,
} from "../utils";

type GlobalCollectionRedirectProps = ListViewServerProps & {
  collectionSlug: CollectionSlug;
  tenantFieldName: string;
  tenantsSlug: CollectionSlug;
};

const buildQueryString = (
  searchParams: Record<string, string | string[] | undefined> | undefined,
): string => {
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

const GlobalCollectionRedirect = async ({
  collectionSlug,
  payload,
  searchParams,
  tenantFieldName,
  tenantsSlug,
  user,
}: GlobalCollectionRedirectProps) => {
  // Read tenant ID from cookie (client-authoritative)
  const h = await headers();
  const cookieValue = parseCookie(h.get("cookie"), TENANT_COOKIE_NAME);
  const cookieTenantId = cookieValue ? Number(cookieValue) : null;

  const tenantID = await getActiveTenantIDFromUser({
    payload,
    tenantFieldName,
    tenantsSlug,
    user,
    cookieTenantId: Number.isFinite(cookieTenantId!) ? cookieTenantId : null,
  });

  if (tenantID == null) {
    return null;
  }

  const existing = await payload.find({
    collection: collectionSlug,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      [tenantFieldName]: {
        equals: tenantID,
      },
    },
  });

  const adminRoute = normalizeAdminRoute(
    payload.config.routes?.admin ?? "/admin",
  );
  const basePath = `${adminRoute}/collections/${collectionSlug}`;
  const suffix = buildQueryString(searchParams);

  if (existing.docs[0]) {
    const docID = String(existing.docs[0].id);
    redirect(`${basePath}/${docID}${suffix}`);
  }

  redirect(`${basePath}/create${suffix}`);
};

export default GlobalCollectionRedirect;
