import { getTenantName } from "@dexilion/payload-multi-tenant";
import type { MetadataRoute } from "next";
import { getPayload, SanitizedConfig } from "payload";

export const robotsGenerator =
  ({ config }: { config: Promise<SanitizedConfig> }) =>
  async (): Promise<MetadataRoute.Robots> => {
    const payload = await getPayload({ config });
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
