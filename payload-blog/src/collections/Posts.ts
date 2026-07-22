import type { CollectionConfig, CollectionSlug } from "payload";
import { richTextToSearchableText } from "../utils/richTextToSearchableText";

export const createPostsCollection = ({
  mediaSlug,
  tagsSlug,
}: {
  mediaSlug: CollectionSlug;
  tagsSlug: CollectionSlug;
}): CollectionConfig => ({
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      validate: (val: string | string[] | null | undefined) => {
        if (val && typeof val === "string") {
          if (/\s/.test(val)) {
            return "Slug must not contain whitespace";
          }
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)) {
            return "Slug may only contain lowercase letters, numbers, and hyphens (with no consecutive hyphens or leading/trailing hyphens)";
          }
        }
        return true;
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "titleImage",
      type: "upload",
      relationTo: mediaSlug,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: tagsSlug,
      hasMany: true,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      defaultValue: ({ req }) => req.user?.id,
      required: true,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "content",
      type: "richText",
      required: true,
    },
    {
      name: "searchableContent",
      type: "text",
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }: any) =>
            siblingData.title.toLowerCase() +
            "\n\n" +
            siblingData.excerpt.toLowerCase() +
            "\n\n" +
            richTextToSearchableText(siblingData.content),
        ],
      },
    },
  ],
});
