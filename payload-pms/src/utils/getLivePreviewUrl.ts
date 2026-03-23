import { getPreference } from "@dexilion/payload-utils";
import { CollectionSlug, PayloadRequest } from "payload";

export const getLivePreviewUrl =
  ({
    livePreviewBasePath,
    tenantDomainFieldKey,
  }: {
    livePreviewBasePath?: string;
    tenantDomainFieldKey?: string;
  }) =>
  async ({ req, data }: { req: PayloadRequest; data: any }) => {
    const { payload, headers } = req;
    const tenantId = (await getPreference({
      req,
      key: "admin-tenant-select",
    })) as number;
    if (!tenantId) {
      console.warn(
        "[@dexilion/payload-pms] No tenant selected for live preview. Please set the 'admin-tenant-select' preference.",
      );
      return undefined;
    }

    const tenant = (await payload.findByID({
      collection: "tenants" as CollectionSlug,
      id: `${tenantId}`,
      req,
      disableErrors: true,
    })) as any;

    const host = headers.get("x-forwarded-host") ?? headers.get("host");
    const isAlias = tenant.aliases?.some(
      (alias: { domain: string }) => alias.domain === host,
    );
    const domain = isAlias
      ? (host as string)
      : (tenant?.[tenantDomainFieldKey ?? "domain"] as string);
    const protocol = (await supportsHttps(domain)) ? "https" : "http";

    return `${protocol}://${domain}${livePreviewBasePath ? `${livePreviewBasePath}` : ""}/${data.id}`;
  };

const httpsProbeTimeoutMs = 1000;

const supportsHttps = async (domain: string): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), httpsProbeTimeoutMs);

  try {
    const result = await Promise.any([
      fetch(`https://${domain}`, {
        method: "HEAD",
        signal: controller.signal,
      }),
      fetch(`http://${domain}`, {
        method: "HEAD",
        signal: controller.signal,
      }),
    ]);

    return result.url.startsWith("https://") ? true : false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};
