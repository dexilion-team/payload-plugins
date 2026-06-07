"use client";

import type { ClientBlock, SanitizedFieldPermissions } from "payload";
import { useCallback, useEffect, useRef, useState } from "react";
import { reduceFieldsToValues } from "payload/shared";
import {
  BlocksDrawer,
  Button,
  CheckboxField,
  DateTimeField,
  DrawerToggler,
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
  useListDrawer,
  SwapIcon,
  XIcon,
} from "@payloadcms/ui";

type EditTarget = {
  path: string;
  fieldType?: string;
  relationTo?: string | string[];
  options?: { label: string; value: string }[];
  rect: { top: number; left: number; width: number; height: number };
};

type UploadHoverTarget = {
  path: string;
  relationTo: string;
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

  if (!editorComponent && !isSimpleField) return null;

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
        color: "#000",
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
          color: "#000",
        }}
      >
        ✕
      </button>
      <style>{`
        .wysiwyg-floating-editor .field-label { display: none; }
        .wysiwyg-floating-editor .ContentEditable__root * { color: #000; }
        .wysiwyg-floating-editor .radio-input__label { color: #000; }
        .wysiwyg-floating-editor input,
        .wysiwyg-floating-editor textarea,
        .wysiwyg-floating-editor select { background: transparent; color: #000; border: none; box-shadow: none; outline: none; }
        .wysiwyg-floating-editor .rs__control { background: transparent; border: none; box-shadow: none; color: #000; }
        .wysiwyg-floating-editor .rs__menu { background: #fff; color: #000; }
        .wysiwyg-floating-editor .rs__option { color: #000; }
        .wysiwyg-floating-editor .rs__option--is-focused, .wysiwyg-floating-editor .rs__option--is-selected { color: #fff; }
        .wysiwyg-floating-editor .rs__single-value { color: #000; }
        .wysiwyg-floating-editor .rs__placeholder { color: rgba(0,0,0,0.4); }
        .wysiwyg-floating-editor .rs__input-container, .wysiwyg-floating-editor .rs__input { color: #000 !important; }
      `}</style>
      <FieldPathContext value={target.path}>
        {target.fieldType === "text" || target.fieldType === "email" ? (
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

function FloatingUploadControls({
  target,
  iframeRef,
  initialScrollY,
  onChange,
  onClear,
  pillRef,
}: {
  target: UploadHoverTarget;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  initialScrollY: number;
  onChange: () => void;
  onClear: () => void;
  pillRef: React.RefObject<HTMLDivElement | null>;
}) {
  const hasValue = useFormFields(([fields]) => Boolean(fields?.[target.path]?.value));

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "wysiwyg-scroll") return;
      if (pillRef.current) {
        const iframeTop = iframeRef.current?.offsetTop ?? 0;
        pillRef.current.style.top = `${target.rect.top - e.data.scrollY + iframeTop}px`;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [target.rect.top]);

  const iframeOffsetTop = iframeRef.current?.offsetTop ?? 0;
  const iframeOffsetLeft = iframeRef.current?.offsetLeft ?? 0;
  const top = target.rect.top - initialScrollY + iframeOffsetTop;
  const left = target.rect.left + target.rect.width + iframeOffsetLeft;

  return (
    <div
      ref={pillRef}
      style={{
        position: "absolute",
        top,
        left,
        transform: "translateX(-100%)",
        display: "flex",
        gap: "0.375rem",
        background: "rgb(34,34,34)",
        borderRadius: "8px",
        padding: "0.375rem 0.6rem",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
    >
      <button onClick={onChange} title="Change image" style={UPLOAD_BTN_STYLE}>
        <span style={ICON_SIZE_STYLE}><SwapIcon /></span>
      </button>
      <button onClick={onClear} title="Remove image" style={{ ...UPLOAD_BTN_STYLE, opacity: hasValue ? 1 : 0.3, cursor: hasValue ? "pointer" : "default" }} disabled={!hasValue}>
        <span style={ICON_SIZE_STYLE}><XIcon /></span>
      </button>
    </div>
  );
}

const UPLOAD_BTN_STYLE: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const ICON_SIZE_STYLE: React.CSSProperties = {
  display: "flex",
  width: "18px",
  height: "18px",
};

function UploadClearHandler({
  fieldPath,
  iframeRef,
  onDone,
}: {
  fieldPath: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onDone: () => void;
}) {
  const { setValue } = useField({ path: fieldPath });

  useEffect(() => {
    setValue(null);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wysiwyg-upload-updated", path: fieldPath, doc: null },
      "*",
    );
    onDone();
  }, []);

  return null;
}

function UploadChangeHandler({
  fieldPath,
  relationTo,
  iframeRef,
  onDone,
}: {
  fieldPath: string;
  relationTo: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onDone: () => void;
}) {
  const { setValue } = useField({ path: fieldPath });
  const [ListDrawer, , { openDrawer, closeDrawer, isDrawerOpen }] = useListDrawer({
    collectionSlugs: [relationTo],
    uploads: true,
  });

  const wasOpenRef = useRef(false);

  useEffect(() => {
    openDrawer();
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      onDone();
    }
  }, [isDrawerOpen]);

  const handleSelect = useCallback(
    ({ doc }: { doc: Record<string, unknown> }) => {
      setValue(doc.id);
      fetch(`/api/${relationTo}/${doc.id}?depth=0`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((fetched) => {
          if (fetched) {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "wysiwyg-upload-updated", path: fieldPath, doc: fetched },
              "*",
            );
          }
        });
      closeDrawer();
    },
    [setValue, fieldPath, relationTo, iframeRef, closeDrawer],
  );

  return <ListDrawer onSelect={handleSelect} />;
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
  const [uploadHoverTarget, setUploadHoverTarget] = useState<UploadHoverTarget | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ path: string; relationTo: string } | null>(null);
  const iframeScrollYRef = useRef(0);
  const uploadPillRef = useRef<HTMLDivElement>(null);
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
      if (event.data?.type === "wysiwyg-upload-hover") {
        setUploadHoverTarget({ path: event.data.path, relationTo: event.data.relationTo, rect: event.data.rect });
      }
      if (event.data?.type === "wysiwyg-upload-hover-end") {
        if (uploadPillRef.current?.matches(":hover")) return;
        setUploadHoverTarget((prev) => (prev?.path === event.data.path ? null : prev));
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
          {uploadHoverTarget && !uploadTarget && (
            <FloatingUploadControls
              target={uploadHoverTarget}
              iframeRef={iframeRef}
              initialScrollY={iframeScrollYRef.current}
              onChange={() => setUploadTarget({ path: uploadHoverTarget.path, relationTo: uploadHoverTarget.relationTo })}
              onClear={() => setUploadTarget({ path: uploadHoverTarget.path, relationTo: "__clear__" })}
              pillRef={uploadPillRef}
            />
          )}
          {uploadTarget && uploadTarget.relationTo !== "__clear__" && (
            <UploadChangeHandler
              key={uploadTarget.path}
              fieldPath={uploadTarget.path}
              relationTo={uploadTarget.relationTo}
              iframeRef={iframeRef}
              onDone={() => { setUploadTarget(null); setUploadHoverTarget(null); }}
            />
          )}
          {uploadTarget && uploadTarget.relationTo === "__clear__" && (
            <UploadClearHandler
              fieldPath={uploadTarget.path}
              iframeRef={iframeRef}
              onDone={() => { setUploadTarget(null); setUploadHoverTarget(null); }}
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
