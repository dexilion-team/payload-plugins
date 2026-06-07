"use client";

import { useEffect, useRef, useState } from "react";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export type PreviewField = {
  type: string;
  name: string;
  [key: string]: unknown;
};

if (typeof window !== "undefined") {
  window.addEventListener(
    "scroll",
    () => {
      window.parent.postMessage(
        { type: "wysiwyg-scroll", scrollY: window.scrollY },
        "*",
      );
    },
    { passive: true },
  );

  window.addEventListener("message", (e) => {
    if (e.data?.type === "wysiwyg-wheel") {
      const scroller = document.scrollingElement ?? document.documentElement;
      scroller?.scrollBy({ top: e.data.deltaY, behavior: "instant" });
    }
    if (e.data?.type === "wysiwyg-request-rect") {
      const el = document.querySelector(`[data-wysiwyg-path="${e.data.path}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      window.parent.postMessage({
        type: "wysiwyg-edit",
        path: e.data.path,
        fieldType: (el as HTMLElement).dataset.wysiwygFieldType,
        options: (el as HTMLElement).dataset.wysiwygOptions ? JSON.parse((el as HTMLElement).dataset.wysiwygOptions!) : undefined,
        rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height },
      }, "*");
    }
  });
}

const DASHED_BORDER_BG = {
  backgroundImage: `linear-gradient(90deg, #ccc 8px, transparent 8px), linear-gradient(90deg, #ccc 8px, transparent 8px), linear-gradient(0deg, #ccc 8px, transparent 8px), linear-gradient(0deg, #ccc 8px, transparent 8px)`,
  backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y" as const,
  backgroundSize: "20px 2px, 20px 2px, 2px 20px, 2px 20px",
  backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
};

function useSpacerOpacity(path: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "wysiwyg-spacer" || e.data.path !== path) return;
      const el = ref.current;
      if (!el) return;
      const height: number = e.data.height ?? 0;
      const active: boolean = e.data.active ?? false;
      el.style.opacity = active ? "0" : "";
      el.style.pointerEvents = active ? "none" : "";

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
  return ref;
}

function postEditMessage(
  el: HTMLElement,
  path: string,
  extra?: Record<string, unknown>,
) {
  const rect = el.getBoundingClientRect();
  window.parent.postMessage(
    {
      type: "wysiwyg-edit",
      path,
      rect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      },
      ...extra,
    },
    "*",
  );
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
  const path = `${contentPath}.${blockIndex}.${fieldName}`;
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "wysiwyg-spacer" || e.data.path !== path) return;
      const el = divRef.current;
      if (!el) return;

      const height: number = e.data.height ?? 0;
      const active: boolean = e.data.active ?? false;

      el.style.opacity = active ? "0" : "";
      el.style.pointerEvents = active ? "none" : "";

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

  const [populatedValue, setPopulatedValue] =
    useState<SerializedEditorState | null>(
      (value as SerializedEditorState) ?? null,
    );

  useEffect(() => {
    if (!value) return;
    const state = value as SerializedEditorState;

    const uploadNodes: { node: any; relationTo: string; id: string }[] = [];
    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        if (
          node.type === "upload" &&
          node.relationTo &&
          (typeof node.value === "string" || typeof node.value === "number")
        ) {
          uploadNodes.push({
            node,
            relationTo: node.relationTo,
            id: String(node.value),
          });
        }
        if (node.children) walk(node.children);
      }
    };
    walk(state.root?.children ?? []);

    if (uploadNodes.length === 0) {
      setPopulatedValue(state);
      return;
    }

    Promise.all(
      uploadNodes.map(({ relationTo, id }) =>
        fetch(`/api/${relationTo}/${id}?depth=0`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((docs) => {
      const clone = JSON.parse(JSON.stringify(state));
      const walkClone = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.type === "upload" && node.relationTo) {
            const match = uploadNodes.find((u) => u.id === String(node.value));
            if (match) {
              const idx = uploadNodes.indexOf(match);
              if (docs[idx]) node.value = docs[idx];
            }
          }
          if (node.children) walkClone(node.children);
        }
      };
      walkClone(clone.root?.children ?? []);
      setPopulatedValue(clone);
    });
  }, [value]);

  const html = populatedValue
    ? convertLexicalToHTML({ data: populatedValue })
    : null;

  return (
    <div
      ref={divRef}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        minHeight: "2rem",
        overflow: "hidden",
        ...DASHED_BORDER_BG,
      }}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p>Click here to edit rich text…</p>
      )}
    </div>
  );
}

