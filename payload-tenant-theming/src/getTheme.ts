import { CollectionSlug, Config, getPayload, SanitizedConfig } from "payload";
import { Theme } from "./types";

export type GetThemeParams = {
  tenantsSlug?: string;
  tenantName: string;
  themeFieldName?: string;
  payloadConfig: Promise<SanitizedConfig>;
};

export async function getTheme({
  payloadConfig,
  tenantsSlug = "tenants",
  tenantName,
  themeFieldName = "theme",
}: GetThemeParams): Promise<Theme> {
  const config = await payloadConfig;
  const payload = await getPayload({ config: payloadConfig });

  let res = await payload.find({
    collection: tenantsSlug as CollectionSlug,
    where: { domain: { equals: tenantName } },
    limit: 1,
    disableErrors: true,
  });

  if (!res?.docs?.length) {
    const all = await payload.find({
      collection: tenantsSlug as CollectionSlug,
      limit: 100,
      disableErrors: true,
    });

    const match = all?.docs?.find((tenant: any) =>
      tenant.aliases?.some((alias: any) => alias.domain === tenantName),
    );

    if (match) {
      res = { ...all, docs: [match], totalDocs: 1 };
    }
  }

  if (!res?.docs?.length) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No tenant found with name "${tenantName}" in collection "${tenantsSlug}".`,
    );
  }

  const doc = res.docs[0];
  if (!doc) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] Tenant document is undefined for tenant "${tenantName}" in collection "${tenantsSlug}".`,
    );
  }
  if (!(themeFieldName in doc)) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] The theme field "${themeFieldName}" does not exist on the tenants collection "${tenantsSlug}".`,
    );
  }
  const themeName = doc[themeFieldName as keyof typeof doc];
  const themes = config.custom?.themes as Theme[] | undefined;
  if (!themes || themes.length === 0) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No themes found in the Payload config under "custom.themes".`,
    );
  }
  const theme = themes.find((t: any) => t.name === themeName);
  if (!theme) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] Theme "${themeName}" not found in the Payload config under "custom.themes".`,
    );
  }
  return theme;
}
