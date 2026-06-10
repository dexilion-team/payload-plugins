import type { CollectionConfig } from "payload";

export const Tags: CollectionConfig = {
  slug: "tags",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "updatedAt"],
  },
  fields: [
    {
      name: "name",
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
    },
  ],
};
