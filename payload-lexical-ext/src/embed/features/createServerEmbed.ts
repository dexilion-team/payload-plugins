import { createServerFeature } from "@payloadcms/richtext-lexical";

export const createEmbedServerFeature = ({
  key,
  ClientFeature,
  node,
  fieldDescription,
  fieldLabel,
  fieldPlaceholder,
}: {
  key: string;
  ClientFeature: any;
  node: any;
  fieldDescription?: string;
  fieldLabel?: string;
  fieldPlaceholder?: string;
}) =>
  createServerFeature({
    feature() {
      const fieldAdmin = {
        ...(fieldDescription ? { description: fieldDescription } : {}),
        ...(fieldPlaceholder ? { placeholder: fieldPlaceholder } : {}),
      };

      const videoField = {
        name: "video",
        type: "text",
        label: fieldLabel ?? "Embed URL or Video ID",
        required: true,
        ...(Object.keys(fieldAdmin).length > 0 ? { admin: fieldAdmin } : {}),
      } as const;

      return {
        ClientFeature,
        generateSchemaMap: () => {
          const map = new Map();

          map.set("fields", {
            fields: [videoField],
          });

          return map;
        },
        nodes: [node],
      };
    },
    key,
  });
