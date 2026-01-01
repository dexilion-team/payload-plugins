import userHasPermission from "../../../payload-rbac/src/security/userHasPermission";
import {
  createParentField,
  createPathField,
  createSlugField,
} from "@dexilion/payload-nested-docs";
import type {
  Access,
  CollectionAfterOperationHook,
  CollectionConfig,
  CollectionSlug,
} from "payload";

const setDefaultUserPreferences: CollectionAfterOperationHook = async ({
  req,
  req: { payload, user },
  operation,
}) => {
  // HACK: Trigger as soon as possible so by the time the page editor is loaded
  // the default preference is already changed. The "find" operation necessarily
  // happens before the page editor UI loads.
  if (operation !== "find" || !user) {
    return;
  }

  try {
    const authCollectionSlug = payload.config.admin.user;

    const existing = await payload.db.findOne<{
      id: number;
      value: {
        editViewType: "default" | "live-preview";
      };
    }>({
      collection: "payload-preferences" as CollectionSlug,
      where: {
        and: [
          { key: { equals: "collection-pages" } },
          { "user.value": { equals: user.id } },
          { "user.relationTo": { equals: authCollectionSlug } },
        ],
      },
      req,
    });

    // If the preference is already set by the user, do not overwrite it
    if (
      existing?.value?.editViewType &&
      existing?.value?.editViewType !== "default"
    ) {
      return;
    }

    await req.payload.db.upsert({
      collection: "payload-preferences" as CollectionSlug,
      data: {
        key: "collection-pages",
        user: {
          relationTo: authCollectionSlug,
          value: user.id,
        },
        value: {
          ...(existing?.value ?? {}),
          editViewType: "live-preview",
        },
        req,
      },
      where: {
        and: [
          { key: { equals: "collection-pages" } },
          { "user.value": { equals: user.id } },
          { "user.relationTo": { equals: authCollectionSlug } },
        ],
      },
    });
  } catch {
    /* do nothing as existing preferences shouldn't be overwritten */
  }
};

const read: Access = async ({ req }) => {
  const user = req?.user;
  if (!user) {
    return {
      or: [{ _status: { equals: "published" } }],
    };
  }

  return true;
};

export const createPagesCollection = ({
  widgets,
}: {
  widgets: Record<string, any>;
}): CollectionConfig => ({
  slug: "pages",
  admin: {
    livePreview: {
      url: ({ data, collectionConfig, locale }) => {
        return `/${data?.slug}`;
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
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
  access: {
    read,
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
            createSlugField(),
            createParentField("pages"),
            createPathField("pages"),
          ],
        },
        {
          name: "contentTab",
          label: "Content",
          fields: [
            {
              name: "content",
              type: "blocks",
              required: true,
              blocks: [
                {
                  slug: "container",
                  imageURL:
                    "https://fastly.picsum.photos/id/237/536/354.jpg?hmac=i0yVXW1ORpyCZpQ-CknuyV-jbtU7_x9EBQVhvT5aRr0",
                  imageAltText: "Container Block",
                  fields: [
                    {
                      name: "title",
                      type: "text",
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
