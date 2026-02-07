import { getTenantName } from "@dexilion/payload-multi-tenant";
import { CollectionSlug, getPayload, SanitizedConfig } from "payload";
import { getTheme } from "./getTheme";

export const getPage = async ({
  segments,
  pagesSlug,
  tenantFieldKey,
  payloadConfig,
}: {
  segments: string[];
  pagesSlug: string;
  tenantFieldKey?: string;
  payloadConfig: Promise<SanitizedConfig>;
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
      tenantName,
      payloadConfig,
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

  const pathFieldKey = await getPathFieldKey(payloadConfig);
  if (!pathFieldKey) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No "path" field found in the "${pagesSlug}" collection.`,
    );
  }
  const tenantKey = `tenant.${tenantFieldKey ?? "domain"}`;

  let path = await payload.find({
    collection: pagesSlug as CollectionSlug,
    where: {
      [pathFieldKey]: {
        equals: "/" + (segments ?? []).join("/"),
      },
      [tenantKey]: {
        equals: tenantName,
      },
    },
    draft: true,
  });

  if (!path.totalDocs && segments.length == 1 && !isNaN(Number(segments[0]))) {
    path = await payload.find({
      collection: pagesSlug as CollectionSlug,
      where: {
        id: { equals: Number(segments[0]) },
        [tenantKey]: { equals: tenantName },
      },
      draft: true,
    });
  }

  const page = path.docs[0] || null;

  if (page) {
    await processBlockFields(page, payload);
  }

  return page;
};

async function getPathFieldKey(payloadConfig: Promise<SanitizedConfig>) {
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

async function processBlockFields(obj: any, payload: any): Promise<void> {
  if (!obj || typeof obj !== "object") {
    return;
  }

  for (const key in obj) {
    const value = obj[key];

    if (value && typeof value === "object") {
      // Check if this field has a 'root' property (hierarchical structure)
      if ("root" in value && value.root) {
        await processHierarchicalNode(value.root, payload);
      } else if (Array.isArray(value)) {
        // Process arrays
        for (const item of value) {
          await processBlockFields(item, payload);
        }
      } else {
        // Process nested objects
        await processBlockFields(value, payload);
      }
    }
  }
}

async function processHierarchicalNode(node: any, payload: any): Promise<void> {
  if (!node || typeof node !== "object") {
    return;
  }

  // Check if this node is an upload reference
  if (
    node.type === "upload" &&
    typeof node.value === "number" &&
    node.relationTo
  ) {
    try {
      const uploadData = await payload.findByID({
        collection: node.relationTo as CollectionSlug,
        id: node.value,
      });

      // Replace the value with the fetched upload data
      node.value = uploadData;
    } catch (error) {
      payload.logger.warn(
        `[@dexilion/payload-tenant-theming] Failed to fetch upload ${node.value} from ${node.relationTo}`,
      );
    }
  }

  // Recursively process children if they exist
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      await processHierarchicalNode(child, payload);
    }
  }
}
