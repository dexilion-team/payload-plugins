import type { CollectionSlug, DocumentViewServerProps } from "payload";
import { redirect } from "next/navigation";

import { getGlobalViewRedirect } from "../utilities/getGlobalViewRedirect";

type GlobalViewRedirectProps = DocumentViewServerProps & {
  collectionSlug: CollectionSlug;
  tenantFieldName: string;
};

const GlobalViewRedirect = async ({
  collectionSlug,
  initPageResult,
  searchParams,
  tenantFieldName,
}: GlobalViewRedirectProps) => {
  const resolvedCollectionSlug =
    collectionSlug ?? initPageResult.globalConfig?.slug;
  const resolvedTenantFieldName =
    tenantFieldName && tenantFieldName.trim().length > 0
      ? tenantFieldName
      : "tenant";

  if (!resolvedCollectionSlug) {
    return null;
  }

  const redirectTo = await getGlobalViewRedirect({
    collectionSlug: resolvedCollectionSlug,
    req: initPageResult.req,
    searchParams,
    tenantFieldName: resolvedTenantFieldName,
  });

  if (redirectTo) {
    redirect(redirectTo);
  }

  return null;
};

export default GlobalViewRedirect;
