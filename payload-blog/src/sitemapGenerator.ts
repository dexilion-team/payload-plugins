import { CollectionSlug, getPayload, SanitizedConfig } from "payload";

export function sitemapGenerator({
  config,
  collection,
}: {
  config: SanitizedConfig | Promise<SanitizedConfig>;
  collection?: CollectionSlug;
}) {
  return async () => {
    const payload = await getPayload({ config });

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
        url: `/${path}`,
        lastModified: updatedAt,
      };
    });
  };
}
