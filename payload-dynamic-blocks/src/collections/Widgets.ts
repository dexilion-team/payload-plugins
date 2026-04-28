import { type CollectionConfig } from "payload";
import { WIDGET_COLLECTION_NAME } from "../constants";
import { parseWidgetFields } from "../utils/parseWidgetFields";

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
      type: "code",
      validate: (value) => {
        if (typeof value !== "string") {
          return "Widget must be defined";
        }

        try {
          parseWidgetFields(value);
          return true;
        } catch (err) {
          return "Invalid widget code: " + (err as Error).message;
        }
      },
      admin: {
        language: "html",
      },
      required: true,
    },
  ],
});
