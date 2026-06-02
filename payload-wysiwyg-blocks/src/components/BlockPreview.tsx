"use client";

import { useEffect, useRef } from "react";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export type PreviewField = { type: string; name: string; [key: string]: unknown };

if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => {
    window.parent.postMessage({ type: "wysiwyg-scroll", scrollY: window.scrollY }, "*");
  }, { passive: true });

  window.addEventListener("message", (e) => {
    if (e.data?.type !== "wysiwyg-wheel") return;
    const scroller = document.scrollingElement ?? document.documentElement;
    scroller?.scrollBy({ top: e.data.deltaY, behavior: "instant" });
  });
}

function RichTextPreview({
  value,
  blockIndex,
  fieldName,
  contentPath,
}: {
  value: unknown;
  blockIndex: number;
  fieldName: string;
  contentPath: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const path = `${contentPath}.${blockIndex}.${fieldName}`;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "wysiwyg-spacer" || e.data.path !== path) return;
      const el = divRef.current;
      if (!el) return;

      const height: number = e.data.height ?? 0;

      el.style.opacity = height > 0 ? "0" : "";
      el.style.pointerEvents = height > 0 ? "none" : "";

      let spacer = el.nextElementSibling as HTMLDivElement | null;
      if (spacer?.dataset.wysiwygSpacer !== path) {
        spacer = document.createElement("div");
        spacer.dataset.wysiwygSpacer = path;
        spacer.style.transition = "height 0.15s ease";
        el.after(spacer);
      }

      spacer.style.height = `${height}px`;
      if (height === 0) spacer.remove();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [path]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    // The field wrapper div's previous sibling is the field above us in the same block
    const fieldWrapper = el.parentElement;
    const prevFieldWrapper = fieldWrapper?.previousElementSibling;
    const prevFieldLastChild = prevFieldWrapper?.lastElementChild;
    const aboveMargin = prevFieldLastChild
      ? parseFloat(getComputedStyle(prevFieldLastChild).marginBottom)
      : 0;
    window.parent.postMessage(
      {
        type: "wysiwyg-edit",
        path,
        rect: {
          top: rect.top + window.scrollY + aboveMargin,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        },
      },
      "*",
    );
  };

  const html = value
    ? convertLexicalToHTML({ data: value as SerializedEditorState })
    : null;

  return (
    <div
      ref={divRef}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        minHeight: "2rem",
        overflow: "hidden",
        backgroundImage: `linear-gradient(90deg, #ccc 8px, transparent 8px), linear-gradient(90deg, #ccc 8px, transparent 8px), linear-gradient(0deg, #ccc 8px, transparent 8px), linear-gradient(0deg, #ccc 8px, transparent 8px)`,
        backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
        backgroundSize: "20px 2px, 20px 2px, 2px 20px, 2px 20px",
        backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
      }}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p>Click here to edit...</p>
      )}
    </div>
  );
}

function RenderField({
  field,
  value,
  blockIndex,
  contentPath,
  renderField,
}: {
  field: PreviewField;
  value: unknown;
  blockIndex: number;
  contentPath: string;
  renderField?: (field: PreviewField, value: unknown) => React.ReactNode;
}) {
  if (renderField) {
    const custom = renderField(field, value);
    if (custom !== undefined) return <>{custom}</>;
  }

  switch (field.type) {
    case "richText":
      return (
        <RichTextPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
        />
      );
    case "text":
    case "textarea":
    case "email":
    case "number":
    case "date":
    case "checkbox":
    case "select":
    case "radio":
    case "relationship":
    case "upload":
    case "json":
    case "code":
    case "point":
    case "array":
    case "group":
    case "collapsible":
    case "row":
    case "tabs":
    case "join":
    case "ui":
      return <p>Not yet implemented ({field.type})</p>;
    default:
      return null;
  }
}

export function BlockPreview({
  block,
  fields,
  blockIndex,
  contentPath,
  renderField,
}: {
  block: Record<string, unknown>;
  fields: PreviewField[];
  blockIndex: number;
  contentPath: string;
  renderField?: (field: PreviewField, value: unknown) => React.ReactNode;
}) {
  return (
    <div>
      {fields.map((field) => (
        <div key={field.name}>
          <RenderField
            field={field}
            value={block[field.name]}
            blockIndex={blockIndex}
            contentPath={contentPath}
            renderField={renderField}
          />
        </div>
      ))}
    </div>
  );
}
