import { Metadata } from "next";
import { getPage } from "./getPage";
import { recursivelySearchForDataByName } from "@dexilion/payload-nested-docs";
import { SanitizedConfig } from "payload";

export const metadataGenerator =
  (
    payloadConfig: Promise<SanitizedConfig>,
    options?: { tenantsKey?: string; domainTenantKey?: string },
  ) =>
  async ({ params }: { params: any; searchParams: any }): Promise<Metadata> => {
    const { segments } = (await params) as { segments?: string[] };
    const page = await getPage({
      segments: segments ?? [],
      pagesSlug: "pages",
      payloadConfig,
    });

    if (!page) {
      return {};
    }

    const tenantsKey = options?.tenantsKey || "tenant";
    const domainKey = options?.domainTenantKey || "domain";
    const tenantName = page[tenantsKey]?.[domainKey];
    const path = page.path ?? `/${page.id}`;
    const logo = page.meta?.image?.url ?? page[tenantsKey]?.logo?.url;
    const title =
      (page.meta.title ||
        recursivelySearchForDataByName<string>(page, "title", ["parent"])) ??
      "";

    return {
      metadataBase: tenantName ? new URL(`https://${tenantName}`) : undefined,
      title: title,
      alternates: {
        canonical: path,
      },
      openGraph: {
        title: title,
        url: path,
        images: logo ? [logo] : undefined,
      },
      twitter: {
        title: title,
        site: path,
        images: logo ? [logo] : undefined,
      },
    };
  };
