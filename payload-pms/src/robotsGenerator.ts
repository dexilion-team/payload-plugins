import { getTenantName } from "@dexilion/payload-multi-tenant";
import type { MetadataRoute } from "next";

export const robotsGenerator =
  () => async (): Promise<MetadataRoute.Robots> => {
    const tenantName = await getTenantName();
    if (!tenantName) {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] No tenant found with that name.",
      );

      return {
        rules: {
          userAgent: "*",
          disallow: "",
        },
      };
    }

    return {
      rules: {
        userAgent: "*",
        disallow: " ",
      },
      sitemap: `https://${tenantName}/sitemap.xml`,
    };
  };
