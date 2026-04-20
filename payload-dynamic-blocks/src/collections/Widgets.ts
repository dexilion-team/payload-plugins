import { type CollectionConfig } from "payload";

export const createWidgetCollection = (): CollectionConfig => ({
  slug: "widgets",
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "widget",
      type: "json",
      required: true,
    },
  ],
});
