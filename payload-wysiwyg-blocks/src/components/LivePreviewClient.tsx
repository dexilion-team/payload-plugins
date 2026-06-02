"use client";

import type { ClientBlock, SanitizedFieldPermissions } from "payload";
import { useCallback, useEffect, useRef, useState } from "react";
import { reduceFieldsToValues } from "payload/shared";
import {
  BlocksDrawer,
  Button,
  DrawerToggler,
  FieldPathContext,
  fieldBaseClass,
  useAllFormFields,
  useDocumentInfo,
  useDrawerSlug,
  useField,
  useForm,
  useFormFields,
} from "@payloadcms/ui";

type EditTarget = {
  path: string;
  rect: { top: number; left: number; width: number; height: number };
};

function FloatingEditor({
  target,
  iframeRef,
  onClose,
}: {
  target: EditTarget;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
}) {
  const editorComponent = useFormFields(
    ([fields]) => fields?.[target.path]?.customComponents?.Field ?? null,
  );
  const floatRef = useRef<HTMLDivElement>(null);

  // Nothing to show if Payload hasn't injected the editor yet
  if (!editorComponent) return null;

  const iframeRect = iframeRef.current?.getBoundingClientRect();
  const iframeTop = iframeRect?.top ?? 0;
  const iframeLeft = iframeRect?.left ?? 0;
  const top = iframeTop + target.rect.top;
  const left = iframeLeft + target.rect.left;
  const width = Math.max(target.rect.width, 480);

  const postSpacer = (height: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wysiwyg-spacer", path: target.path, height },
      "*",
    );
  };

  useEffect(() => {
    const el = floatRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      postSpacer(entry.contentRect.height);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      postSpacer(0);
    };
  }, [target.path]);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (floatRef.current && !floatRef.current.contains(e.relatedTarget as Node)) {
        onClose();
      }
    };
    const el = floatRef.current;
    el?.addEventListener("mouseleave", handleMouseLeave);
    return () => el?.removeEventListener("mouseleave", handleMouseLeave);
  }, [onClose]);

  return (
    <div
      ref={floatRef}
      className="wysiwyg-floating-editor"
      style={{
        position: "fixed",
        top,
        left,
        width: Math.max(width, 480),
        zIndex: 1000,
        background: "transparent",
        color: "var(--theme-text)",
        border: "2px dashed var(--theme-elevation-200, #333)",
        borderRadius: "6px",
        padding: "2.5rem 1rem 1rem",
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
      `}</style>
      <FieldPathContext value={target.path}>
        {editorComponent}
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
        setEditTarget({ path: event.data.path, rect: event.data.rect });
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
        <div style={{ position: "relative" }}>
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
