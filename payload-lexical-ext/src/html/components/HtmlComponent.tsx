"use client";

import React from "react";
import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import { HtmlComponentProps } from "../types";
import { EDIT_HTML } from "../features/command";
import "./HtmlComponent.css";

export default function HtmlComponent({
  html,
  nodeKey,
}: HtmlComponentProps): React.JSX.Element {
  const [editor] = useLexicalComposerContext();

  return (
    <div
      className="EditorHtmlBlock"
      onDoubleClick={(e) => {
        // Double-click opens the settings drawer; a single click selects the
        // node (handled by Payload's DecoratorPlugin).
        e.preventDefault();
        editor.dispatchCommand(EDIT_HTML, { nodeKey });
      }}
    >
      <div className="EditorHtmlBlock__label">HTML</div>
      {/*
        The block's markup is shown as source, not rendered: embed code often
        has no visible box of its own inside the editor, and rendering it would
        also run whatever the markup carries.
      */}
      <pre className="EditorHtmlBlock__source">{html}</pre>
    </div>
  );
}
