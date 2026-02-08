"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { $isRangeSelection } from "@payloadcms/richtext-lexical/lexical";
import getSelection from "../getSelection";
import { UPDATE_HL_COLOR } from "./command";
import Icon from "./Icon";
import Dropdown from "../../components/Dropdown";
import type { ColorFeatureProps } from "../../types";

export const HighlightColorFeatureClient =
  createClientFeature<ColorFeatureProps>(({ props }) => {
    const colors = props?.colors || [];

    return {
      toolbarFixed: {
        groups: [
          {
            key: "highlightColor",
            order: 11,
            type: "dropdown",
            ChildComponent: Icon,
            items: [
              {
                key: "highlightColor-item",
                Component: Dropdown as any,
                command: UPDATE_HL_COLOR,
                colors,
                current: () => {
                  const selection = getSelection();
                  if (!$isRangeSelection(selection)) return "";

                  const nodes = selection.getNodes();
                  if (nodes.length === 0) return "";

                  const style = (nodes[0] as any).getStyle?.();
                  if (!style) return "";

                  const match = style.match(/background-color:\s*([^;]+)/);
                  return match ? match[1] : "";
                },
              },
            ],
          },
        ],
      },
    };
  });
