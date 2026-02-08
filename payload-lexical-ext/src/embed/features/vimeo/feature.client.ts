"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { INSERT_VIMEO_EMBED } from "./command";
import Icon from "./Icon";
import { VimeoNode } from "../../nodes/VimeoNode";
import { createPlugin } from "../createPlugin";
import InsertEmbedDropdownItem from "../InsertEmbedDropdownItem";

export const VimeoFeatureClient = createClientFeature(() => {
  return {
    toolbarFixed: {
      groups: [
        {
          key: "vimeo",
          order: 21,
          type: "buttons",
          items: [
            {
              key: "vimeo",
              label: "Insert Vimeo Video",
              ChildComponent: Icon,
              Component: InsertEmbedDropdownItem as any,
              command: INSERT_VIMEO_EMBED,
            },
          ],
        },
      ],
    },
    plugins: [
      {
        Component: createPlugin({
          command: INSERT_VIMEO_EMBED,
          node: VimeoNode,
          title: "Insert Vimeo Video",
          placeholder: "Enter Vimeo URL or video ID",
          description:
            "Paste a Vimeo video URL or enter the video ID (e.g., 123456789)",
        }),
        position: "normal",
      },
    ],
    nodes: [VimeoNode],
  };
});
