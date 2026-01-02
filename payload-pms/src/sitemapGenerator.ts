import type { MetadataRoute } from "next";
import { CollectionSlug, getPayload } from "payload";
import config from "@payload-config";
import { getTenantName } from "@dexilion/payload-multi-tenant";

export type SitemapGeneratorOptions = {
  pageSlug?: string;
  domainFieldName?: string;
};

export const sitemapGenerator =
  (options?: SitemapGeneratorOptions) =>
  async (): Promise<MetadataRoute.Sitemap> => {
    const payload = await getPayload({ config });

    const tenantName = await getTenantName();
    if (!tenantName) {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] No tenant found with that name.",
      );
      return [];
    }

    const tenant = await payload.find({
      collection: "tenants",
      where: {
        [options?.domainFieldName ?? "domain"]: { equals: tenantName },
      },
    });
    if (!tenant?.docs?.length) {
      payload.logger.warn(
        `[@dexilion/payload-tenant-theming] No tenant found with the name "${tenantName}".`,
      );
      return [];
    }

    const pages = await payload.find({
      collection: (options?.pageSlug || "pages") as CollectionSlug,
      where: {
        tenant: { equals: tenant.docs[0].id },
      },
      pagination: false,
    });

    if (!pages?.docs?.length) {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] No pages found for tenant.",
      );
      return [];
    }

    return pages.docs.map((page) => {
      const { path, updatedAt } = page as any;
      return {
        url: `https://${tenantName}${path}`,
        lastModified: new Date(updatedAt),
        // changeFrequency: "monthly",
        // priority: 0.8,
      };
    });
  };
