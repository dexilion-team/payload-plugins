import { CollectionSlug, getPayload, SanitizedConfig } from "payload";
import { getTenantDomain } from "@dexilion/payload-multi-tenant";

export function sitemapGenerator({
  config,
  collection,
  basePath = "post",
  domain,
}: {
  config: SanitizedConfig | Promise<SanitizedConfig>;
  collection?: CollectionSlug;
  basePath?: string;
  domain?: string;
}) {
  return async () => {
    const payload = await getPayload({ config });
    const domainName = domain ?? (await getTenantDomain());

    const pages = await payload.find({
      collection: collection ?? "posts",
      where: {
        date: {
          less_than_equal: new Date(
            new Date().setHours(23, 59, 59, 999),
          ).toISOString(),
        },
      },
      pagination: false,
      depth: 0,
      draft: false,
    });

    return pages.docs.map((page: any) => {
      const path = page.slug;
      const { updatedAt } = page;

      return {
        url: `https://${domainName}/${basePath}/${path}`,
        lastModified: updatedAt,
      };
    });
  };
}
