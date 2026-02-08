"use client";

import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import {
  $isParagraphNode,
  COMMAND_PRIORITY_LOW,
  LexicalNode,
  ParagraphNode,
  SELECTION_CHANGE_COMMAND,
} from "@payloadcms/richtext-lexical/lexical";
import { $isHeadingNode, HeadingNode } from "@payloadcms/richtext-lexical/lexical/rich-text";
import getSelection from "../getSelection";
import { PaintBucket } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { UPDATE_BG_COLOR } from "./command";
import { CustomHeadingNode } from "../../nodes/CustomHeadingNode";
import { CustomParagraphNode } from "../../nodes/CustomParagraphNode";

export default function Icon() {
  const [editor] = useLexicalComposerContext();
  const [color, setColor] = useState<string>("");
  const readColorFromSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = getSelection();
      let nextColor = "";

      if (selection !== null) {
        const firstNode = selection.getNodes()[0];
        const blockNode = findClosestBlockColorNode(firstNode);

        if (blockNode) {
          const style =
            (blockNode as any).getStyle?.() || (blockNode as any).__style || "";
          const match = style.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
          if (match?.[1]) {
            nextColor = match[1].trim();
          }
        }
      }

      setColor((prev) => (prev === nextColor ? prev : nextColor));
    });
  }, [editor]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      editor.update(() => {
        const selection = getSelection();
        if (selection !== null) {
          const styledNodeKeys = new Set<string>();

          selection.getNodes().forEach((node) => {
            const candidate = ensureStylableBlockColorNode(
              findClosestBlockColorNode(node),
            );

            if (!candidate) {
              return;
            }

            const nodeKey = candidate.getKey();
            if (styledNodeKeys.has(nodeKey)) {
              return;
            }
            styledNodeKeys.add(nodeKey);

            const currentStyles = (candidate as any).getStyle?.() || (candidate as any).__style || "";
            const stylesArray = currentStyles
              .split(";")
              .filter((style: string) => style.trim() !== "")
              .map((style: string) => {
                const [key, val] = style
                  .split(":")
                  .map((s: string) => s.trim());
                return { [key as string]: val };
              });

            const newStyles = {
              ...Object.assign({}, ...stylesArray),
              ...styles,
            };

            if (!styles["background-color"]) {
              delete (newStyles as Record<string, string>)["background-color"];
            }

            const styleString = Object.entries(newStyles)
              .map(([key, val]) => `${key}: ${val}`)
              .join("; ");

            if ((candidate as any).setStyle) {
              (candidate as any).setStyle(styleString ? `${styleString};` : "");
            } else {
              (candidate as any).__style = styleString ? `${styleString};` : "";
            }
          });
        }
      });
    },
    [editor],
  );

  useEffect(() => {
    return editor.registerCommand(
      UPDATE_BG_COLOR,
      (payload: { color: string }) => {
        applyStyleText(
          payload.color ? { "background-color": payload.color } : {},
        );
        readColorFromSelection();
        return true;
      },
      1,
    );
  }, [editor, applyStyleText, readColorFromSelection]);

  useEffect(() => {
    const unregisterUpdate = editor.registerUpdateListener(() => {
      readColorFromSelection();
    });

    const unregisterSelectionChange = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        readColorFromSelection();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    readColorFromSelection();

    return () => {
      unregisterUpdate();
      unregisterSelectionChange();
    };
  }, [editor, readColorFromSelection]);

  return <PaintBucket style={{ color }} size={18} />;
}

const isBlockColorNode = (node: LexicalNode | null | undefined): boolean => {
  const type = node?.getType?.();
  return (
    type === "paragraph" ||
    type === "heading" ||
    type === "custom-paragraph" ||
    type === "custom-heading"
  );
};

const findClosestBlockColorNode = (
  startNode: LexicalNode | null | undefined,
): LexicalNode | null => {
  let current = startNode ?? null;

  while (current) {
    if (isBlockColorNode(current)) {
      return current;
    }
    current = current.getParent();
  }

  return null;
};

const ensureStylableBlockColorNode = (
  node: LexicalNode | null,
): LexicalNode | null => {
  if (!node) {
    return null;
  }

  const type = node.getType();
  if (type === "custom-paragraph" || type === "custom-heading") {
    return node;
  }

  if ($isParagraphNode(node)) {
    return convertParagraphToCustom(node);
  }

  if ($isHeadingNode(node)) {
    return convertHeadingToCustom(node);
  }

  return node;
};

const convertParagraphToCustom = (node: ParagraphNode): CustomParagraphNode => {
  const replacement = new CustomParagraphNode();
  replacement.setFormat(node.getFormatType());
  replacement.setIndent(node.getIndent());
  replacement.setDirection(node.getDirection());
  replacement.setTextFormat(node.getTextFormat());
  replacement.setTextStyle(node.getTextStyle());
  node.replace(replacement, true);
  return replacement;
};

const convertHeadingToCustom = (node: HeadingNode): CustomHeadingNode => {
  const replacement = new CustomHeadingNode(node.getTag());
  replacement.setFormat(node.getFormatType());
  replacement.setIndent(node.getIndent());
  replacement.setDirection(node.getDirection());
  node.replace(replacement, true);
  return replacement;
};
