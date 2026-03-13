import { CollectionConfig, CollectionSlug } from "payload";

export const createDefaultTenantsCollection = (
  tenantsSlug: string,
  mediaSlug?: string,
): CollectionConfig => ({
  slug: tenantsSlug,
  admin: {
    defaultColumns: ["name"],
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "logo",
      type: "upload",
      relationTo: (mediaSlug ?? "media") as CollectionSlug,
      admin: {
        condition: (props) => {
          if (typeof props.id === "number") {
            return true;
          }
          return false;
        },
      },
    },
  ],
});
