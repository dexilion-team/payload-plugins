import { createNode, createServerFeature } from "@payloadcms/richtext-lexical";
import { HtmlNode } from "../nodes/HtmlNode";
import { SerializedHtmlNode } from "../types";

export const HtmlFeature = createServerFeature({
  feature() {
    const htmlField = {
      name: "html",
      type: "textarea",
      label: "HTML",
      required: true,
      admin: {
        description: "Custom HTML that will be rendered as-is on the page.",
        placeholder: "<div>…</div>",
        rows: 10,
      },
    } as const;

    return {
      ClientFeature: "@dexilion/payload-lexical-ext/client#HtmlFeatureClient",
      generateSchemaMap: () => {
        const map = new Map();

        map.set("fields", {
          fields: [htmlField],
        });

        return map;
      },
      nodes: [
        createNode({
          node: HtmlNode,
          converters: {
            html: {
              nodeTypes: [HtmlNode.getType()],
              // Rendered as-is: this is a raw-HTML block by design.
              async converter({ node }: { node: SerializedHtmlNode }) {
                return node.html ?? "";
              },
            },
          },
        }),
      ],
    };
  },
  key: "html",
});
