import { notFound } from "next/navigation";
import payloadConfig from "@/payload.config";
import { CollectionSlug, getPayload } from "payload";
import { getPage } from "../getPage.ts";
import { recursivelySearchForDataByName } from "@dexilion/payload-nested-docs";
import { getTenantName } from "@dexilion/payload-multi-tenant";
import { Theme } from "../types.ts";
import { RefreshRouteOnSave } from "./RefreshRouteOnSave.tsx";
import { headers } from "next/headers";

function isNextHttpError(error: unknown, code: number): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeDigest = (error as { digest?: unknown }).digest;
  return (
    typeof maybeDigest === "string" &&
    maybeDigest.startsWith("NEXT_HTTP_ERROR_FALLBACK;" + code)
  );
}

export type PageType = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
  pagesSlug: string;
};

export async function Page({
  params,
  searchParams,
  pagesSlug = "pages",
}: PageType) {
  const { segments } = await params;

  const tenantName = await getTenantName();
  if (!tenantName) {
    throw new Error(
      "[@dexilion/payload-tenant-theming] No tenant found with that name.",
    );
  }

  // Get the theme name from the tenant record
  const payload = await getPayload({ config: payloadConfig });
  const tenantsSlug = "tenants";
  const themeFieldName = "theme";

  const res = await payload.find({
    collection: tenantsSlug as CollectionSlug,
    where: { domain: { equals: tenantName } },
    limit: 1,
  });

  if (res.totalDocs === 0) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No tenant found with name "${tenantName}" in collection "${tenantsSlug}".`,
    );
  }

  const tenantDoc = res.docs[0];
  const themeName = tenantDoc[themeFieldName as keyof typeof tenantDoc] as
    | string
    | undefined;

  if (!themeName) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No theme set for tenant "${tenantName}".`,
    );
  }

  // Dynamically import the full theme (only loaded here, not during config evaluation)
  let theme: Theme | null = null;
  try {
    const themeModule = await import(`@/themes/${themeName}/index`);
    theme = themeModule.default;
  } catch (e) {
    payload.logger.error(
      `[@dexilion/payload-tenant-theming] Failed to load theme "${themeName}": ${e}`,
    );
  }

  if (!theme || !theme.Layout) {
    throw new Error("[@dexilion/payload-tenant-theming] No theme found.");
  }

  let page;
  try {
    page = await getPage({
      segments,
      pagesSlug,
    });

    if (!page) {
      return notFound();
    }
  } catch (error) {
    if (isNextHttpError(error, 404)) {
      return notFound();
    }

    payload.logger.error(error);
    return notFound();
  }

  const content = recursivelySearchForDataByName<
    {
      blockType: string;
    }[]
  >(page, "content");
  if (!content || !Array.isArray(content)) {
    payload.logger.warn(
      `[@dexilion/payload-tenant-theming] No content found on page with ID "${page.id}".`,
    );
    return notFound();
  }

  const layoutKey = recursivelySearchForDataByName<string>(page, "layout");
  const layout = theme.Layout.find((Layout) => {
    if (typeof Layout.option === "string") {
      return Layout.option === layoutKey;
    }
    return Layout.option.value === layoutKey;
  });
  if (!layout) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No layout found for layout key "${layoutKey}" on page with ID "${page.id}".`,
    );
  }

  const Layout = await layout.component();
  const proto = (await headers()).get("x-forwarded-proto");

  return (
    <>
      <Layout>
        {await Promise.all(
          content.map(async (block, index) => {
            const Widget = theme.Widgets.find(
              (Widget) => Widget.block.slug === block.blockType,
            );
            if (!Widget?.component) {
              throw new Error(
                `[@dexilion/payload-tenant-theming] No widget found for block type "${block.blockType}" on page with ID "${page.id}".`,
              );
            }

            const Component = await Widget.component();
            if (!Component) {
              throw new Error(
                `[@dexilion/payload-tenant-theming] No component found for block type "${block.blockType}" on page with ID "${page.id}".`,
              );
            }

            return <Component key={index} block={block} />;
          }),
        )}
      </Layout>
      <RefreshRouteOnSave serverURL={`${proto}://${tenantName}`} />
    </>
  );
}
