import { getTenantName } from "@dexilion/payload-multi-tenant";
import payloadConfig from "@/payload.config";
import { CollectionSlug, getPayload } from "payload";

export const getNav = async (params: {
  tenantFieldKey?: string;
  slug?: CollectionSlug;
}) => {
  const { slug, tenantFieldKey } = params;
  const payload = await getPayload({ config: payloadConfig });

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
