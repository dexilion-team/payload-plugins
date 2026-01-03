import { Metadata } from "next";
import { getPage } from "./getPage";
import { recursivelySearchForDataByName } from "@dexilion/payload-nested-docs";
import { getTenantName } from "@dexilion/payload-multi-tenant";

export const metadataGenerator =
  (options?: { tenantsSlug?: string }) =>
  async ({
    params,
    searchParams,
  }: {
    params: any;
    searchParams: any;
  }): Promise<Metadata> => {
    const { segments } = await params;
    const page = await getPage({
      segments,
      pagesSlug: "pages",
    });

    if (!page) {
      return {};
    }

    const tenantsSlug = options?.tenantsSlug || "tenants";
    const tenantName = page[tenantsSlug]?.name || "";
    const path = page.path ?? `/${page.id}`;
    const logo = page.meta?.image?.url ?? page[tenantsSlug]?.logo?.url;
    const title =
      (page.meta.title ||
        recursivelySearchForDataByName<string>(page, "title")) ??
      "";

    return {
      title: title,
      openGraph: {
        title: title,
        url: `https://${tenantName}/${path}`,
        images: logo ? [logo] : undefined,
      },
      twitter: {
        title: page.title,
        site: `https://${tenantName}/${path}`,
        images: logo ? [logo] : undefined,
      },
    };
  };
