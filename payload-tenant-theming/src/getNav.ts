import { getTenantName } from "@dexilion/payload-multi-tenant";
import { CollectionSlug, getPayload, SanitizedConfig } from "payload";

export const getNav = async (params: {
  tenantFieldKey?: string;
  slug?: CollectionSlug;
  payloadConfig: Promise<SanitizedConfig>;
}) => {
  const { slug, tenantFieldKey } = params;
  const payload = await getPayload({ config: params.payloadConfig });

  const tenantName = await getTenantName();
  if (!tenantName) {
    throw new Error(
      "[@dexilion/payload-tenant-theming] No tenant found with that name.",
    );
  }

  const nav = await payload.find({
    collection: slug ?? ("nav" as CollectionSlug),
    where: {
      tenant: {
        [tenantFieldKey ?? "domain"]: {
          equals: tenantName,
        },
      },
    },
    limit: 1,
    draft: true,
  });

  return nav.docs[0] || null;
};