function UploadPreview({
  value,
  blockIndex,
  fieldName,
  contentPath,
  relationTo,
}: {
  value: unknown;
  blockIndex: number;
  fieldName: string;
  contentPath: string;
  relationTo?: string | string[];
}) {
  const path = `${contentPath}.${blockIndex}.${fieldName}`;
  const divRef = useSpacerOpacity(path);
  const col = typeof relationTo === "string" ? relationTo : "media";

  const [mediaDoc, setMediaDoc] = useState<{
    url?: string;
    alt?: string;
    width?: number;
    height?: number;
  } | null>(null);

  useEffect(() => {
    if (!value) {
      setMediaDoc(null);
      return;
    }
    if (typeof value === "object" && (value as any).url) {
      setMediaDoc(value as any);
      return;
    }
    const id =
      typeof value === "number" || typeof value === "string" ? value : null;
    if (!id) {
      setMediaDoc(null);
      return;
    }
    fetch(`/api/${col}/${id}?depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(setMediaDoc);
  }, [value]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "wysiwyg-upload-updated" || e.data.path !== path)
        return;
      setMediaDoc(e.data.doc ?? null);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [path]);

  const postHover = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: "wysiwyg-upload-hover",
        path,
        relationTo: col,
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

  return (
    <div
      ref={divRef}
      onMouseEnter={(e) => postHover(e.currentTarget)}
      onMouseLeave={() => window.parent.postMessage({ type: "wysiwyg-upload-hover-end", path }, "*")}
      style={{
        minHeight: "8rem",
        width: "100%",
        position: "relative",
        display: "block",
        ...(!mediaDoc?.url ? DASHED_BORDER_BG : {}),
      }}
    >
      {mediaDoc?.url ? (
        <img
          src={mediaDoc.url}
          alt={mediaDoc.alt ?? ""}
          width={mediaDoc.width}
          height={mediaDoc.height}
          style={{ display: "block", maxWidth: "100%" }}
        />
      ) : (
        <p
          style={{
            margin: 0,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            whiteSpace: "nowrap",
          }}
        >
          Click here to upload an image…
        </p>
      )}
    </div>
  );
}

function FieldPreview({
  value,
  blockIndex,
  fieldName,
  contentPath,
  fieldType,
  placeholder,
  renderValue,
  options,
}: {
  value: unknown;
  blockIndex: number;
  fieldName: string;
  contentPath: string;
  fieldType: string;
  placeholder: string;
  renderValue?: (v: unknown) => string;
  options?: { label: string; value: string }[];
}) {
  const path = `${contentPath}.${blockIndex}.${fieldName}`;
  const divRef = useSpacerOpacity(path);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    postEditMessage(e.currentTarget, path, { fieldType, ...(options ? { options } : {}) });
  };

  const display = value != null && value !== ""
    ? (renderValue ? renderValue(value) : String(value))
    : null;

  return (
    <div
      ref={divRef}
      onClick={handleClick}
      data-wysiwyg-path={path}
      data-wysiwyg-field-type={fieldType}
      {...(options ? { "data-wysiwyg-options": JSON.stringify(options) } : {})}
      style={{
        cursor: "pointer",
        minHeight: "2rem",
        padding: "0.35rem 0.5rem",
        ...DASHED_BORDER_BG,
      }}
    >
      {display != null ? (
        <span>{display}</span>
      ) : (
        <span style={{ opacity: 0.4 }}>{placeholder}</span>
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
    case "relationship":
    case "upload":
      return (
        <UploadPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          relationTo={field.relationTo as string | string[] | undefined}
        />
      );
    case "text":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="text"
          placeholder={`Click here to edit text…`}
        />
      );
    case "email":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="email"
          placeholder={`Click here to enter an email address…`}
        />
      );
    case "textarea":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="textarea"
          placeholder={`Click here to edit text…`}
        />
      );
    case "number":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="number"
          placeholder="Click here to enter a number…"
        />
      );
    case "date":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="date"
          placeholder="Click here to pick a date…"
          renderValue={(v) => new Date(v as string).toLocaleDateString()}
        />
      );
    case "checkbox":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="checkbox"
          placeholder="Click here to toggle checkbox…"
          renderValue={(v) => (v ? "✓ checked" : "✗ unchecked")}
        />
      );
    case "select":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="select"
          placeholder="Click here to select an option…"
          options={field.options as { label: string; value: string }[] | undefined}
        />
      );
    case "radio":
      return (
        <FieldPreview
          value={value}
          blockIndex={blockIndex}
          fieldName={field.name}
          contentPath={contentPath}
          fieldType="radio"
          placeholder="Click here to select a radio option…"
          options={field.options as { label: string; value: string }[] | undefined}
        />
      );
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
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
