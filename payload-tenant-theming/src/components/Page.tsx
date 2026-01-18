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

  const payload = await getPayload({ config: payloadConfig });

  const tenantName = await getTenantName();
  if (!tenantName) {
    return <UnderConstructionPage />;
  }

  let theme: Theme | null = null;
  try {
    theme = await getTheme({
      tenantName,
    });
  } catch {}

  if (!theme || !theme.Layout) {
    return <UnderConstructionPage />;
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

  if (theme.Layout.length === 0) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No layout found for layout key "${layoutKey}" on page with ID "${page.id}".`,
    );
  }

  let layout = theme.Layout.find((Layout) => {
    if (typeof Layout.option === "string") {
      return Layout.option === layoutKey;
    }
    return Layout.option.value === layoutKey;
  });
  if (!layout) {
    layout = theme.Layout[0];
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

function UnderConstructionPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "3rem 1.5rem",
        backgroundColor: "#f6f6f4",
        color: "#1f1f1f",
        fontFamily:
          '"Iowan Old Style", "Palatino", "Palatino Linotype", "Book Antiqua", Georgia, serif',
      }}
    >
      <section
        style={{
          maxWidth: "36rem",
          width: "100%",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e2dc",
          borderRadius: "12px",
          padding: "2.5rem",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.06)",
        }}
      >
        <p
          style={{
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontSize: "0.75rem",
            margin: 0,
            color: "#6b6b62",
          }}
        >
          Site status
        </p>
        <h1 style={{ margin: "0.75rem 0 0.5rem", fontSize: "2.25rem" }}>
          Under construction
        </h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: "#4a4a45" }}>
          This site is getting its finishing touches. Please check back soon.
        </p>
      </section>
    </main>
  );
}
