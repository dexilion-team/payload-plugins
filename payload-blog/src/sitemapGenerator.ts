import { CollectionSlug, getPayload, SanitizedConfig } from "payload";
import { getTenantDomain } from "@dexilion/payload-multi-tenant";

export function sitemapGenerator({
  config,
  collection,
  basePath = "post",
  domain,
  dateFieldName = "date",
  tagsCollection = "tags",
  tagFilterBasePath = "blog/1",
}: {
  config: SanitizedConfig | Promise<SanitizedConfig>;
  collection?: CollectionSlug;
  basePath?: string;
  domain?: string;
  dateFieldName?: string;
  tagsCollection?: CollectionSlug;
  tagFilterBasePath?: string;
}) {
  return async () => {
    const payload = await getPayload({ config });
    const domainName = domain ?? (await getTenantDomain());

    const [pages, tags] = await Promise.all([
      payload.find({
        collection: collection ?? "posts",
        where: {
          [dateFieldName]: {
            less_than_equal: new Date(
              new Date().setHours(23, 59, 59, 999),
            ).toISOString(),
          },
        },
        pagination: false,
        depth: 0,
        draft: false,
      }),
      payload.find({
        collection: tagsCollection,
        pagination: false,
        depth: 0,
      }),
    ]);

    const postEntries = pages.docs.map((page: any) => {
      const path = page.slug;
      const { updatedAt } = page;

      return {
        url: `https://${domainName}/${basePath}/${path}`,
        lastModified: updatedAt,
      };
    });

    const tagEntries = tags.docs
      .filter((tag: any) => tag.slug)
      .map((tag: any) => ({
        url: `https://${domainName}/${tagFilterBasePath}?tags=${encodeURIComponent(
          tag.slug,
        )}`,
        lastModified: tag.updatedAt,
      }));

    return [...postEntries, ...tagEntries];
  };
}
