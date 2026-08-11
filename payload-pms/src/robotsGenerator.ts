import { getTenantDomain } from "@dexilion/payload-multi-tenant";
import type { MetadataRoute } from "next";
import { getPayload, SanitizedConfig } from "payload";

export const robotsGenerator =
  ({ config }: { config: Promise<SanitizedConfig> }) =>
  async (): Promise<MetadataRoute.Robots> => {
    const payload = await getPayload({ config });
    const domainName = await getTenantDomain();
    if (!domainName) {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] No tenant found with that name.",
      );

      return {
        rules: [
          {
            userAgent: "*",
            disallow: ["/admin", "/api"],
          },
        ],
      };
    }

    return {
      rules: [
        {
          userAgent: "*",
          disallow: ["/admin", "/api"],
        },
      ],
      sitemap: `https://${domainName}/sitemap.xml`,
    };
  };
