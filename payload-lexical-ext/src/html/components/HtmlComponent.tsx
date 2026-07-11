"use client";

import React from "react";
import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import { HtmlComponentProps } from "../types";
import { EDIT_HTML } from "../features/command";

export default function HtmlComponent({
  html,
  nodeKey,
}: HtmlComponentProps): React.JSX.Element {
  const [editor] = useLexicalComposerContext();

  return (
    <div
      style={{ width: "100%" }}
      onDoubleClick={(e) => {
        // Double-click opens the settings drawer; a single click selects the
        // node (handled by Payload's DecoratorPlugin).
        e.preventDefault();
        editor.dispatchCommand(EDIT_HTML, { nodeKey });
      }}
    >
      {/*
        The injected HTML is non-interactive inside the editor
        (pointer-events: none) so a click always lands on the wrapper — that
        lets Payload's DecoratorPlugin select the node and prevents any links
        or buttons in the markup from acting while editing.
        suppressHydrationWarning: arbitrary user HTML will not match what the
        server rendered, which is expected for a raw-HTML block.
      */}
      <div
        style={{ pointerEvents: "none" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
