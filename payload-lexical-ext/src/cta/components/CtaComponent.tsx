"use client";

import React from "react";
import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import type { ElementFormatType } from "@payloadcms/richtext-lexical/lexical";
import { CtaComponentProps } from "../types";
import { EDIT_CTA } from "../features/command";
import { CTA_BUTTON_CLASS } from "../nodes/CtaNode";
import "./CtaButton.css";

const justifyForFormat = (
  format?: ElementFormatType,
): React.CSSProperties["justifyContent"] => {
  switch (format) {
    case "center":
      return "center";
    case "right":
    case "end":
      return "flex-end";
    default:
      return "flex-start";
  }
};

export default function CtaComponent({
  url,
  label,
  nodeKey,
  format,
}: CtaComponentProps): React.JSX.Element {
  const [editor] = useLexicalComposerContext();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: justifyForFormat(format),
        width: "100%",
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        editor.dispatchCommand(EDIT_CTA, { nodeKey });
      }}
    >
      <div
        className={CTA_BUTTON_CLASS}
        title={url}
        style={{ cursor: "pointer" }}
      >
        {label}
      </div>
    </div>
  );
}
