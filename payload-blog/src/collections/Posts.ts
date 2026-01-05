import type { CollectionConfig, CollectionSlug } from "payload";
import {
  lexicalEditor,
  LinkFeature,
  UploadFeature,
} from "@payloadcms/richtext-lexical";

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
    },
    {
      name: "titleImage",
      type: "upload",
      relationTo: mediaSlug,
    },
    {
      name: "author",
      type: "text",
      required: true,
    },
    {
      name: "date",
      type: "date",
      required: true,
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
    },
    {
      name: "link",
      type: "text",
      required: true,
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: tagsSlug,
      hasMany: true,
    },
    {
      name: "content",
      type: "richText",
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          UploadFeature({}),
          LinkFeature({}),
        ],
      }),
    },
  ],
});
