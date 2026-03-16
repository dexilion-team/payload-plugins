import {
  getRelationshipIDs,
  getTenantDomain,
} from "@dexilion/payload-multi-tenant";
import { CollectionSlug, getPayload, SanitizedConfig } from "payload";
import { getTheme } from "./getTheme";

export const getPage = async ({
  segments,
  pagesSlug,
  tenantFieldName = "tenant",
  payloadConfig,
  user,
}: {
  segments: string[];
  pagesSlug: string;
  tenantFieldName?: string;
  payloadConfig: Promise<SanitizedConfig>;
  user?: any;
}): Promise<any | null> => {
  const payload = await getPayload({ config: payloadConfig });

  const domainName = await getTenantDomain();

  if (!domainName) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No tenant found for the current request.`,
    );
  }

  let theme;
  try {
    theme = await getTheme({
      tenantName: domainName,
      payloadConfig,
    });

    if (!theme || !theme.Layout) {
      throw new Error(
        `[@dexilion/payload-tenant-theming] No theme or layout found for tenant "${domainName}".`,
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

  const tenantField = user?.[tenantFieldName as keyof typeof user] as any;
  const userTenantIds = user ? getRelationshipIDs(tenantField?.docs) : [];

  const tenantRes = await payload.find({
    collection: "tenants" as CollectionSlug,
    where: { domain: { equals: domainName } },
    limit: 1,
    disableErrors: true,
  });

  let tenant = tenantRes?.docs?.[0];

  if (!tenant) {
    throw new Error(`No tenant found for "${domainName}"`);
  }

  const tenantIdKey = `${tenantFieldName}.id`;

  let path = await payload.find({
    collection: pagesSlug as CollectionSlug,
    where: {
      and: [
        {
          [pathFieldKey]: {
            equals: "/" + (segments ?? []).join("/").toLowerCase(),
          },
          [tenantIdKey]: {
            equals: tenant.id,
          },
        },
        {
          or: [
            {
              [`${tenantFieldName}.id`]: {
                in: userTenantIds,
              },
            },
            { _status: { equals: "published" } },
          ],
        },
      ],
    },
    disableErrors: true,
    draft: userTenantIds.length > 0,
  });

  if (!path.totalDocs && segments?.length == 1 && !isNaN(Number(segments[0]))) {
    path = await payload.find({
      collection: pagesSlug as CollectionSlug,
      where: {
        and: [
          {
            id: { equals: Number(segments[0]) },
            [tenantIdKey]: { equals: tenant.id },
          },
          {
            or: [
              {
                [`${tenantFieldName}.id`]: {
                  in: userTenantIds,
                },
              },
              { _status: { equals: "published" } },
            ],
          },
        ],
      },
      disableErrors: true,
      draft: userTenantIds.length > 0,
    });
  }

  const page = path.docs[0] || null;

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
