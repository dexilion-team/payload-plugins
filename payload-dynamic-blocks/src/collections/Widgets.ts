import { type CollectionConfig } from "payload";
import { WIDGET_COLLECTION_NAME } from "../constants";

export const createWidgetCollection = (): CollectionConfig => ({
  slug: WIDGET_COLLECTION_NAME,
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
