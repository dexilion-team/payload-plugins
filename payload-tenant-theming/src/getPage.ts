import payloadConfig from "@/payload.config";
import { getTenantName } from "@dexilion/payload-multi-tenant";
import { CollectionSlug, Field, getPayload } from "payload";
import { getTheme } from "./getTheme";

export const getPage = async ({
  segments,
  pagesSlug,
}: {
  segments: string[];
  pagesSlug: string;
}): Promise<any | null> => {
  const payload = await getPayload({ config: payloadConfig });

  const tenantName = await getTenantName();

  if (!tenantName) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No tenant found for the current request.`,
    );
  }

  let theme;
  try {
    theme = await getTheme({
      config: await payloadConfig,
      tenantName,
    });

    if (!theme || !theme.Layout) {
      throw new Error(
        `[@dexilion/payload-tenant-theming] No theme or layout found for tenant "${tenantName}".`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      payload.logger.warn(error.message);
    } else {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] Unknown error occurred while fetching theme.",
      );
    }
  }

  const pathFieldKey = await getPathFieldKey(pagesSlug);
  if (!pathFieldKey) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No "path" field found in the "${pagesSlug}" collection.`,
    );
  }

  let path = await payload.find({
    collection: pagesSlug as CollectionSlug,
    where: {
      [pathFieldKey]: {
        equals: "/" + (segments ?? []).join("/"),
      },
    },
  });
  if (!path.totalDocs && segments.length == 1 && !isNaN(Number(segments[0]))) {
    path = await payload.find({
      collection: pagesSlug as CollectionSlug,
      where: {
        id: { equals: Number(segments[0]) },
      },
    });
  }

  return path.docs[0] || null;
};

async function getPathFieldKey(pagesSlug: string) {
  const config = await payloadConfig;
  const pagesCollection = config.collections.find((c) => c.slug === "pages")!;
  return recursivelyBuildKey(pagesCollection.fields as any, "path");
}

function recursivelyBuildKey(
  data: { name: string; fields?: any[]; tabs?: any[]; blocks?: any[] }[],
  name: string,
  prev?: string,
): string | null {
  for (const field of data) {
    if ("name" in field && field.name === name) {
      return prev ? `${prev}.${field.name}` : field.name;
    }

    const value = field["fields"] || field["tabs"] || field["blocks"];
    if (typeof value === "object" && value !== null) {
      const nestedKey = recursivelyBuildKey(
        value,
        name,
        prev ? `${prev}.${field.name}` : field.name,
      );
      if (nestedKey) {
        return nestedKey;
      }
    }
  }

  return null;
}
