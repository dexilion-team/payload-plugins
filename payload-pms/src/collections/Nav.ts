import { CollectionSlug, GlobalConfig } from "payload";

export type NavConfig = {
  slug: string;
  pagesSlug: string;
};

export const createNavGlobal = (
  options?: Partial<NavConfig>,
): GlobalConfig => ({
  label: "Navigation",
  slug: options?.slug ?? "nav",
  fields: [
    {
      name: "items",
      type: "array",
      required: true,
      fields: [
        {
          name: "page",
          type: "relationship",
          relationTo: (options?.pagesSlug ?? "pages") as CollectionSlug,
          required: true,
        },
      ],
    },
  ],
});
