import {
  createParentField,
  createPathField,
  createSlugField,
} from "@dexilion/payload-nested-docs";
import { getPreference } from "@dexilion/payload-utils";
import type {
  Block,
  CollectionConfig,
  CollectionSlug,
  Option,
  PayloadRequest,
  Tab,
} from "payload";
import pageRead from "../access/pageRead";
import setDefaultUserPreferences from "../utils/setDefaultUserPreferences";
//import { getPreferences } from "@payloadcms/ui/utilities/upsertPreferences";
import getThemeName from "../utils/getThemeName";

export type PagesConfig = {
  slug?: string;
  layouts: Record<string, Option[]>;
  blocks: Record<string, Block[]>;
  tabs?: Tab[];
  tenantDomainFieldKey?: string;
};

export const createPagesCollection = ({
  slug,
  layouts,
  blocks,
  tabs,
  tenantDomainFieldKey,
}: PagesConfig): CollectionConfig => ({
  slug: slug ?? "pages",
  admin: {
    livePreview: {
      url: async ({ req, data }) => {
        const { payload } = req;
        const tenantId = (await getPreference({
          req,
          key: "admin-tenant-select",
        })) as number;
        if (!tenantId) {
          console.warn(
            "[@dexilion/payload-pms] No tenant selected for live preview. Please set the 'admin-tenant-select' preference.",
          );
          return undefined;
        }
        const tenant = (await payload.findByID({
          collection: "tenants" as CollectionSlug,
          id: `${tenantId}`,
          req,
        })) as { [tenantDomainFieldKey: string]: string };
        const domain = tenant?.[tenantDomainFieldKey || "domain"] as string;

        return `${req.protocol}//${domain}/${data.id}`;
      },
      breakpoints: [
        {
          label: "Mobile",
          name: "mobile",
          width: 375,
          height: 667,
        },
        {
          label: "Tablet",
          name: "tablet",
          width: 768,
          height: 1024,
        },
        {
          label: "Desktop",
          name: "desktop",
          width: 1280,
          height: 768,
        },
      ],
    },
    hideAPIURL: process.env.NODE_ENV === "production",
    defaultColumns: ["generalTab.title", "generalTab.path", "updatedAt"],
    useAsTitle: "display",
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
  access: {
    read: pageRead,
  },
  hooks: {
    afterOperation: [setDefaultUserPreferences],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          name: "generalTab",
          label: "General",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
            },
            createSlugField(
              (slug ?? "pages") as CollectionSlug,
              "generalTab.slug",
            ),
            createParentField(
              (slug ?? "pages") as CollectionSlug,
              "generalTab.slug",
            ),
            createPathField((slug ?? "pages") as CollectionSlug),
          ],
        },
        {
          name: "contentTab",
          label: "Content",
          fields: [
            {
              name: "layout",
              type: "text",
              admin: {
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: "layoutVariant",
              type: "select",
              label: ({ t }) =>
                // @ts-ignore
                t("plugin-pms:layoutVariantLabel"),
              required: true,
              virtual: true,
              options: Object.keys(layouts).reduce((acc, key) => {
                const layoutOptions = layouts[key] || [];
                return [
                  ...acc,
                  ...layoutOptions.map((option) => {
                    const label =
                      typeof option === "string" ? option : option.label;
                    const value =
                      typeof option === "string" ? option : option.value;

                    return {
                      label,
                      value: `${key}-${value}`,
                    };
                  }),
                ];
              }, [] as Option[]),
              admin: {
                components: {
                  Field: "@dexilion/payload-pms/admin/LayoutVariantSelect",
                },
              },
              hooks: {
                afterRead: [
                  async ({ siblingData, req }) => {
                    if (!req.user) {
                      return undefined;
                    }

                    const themeName = await getThemeName({ req });
                    const layout = siblingData?.layout;
                    return layout ? `${themeName}-${layout}` : undefined;
                  },
                ],
                beforeChange: [
                  async ({ value, siblingData, req }) => {
                    if (!req.user) {
                      console.error(
                        "[@dexilion/payload-pms] Unable to set layout beforeChange: no user in request",
                      );
                      return;
                    }

                    const themeName = await getThemeName({ req });
                    siblingData.layout = value?.replace(`${themeName}-`, "");
                  },
                ],
              },
            },
            {
              name: "content",
              type: "json",
              admin: {
                readOnly: true,
                hidden: true,
              },
            },
            {
              name: "widgets",
              label: ({ t }) =>
                // @ts-ignore
                t("plugin-pms:widgetsLabel"),
              type: "blocks",
              virtual: true,
              blocks: Object.keys(blocks).reduce((acc, key) => {
                const blockOptions = blocks[key] || [];
                return [
                  ...acc,
                  ...blockOptions.map((block) => ({
                    ...block,
                    slug: `${key}-${block.slug}`,
                  })),
                ];
              }, [] as Block[]),
              required: true,
              filterOptions: async ({ req }) => {
                const themeName = await getThemeName({ req });
                if (!themeName) {
                  return [];
                }

                const blockOptions = blocks[themeName] || [];

                return blockOptions.map(
                  (block) => `${themeName}-${block.slug}`,
                );
              },
              hooks: {
                afterRead: [
                  async ({ siblingData, req }) => {
                    if (!req.user) {
                      return [];
                    }

                    const themeName = await getThemeName({ req });
                    return (siblingData?.content || []).map((block: any) => ({
                      ...block,
                      blockType: `${themeName}-${block.blockType}`,
                    }));
                  },
                ],
                beforeChange: [
                  async ({ siblingData, req }) => {
                    if (!req.user) {
                      console.error(
                        "[@dexilion/payload-pms] Unable to set widgets content beforeChange: no user in request",
                      );
                      return;
                    }

                    const themeName = await getThemeName({ req });
                    const widgets = siblingData?.widgets || [];

                    siblingData.content = widgets.map((widget: any) => ({
                      ...widget,
                      blockType: widget.blockType.replace(`${themeName}-`, ""),
                    }));
                  },
                ],
              },
            },
          ],
        },
        ...(tabs ?? []),
      ],
    },
    {
      name: "display",
      type: "text",
      admin: {
        readOnly: true,
        hidden: true,
      },
      hooks: {
        beforeChange: [
          async ({ siblingData }) => {
            const title = siblingData?.generalTab?.title || "";
            const path = siblingData?.generalTab?.path || "";

            siblingData.display = title ? `${title} [${path}]` : "<New Page>";
          },
        ],
      },
    },
  ],
});
