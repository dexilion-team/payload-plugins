"use client";

import type { ClientBlock, SanitizedFieldPermissions, UploadFieldClient } from "payload";
import { useCallback, useEffect, useRef, useState } from "react";
import { reduceFieldsToValues } from "payload/shared";
import {
  BlocksDrawer,
  Button,
  CheckboxField,
  DateTimeField,
  DrawerToggler,
  EmailField,
  FieldPathContext,
  fieldBaseClass,
  NumberField,
  RadioGroupField,
  SelectField,
  TextField,
  TextareaField,
  useAllFormFields,
  useDocumentInfo,
  useDrawerSlug,
  useField,
  useForm,
  useFormFields,
  UploadField,
} from "@payloadcms/ui";

type EditTarget = {
  path: string;
  fieldType?: string;
  relationTo?: string | string[];
  options?: { label: string; value: string }[];
  rect: { top: number; left: number; width: number; height: number };
};

function FloatingEditor({
  target,
  iframeRef,
  initialScrollY,
  onClose,
}: {
  target: EditTarget;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  initialScrollY: number;
  onClose: () => void;
}) {
  const editorComponent = useFormFields(
    ([fields]) => fields?.[target.path]?.customComponents?.Field ?? null,
  );
  const uploadValue = useFormFields(
    ([fields]) => target.fieldType === "upload" ? fields?.[target.path]?.value : undefined,
  );
  const floatRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(initialScrollY);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "wysiwyg-scroll") return;
      scrollYRef.current = e.data.scrollY;
      if (floatRef.current) {
        const iframeTop = iframeRef.current?.offsetTop ?? 0;
        floatRef.current.style.top = `${target.rect.top - e.data.scrollY + iframeTop}px`;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [target.rect.top]);

  useEffect(() => {
    if (target.fieldType !== "upload" || !uploadValue) return;
    const id = typeof uploadValue === "number" || typeof uploadValue === "string" ? uploadValue : null;
    if (!id) return;
    fetch(`/api/media/${id}?depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((doc) => {
        if (doc) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "wysiwyg-upload-updated", path: target.path, doc },
            "*",
          );
        }
      });
  }, [uploadValue, target.fieldType, target.path]);

  const uploadFieldConfig: UploadFieldClient | null =
    target.fieldType === "upload" && target.relationTo
      ? ({
          type: "upload",
          name: target.path.split(".").at(-1)!,
          relationTo: target.relationTo as string,
        } as UploadFieldClient)
      : null;

  useEffect(() => {
    const el = floatRef.current;
    if (!el) return;
    const path = target.path;
    const previewHeight = target.rect.height;
    const postSpacer = (height: number, active: boolean) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wysiwyg-spacer", path, height, active },
        "*",
      );
    };
    const ro = new ResizeObserver(() => {
      const overflow = Math.max(0, el.offsetHeight - previewHeight);
      postSpacer(overflow, true);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      postSpacer(0, false);
    };
  }, [target.path]);

  useEffect(() => {
    const el = floatRef.current;
    const stopScroll = (e: WheelEvent) => {
      e.preventDefault();
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wysiwyg-wheel", deltaY: e.deltaY },
        "*",
      );
    };
    el?.addEventListener("wheel", stopScroll, { passive: false });
    return () => {
      el?.removeEventListener("wheel", stopScroll);
    };
  }, [onClose]);

  const SIMPLE_FIELD_TYPES = ["text", "textarea", "email", "number", "date", "checkbox", "select", "radio"];
  const isSimpleField = SIMPLE_FIELD_TYPES.includes(target.fieldType ?? "");

  if (!editorComponent && target.fieldType !== "upload" && !isSimpleField) return null;
  if (target.fieldType === "upload" && !uploadFieldConfig) return null;

  const iframeOffsetTop = iframeRef.current?.offsetTop ?? 0;
  const top = target.rect.top - initialScrollY + iframeOffsetTop;
  const left = target.rect.left;
  const width = Math.max(target.rect.width, 480);

  return (
    <div
      ref={floatRef}
      className="wysiwyg-floating-editor"
      style={{
        position: "absolute",
        top,
        left,
        width: Math.max(width, 480),
        minHeight: target.rect.height || "8rem",
        zIndex: 1000,
        background: "transparent",
        color: "var(--theme-text)",
        border: "2px dashed var(--theme-elevation-200, #333)",
        borderRadius: "6px",
        padding: "2.5rem 1rem 1rem",
        transition: "top 80ms linear",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1rem",
          lineHeight: 1,
          color: "var(--theme-elevation-500, #888)",
        }}
      >
        ✕
      </button>
      <style>{`
        .wysiwyg-floating-editor .field-label { display: none; }
        .wysiwyg-floating-editor .ContentEditable__root * { color: #000; }
        .wysiwyg-floating-editor .radio-input__label { color: #000; }
      `}</style>
      <FieldPathContext value={target.path}>
        {target.fieldType === "upload" && uploadFieldConfig ? (
          <UploadField field={uploadFieldConfig} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "text" || target.fieldType === "email" ? (
          <TextField field={{ type: target.fieldType, name: target.path.split(".").at(-1)! } as any} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "textarea" ? (
          <TextareaField field={{ type: "textarea", name: target.path.split(".").at(-1)! } as any} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "number" ? (
          <NumberField field={{ type: "number", name: target.path.split(".").at(-1)! } as any} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "date" ? (
          <DateTimeField field={{ type: "date", name: target.path.split(".").at(-1)! } as any} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "checkbox" ? (
          <CheckboxField field={{ type: "checkbox", name: target.path.split(".").at(-1)! } as any} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "select" ? (
          <SelectField field={{ type: "select", name: target.path.split(".").at(-1)!, options: (target as any).options ?? [] } as any} path={target.path} schemaPath={target.path} />
        ) : target.fieldType === "radio" ? (
          <RadioGroupField field={{ type: "radio", name: target.path.split(".").at(-1)!, options: (target as any).options ?? [] } as any} path={target.path} schemaPath={target.path} />
        ) : (
          editorComponent
        )}
      </FieldPathContext>
    </div>
  );
}

export function LivePreviewClient({
  url,
  blocks,
  path: pathFromProps,
  schemaPath: schemaPathFromProps,
  permissions,
}: {
  url: string | null;
  blocks: ClientBlock[];
  path: string;
  schemaPath?: string;
  permissions: { [fieldName: string]: SanitizedFieldPermissions } | SanitizedFieldPermissions;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const iframeScrollYRef = useRef(0);
  const [formState] = useAllFormFields();
  const { id, collectionSlug } = useDocumentInfo();
  const drawerSlug = useDrawerSlug("blocks-drawer");
  const { addFieldRow } = useForm();
  const { path, rows: blockRows = [] } = useField<number>({ hasRows: true, potentiallyStalePath: pathFromProps });
  const schemaPath = schemaPathFromProps ?? path;

  const addRow = useCallback(
    (rowIndex: number, blockType?: string) => {
      if (!blockType) return;
      addFieldRow({ blockType, path, rowIndex, schemaPath });
    },
    [addFieldRow, path, schemaPath],
  );

  useEffect(() => {
    if (!url) return;
    const handler = (event: MessageEvent) => {
      if (url.startsWith(event.origin) && event.data?.type === "payload-live-preview" && event.data?.ready) {
        setIframeReady(true);
      }
      if (event.data?.type === "wysiwyg-edit") {
        setEditTarget({ path: event.data.path, fieldType: event.data.fieldType, relationTo: event.data.relationTo, options: event.data.options, rect: event.data.rect });
      }
      if (event.data?.type === "wysiwyg-scroll") {
        iframeScrollYRef.current = event.data.scrollY;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [url]);

  useEffect(() => {
    if (!url || !iframeReady || !formState || !iframeRef.current?.contentWindow) return;
    const values = reduceFieldsToValues(formState, true);
    if (!values.id) values.id = id;
    iframeRef.current.contentWindow.postMessage(
      { type: "payload-live-preview", collectionSlug, data: values },
      url,
    );
  }, [formState, iframeReady, url, id, collectionSlug]);

  return (
    <div className={[fieldBaseClass, "blocks-field"].join(" ")}>
      {url && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          <iframe
            ref={iframeRef}
            src={url}
            style={{
              width: "100%",
              minHeight: "600px",
              border: "none",
              display: "block",
              marginTop: "1rem",
            }}
          />
          {editTarget && (
            <FloatingEditor
              target={editTarget}
              iframeRef={iframeRef}
              initialScrollY={iframeScrollYRef.current}
              onClose={() => setEditTarget(null)}
            />
          )}
        </div>
      )}
      <DrawerToggler className="blocks-field__drawer-toggler" slug={drawerSlug}>
        <Button buttonStyle="icon-label" el="span" icon="plus" iconPosition="left" iconStyle="with-border">
          Add Block
        </Button>
      </DrawerToggler>
      <BlocksDrawer
        addRow={addRow}
        addRowIndex={blockRows.length}
        blocks={blocks}
        drawerSlug={drawerSlug}
        labels={{ singular: "Block", plural: "Blocks" }}
      />
    </div>
  );
}
