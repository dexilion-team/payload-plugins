import { notFound } from "next/navigation";
import payloadConfig from "@/payload.config";
import { getPayload } from "payload";
import { getPage } from "../getPage.ts";
import { recursivelySearchForDataByName } from "@dexilion/payload-nested-docs";
import { getTheme } from "../getTheme.ts";
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

export async function Page({ params, pagesSlug = "pages" }: PageType) {
  const { segments } = await params;

  const tenantName = await getTenantName();
  if (!tenantName) {
    throw new Error(
      "[@dexilion/payload-tenant-theming] No tenant found with that name.",
    );
  }

  let theme: Theme | null = null;
  try {
    theme = await getTheme({
      config: await payloadConfig,
      tenantName,
    });
  } catch {}

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
    const payload = await getPayload({ config: payloadConfig });

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
  >(page, "content", ["parent"]);
  if (!content || !Array.isArray(content)) {
    payload.logger.warn(
      `[@dexilion/payload-tenant-theming] No content found on page with ID "${page.id}".`,
    );
    return notFound();
  }

  const layoutKey = recursivelySearchForDataByName<string>(page, "layout", [
    "parent",
  ]);
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
