"use client";

import { useEditorConfigContext } from "@payloadcms/richtext-lexical/client";
import {
  $addUpdateTag,
  type LexicalCommand,
} from "@payloadcms/richtext-lexical/lexical";
import type React from "react";

type InsertEmbedDropdownItemProps = {
  active?: boolean;
  enabled?: boolean;
  item: {
    ChildComponent?: React.FC;
    command: LexicalCommand<{ replace: boolean }>;
    key: string;
    label?: string;
  };
};

export default function InsertEmbedDropdownItem({
  active,
  enabled,
  item,
}: InsertEmbedDropdownItemProps): React.JSX.Element {
  const { editor } = useEditorConfigContext();

  const label = item.label ?? item.key;
  const Icon = item.ChildComponent;
  const className = [
    "toolbar-popup__button",
    enabled === false ? "disabled" : "",
    active ? "active" : "",
    item.key ? `toolbar-popup__button-${item.key}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-label={label}
      className={className}
      disabled={enabled === false}
      data-button-key={item.key}
      onClick={() => {
        if (enabled === false) {
          return;
        }

        editor.focus(() => {
          editor.update(() => {
            $addUpdateTag("toolbar");
          });
          editor.dispatchCommand(item.command, { replace: false });
        });
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      type="button"
      title={label}
    >
      {Icon ? <Icon /> : label}
    </button>
  );
}
