"use client";

import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import {
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  type RangeSelection,
  SELECTION_CHANGE_COMMAND,
} from "@payloadcms/richtext-lexical/lexical";
import { $forEachSelectedTextNode } from "@payloadcms/richtext-lexical/lexical/selection";
import getSelection from "../getSelection";
import { Highlighter } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { UPDATE_HL_COLOR } from "./command";

export default function Icon() {
  const [editor] = useLexicalComposerContext();
  const [color, setColor] = useState<string>("");
  const readColorFromSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = getSelection();
      let nextColor = "";

      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          const caretNode = getCaretTextNode(selection);
          if (caretNode) {
            const style = caretNode.getStyle?.() || "";
            const match = style.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
            if (match?.[1]) {
              nextColor = match[1].trim();
            }
          }
        } else {
          let found = false;
          $forEachSelectedTextNode((textNode) => {
            if (found) {
              return;
            }

            const style = textNode.getStyle?.() || "";
            const match = style.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
            if (match?.[1]) {
              nextColor = match[1].trim();
              found = true;
            }
          });
        }
      }

      setColor((prev) => (prev === nextColor ? prev : nextColor));
    });
  }, [editor]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      editor.update(() => {
        const selection = getSelection();
        if ($isRangeSelection(selection)) {
          $forEachSelectedTextNode((textNode) => {
            const currentStyles = textNode.getStyle?.() || "";
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

            const styleString =
              Object.entries(newStyles)
                .map(([key, val]) => `${key}: ${val}`)
                .join("; ");

            textNode.setStyle(styleString ? `${styleString};` : "");
          });
        }
      });
    },
    [editor],
  );

  useEffect(() => {
    return editor.registerCommand(
      UPDATE_HL_COLOR,
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

  return <Highlighter style={{ color }} size={18} />;
}

const getCaretTextNode = (selection: RangeSelection) => {
  const anchorNode = selection.anchor.getNode();
  if ($isTextNode(anchorNode)) {
    return anchorNode;
  }

  if ($isElementNode(anchorNode)) {
    const offset = selection.anchor.offset;
    const candidate =
      anchorNode.getChildAtIndex(offset) ??
      anchorNode.getChildAtIndex(offset - 1) ??
      anchorNode.getLastChild();

    if (candidate && $isTextNode(candidate)) {
      return candidate;
    }
  }

  return null;
};
