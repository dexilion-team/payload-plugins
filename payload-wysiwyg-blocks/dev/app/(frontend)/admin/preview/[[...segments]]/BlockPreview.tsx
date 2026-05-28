"use client";

import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

type Field = { type: string; name: string; [key: string]: unknown };

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
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: "wysiwyg-edit",
        path: `${contentPath}.${blockIndex}.${fieldName}`,
        rect: {
          top: rect.top + window.scrollY,
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
      onClick={handleClick}
      style={{
          cursor: "pointer",
          minHeight: "2rem",
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
}: {
  field: Field;
  value: unknown;
  blockIndex: number;
  contentPath: string;
}) {
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
}: {
  block: Record<string, unknown>;
  fields: Field[];
  blockIndex: number;
  contentPath: string;
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
          />
        </div>
      ))}
    </div>
  );
}
