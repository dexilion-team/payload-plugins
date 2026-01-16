import { CollectionSlug, Field, GlobalConfig } from "payload";

export type NavConfig = {
  slug: string;
  pagesSlug: string;
  extraFields?: GlobalConfig["fields"];
  depth?: number;
};

export const createNavGlobal = (
  options?: Partial<NavConfig>,
): GlobalConfig => ({
  label: "Navigation",
  slug: options?.slug ?? "nav",
  fields: [
    {
      name: "items",
      label: "Top Level Items",
      type: "array",
      fields: createFields(
        options?.depth ?? 0,
        options?.pagesSlug,
        options?.extraFields,
      )!,
    },
  ],
});

const createFields = (
  maxDepth: number,
  pagesSlug?: string,
  extraFields?: GlobalConfig["fields"],
  depth: number = 0,
): Field[] => {
  if (depth > maxDepth) {
    return [];
  }

  const sub = createFields(maxDepth, pagesSlug, extraFields, depth + 1);

  return [
    {
      name: "label",
      type: "text",
      required: true,
    },
    {
      name: "page",
      type: "relationship",
      relationTo: (pagesSlug ?? "pages") as CollectionSlug,
      required: true,
      admin: {
        allowCreate: false,
      },
    },
    ...(extraFields ?? []),
    ...(sub.length > 0
      ? [
          {
            name: "sub ".repeat(depth + 1) + "items",
            label: "Sub ".repeat(depth + 1) + "Items",
            type: "array",
            fields: sub,
          } satisfies Field,
        ]
      : []),
  ];
};
