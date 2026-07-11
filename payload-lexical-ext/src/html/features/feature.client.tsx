"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { INSERT_HTML } from "./command";
import Icon from "./Icon";
import { HtmlNode } from "../nodes/HtmlNode";
import { createPlugin } from "./createPlugin";
import InsertHtmlDropdownItem from "./InsertHtmlDropdownItem";

export const HtmlFeatureClient = createClientFeature(() => {
  return {
    toolbarFixed: {
      groups: [
        {
          key: "html",
          order: 26,
          type: "buttons",
          items: [
            {
              key: "html",
              label: "Insert HTML",
              ChildComponent: Icon,
              Component: InsertHtmlDropdownItem as any,
              command: INSERT_HTML,
            },
          ],
        },
      ],
    },
    plugins: [
      {
        Component: createPlugin({
          title: "Insert HTML",
        }),
        position: "normal",
      },
    ],
    nodes: [HtmlNode],
  };
});
