import type { MetadataRoute } from "next";
import { CollectionSlug, getPayload, SanitizedConfig } from "payload";
import { getTenantDomain } from "@dexilion/payload-multi-tenant";
import { recursivelySearchForDataByName } from "@dexilion/payload-nested-docs";

export type SitemapGeneratorOptions = {
  config: Promise<SanitizedConfig>;
  pageSlug?: string;
  domainFieldName?: string;
};

export const sitemapGenerator =
  (options: SitemapGeneratorOptions) =>
  async (): Promise<MetadataRoute.Sitemap> => {
    const payload = await getPayload({ config: options.config });

    const domainName = await getTenantDomain();
    if (!domainName) {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] No tenant found with that name.",
      );
      return [];
    }

    const tenant = await payload.find({
      collection: "tenants",
      where: {
        [options?.domainFieldName ?? "domain"]: { equals: domainName },
      },
      draft: false,
    });
    if (!tenant?.docs?.length) {
      payload.logger.warn(
        `[@dexilion/payload-tenant-theming] No tenant found with the name "${domainName}".`,
      );
      return [];
    }

    const pages = await payload.find({
      collection: (options?.pageSlug || "pages") as CollectionSlug,
      where: {
        tenant: { equals: tenant.docs[0]!.id },
        _status: { equals: "published" },
      },
      pagination: false,
      depth: 0,
      draft: false,
    });

    if (!pages?.docs?.length) {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] No pages found for tenant.",
      );
      return [];
    }

    return pages.docs.map((page: any) => {
      const path = recursivelySearchForDataByName(page, "path");
      const { updatedAt } = page;
      return {
        url: `https://${domainName}${path}`,
        lastModified: new Date(updatedAt),
      };
    });
  };
