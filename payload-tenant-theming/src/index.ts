import { Config } from "payload";

import translationEn from "../translations/en.json";
import { Theme } from "./types";
import { createGetHandler } from "./cssGenerator";

export type { Theme } from "./types";
export { metadataGenerator } from "./metadataGenerator";
export { getTheme } from "./getTheme";

export type PayloadTenantThemingPluginOptions = {
  /**
   * Collection slug for holding tenants.
   * @default "tenants"
   */
  tenantsSlug?: string;

  /**
   * Field name that holds the theme name.
   * @default "theme"
   */
  themeFieldName?: string;

  /**
   * Field name that holds the tenant domain.
   */
  domainFieldName?: string;
};

export const tenantTheming =
  ({
    tenantsSlug = "tenants",
    themeFieldName = "theme",
    domainFieldName = "domain",
  }: PayloadTenantThemingPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];

    // Verify tenants collection exists
    const tenantsCollection = config.collections.find(
      (c) => c.slug === tenantsSlug,
    );
    if (!tenantsCollection) {
      throw new Error(
        `[@dexilion/payload-tenant-theming] No tenants collection found with slug "${tenantsSlug}". Is the multi-tenant plugin configured correctly?`,
      );
    }

    config.endpoints = [
      ...(incomingConfig.endpoints ?? [
        {
          path: "/theme.css",
          method: "get",
          handler: async (req) => {
            return createGetHandler()();
          },
        },
      ]),
    ];

    // Add CSS endpoint to the tenants collection
    // tenantsCollection.endpoints = tenantsCollection.endpoints || [];
    // tenantsCollection.endpoints.push();

    tenantsCollection.fields = tenantsCollection.fields || [];

    // Verify if the theme field is already configured
    const existingThemeField = tenantsCollection.fields.find(
      (field) => "name" in field && field.name === themeFieldName,
    );
    if (existingThemeField && existingThemeField.type !== "text") {
      throw new Error(
        `[@dexilion/payload-tenant-theming] The "theme" field in the tenants collection must be of type "text".`,
      );
    }

    // Add the theme field if it doesn't exist
    if (!existingThemeField) {
      tenantsCollection.fields.push({
        name: themeFieldName,
        label: ({ t }) =>
          // @ts-ignore
          t("plugin-tenant-theming:themeFieldLabel"),
        type: "select",
        options:
          config.custom?.themes.map((theme: Theme) => ({
            label: theme.label,
            value: theme.name,
          })) ?? [],
        required: true,
      });
    }

    // Verify if the domain field is already configured
    const existingDomainField = tenantsCollection.fields.find(
      (field) => "name" in field && field.name === "domain",
    );
    if (existingDomainField && existingDomainField.type !== "text") {
      throw new Error(
        `[@dexilion/payload-tenant-theming] The "domain" field in the tenants collection must be of type "text".`,
      );
    }

    // Add the domain field if it doesn't exist
    if (!existingDomainField) {
      tenantsCollection.fields.push({
        name: domainFieldName,
        label: ({ t }) =>
          // @ts-ignore
          t("plugin-tenant-theming:domainFieldLabel"),
        type: "text",
        required: true,
      });
    }

    // Add i18n
    config.i18n = {
      ...(config.i18n || {}),
      translations: {
        ...(config.i18n?.translations || {}),
        en: {
          ...(config.i18n?.translations?.en || {}),
          ...translationEn,
        },
      },
    };

    return config;
  };
