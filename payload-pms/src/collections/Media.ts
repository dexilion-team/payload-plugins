import type { CollectionConfig } from "payload";

export type MediaConfig = {
  slug?: string;
};

export const createMediaCollection = ({
  slug,
}: MediaConfig): CollectionConfig => ({
  slug: slug ?? "media",
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
  upload: true,
});
