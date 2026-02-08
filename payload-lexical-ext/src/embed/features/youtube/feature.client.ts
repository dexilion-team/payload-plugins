"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { INSERT_YOUTUBE_EMBED } from "./command";
import Icon from "./Icon";
import { YouTubeNode } from "../../nodes/YoutubeNode";
import { createPlugin } from "../createPlugin";
import InsertEmbedDropdownItem from "../InsertEmbedDropdownItem";

export const YoutubeFeatureClient = createClientFeature(() => {
  return {
    toolbarFixed: {
      groups: [
        {
          key: "youtube",
          order: 20,
          type: "buttons",
          items: [
            {
              key: "youtube",
              label: "Insert YouTube Video",
              ChildComponent: Icon,
              Component: InsertEmbedDropdownItem as any,
              command: INSERT_YOUTUBE_EMBED,
            },
          ],
        },
      ],
    },
    plugins: [
      {
        Component: createPlugin({
          command: INSERT_YOUTUBE_EMBED,
          node: YouTubeNode,
          title: "Insert YouTube Video",
          placeholder: "Enter YouTube URL or video ID",
          description:
            "Paste a YouTube video URL or enter the video ID (e.g., dQw4w9WgXcQ)",
        }),
        position: "normal",
      },
    ],
    nodes: [YouTubeNode],
  };
});
