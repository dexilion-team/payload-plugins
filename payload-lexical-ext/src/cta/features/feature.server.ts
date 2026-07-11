import { createNode, createServerFeature } from "@payloadcms/richtext-lexical";
import escapeHTML from "escape-html";
import { CtaNode, CTA_BUTTON_CLASS } from "../nodes/CtaNode";
import { SerializedCtaNode } from "../types";

export const CtaFeature = createServerFeature({
  feature() {
    const urlField = {
      name: "url",
      type: "text",
      label: "Link URL",
      required: true,
      admin: {
        description: "The URL the CTA button links to (e.g. https://...).",
        placeholder: "https://example.com",
      },
    } as const;

    const labelField = {
      name: "label",
      type: "text",
      label: "Button Label",
      required: true,
      admin: {
        description: "The text shown on the button.",
        placeholder: "Learn more",
      },
    } as const;

    return {
      ClientFeature: "@dexilion/payload-lexical-ext/client#CtaFeatureClient",
      generateSchemaMap: () => {
        const map = new Map();

        map.set("fields", {
          fields: [urlField, labelField],
        });

        return map;
      },
      nodes: [
        createNode({
          node: CtaNode,
          converters: {
            html: {
              nodeTypes: [CtaNode.getType()],
              async converter({ node }: { node: SerializedCtaNode }) {
                return `<a class="${CTA_BUTTON_CLASS}" href="${escapeHTML(
                  node.url,
                )}">${escapeHTML(node.label)}</a>`;
              },
            },
          },
        }),
      ],
    };
  },
  key: "cta",
});
