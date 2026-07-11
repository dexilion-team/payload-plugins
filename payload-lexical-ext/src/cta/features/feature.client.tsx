"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { INSERT_CTA } from "./command";
import Icon from "./Icon";
import { CtaNode } from "../nodes/CtaNode";
import { createPlugin } from "./createPlugin";
import InsertCtaDropdownItem from "./InsertCtaDropdownItem";

export const CtaFeatureClient = createClientFeature(() => {
  return {
    toolbarFixed: {
      groups: [
        {
          key: "cta",
          order: 25,
          type: "buttons",
          items: [
            {
              key: "cta",
              label: "Insert CTA Button",
              ChildComponent: Icon,
              Component: InsertCtaDropdownItem as any,
              command: INSERT_CTA,
            },
          ],
        },
      ],
    },
    plugins: [
      {
        Component: createPlugin({
          title: "Insert CTA Button",
        }),
        position: "normal",
      },
    ],
    nodes: [CtaNode],
  };
});
