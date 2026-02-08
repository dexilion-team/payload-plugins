"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import getSelection from "../getSelection";
import { UPDATE_BG_COLOR } from "./command";
import Icon from "./Icon";
import Dropdown from "../../components/Dropdown";
import { CustomHeadingNode } from "../../nodes/CustomHeadingNode";
import { CustomParagraphNode } from "../../nodes/CustomParagraphNode";
import type { ColorFeatureProps, ColorDropdownGroup } from "../../types";

export const BgColorFeatureClient = createClientFeature<ColorFeatureProps>(
  ({ props }) => {
    const colors = props?.colors || [];

    return {
      toolbarFixed: {
        groups: [
          {
            key: "bgColor",
            order: 15,
            type: "dropdown",
            ChildComponent: Icon,
            items: [
              {
                key: "bgColor-item",
                Component: Dropdown as any,
                command: UPDATE_BG_COLOR,
                colors,
                current: () => {
                  const selection = getSelection();
                  if (!selection) return "";

                  const nodes = selection.getNodes();
                  if (nodes.length === 0) return "";

                  const parent = nodes[0]?.getParent();
                  if (!parent) return "";

                  const style =
                    (parent as any).getStyle?.() ||
                    (parent as any).__style ||
                    "";
                  if (!style) return "";

                  const match = style.match(/background-color:\s*([^;]+)/);
                  return match ? match[1] : "";
                },
              },
            ],
          } as ColorDropdownGroup,
        ],
      },
      nodes: [CustomParagraphNode, CustomHeadingNode],
    };
  },
);
