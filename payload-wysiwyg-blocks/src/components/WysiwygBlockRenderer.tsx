"use client";

import type { ClientBlock, ClientField, SanitizedFieldPermissions } from "payload";
import { useRef, useState, useCallback } from "react";
import {
  BlocksDrawer,
  Button,
  DrawerToggler,
  FieldPathContext,
  fieldBaseClass,
  useDrawerSlug,
  useField,
  useForm,
  useFormFields,
} from "@payloadcms/ui";
import { RichText } from "@dexilion/payload-pms/RichText";
import { RenderField } from "@dexilion/payload-dynamic-blocks/RenderField";

type ActiveEditor = {
  path: string;
  schemaPath: string;
  parentPath: string;
  parentSchemaPath: string;
  field: ClientField;
  permissions: SanitizedFieldPermissions;
  rect: DOMRect;
};

function RichTextPreview({
  path,
  field,
  onActivate,
}: {
  path: string;
  field: ClientField & { type: "richText" };
  onActivate: (path: string, field: ClientField, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const value = useFormFields(([fields]) => fields?.[path]?.value);

  return (
    <div
      ref={ref}
      className="wysiwyg-preview__richtext"
      onClick={() => {
        if (ref.current) {
          onActivate(path, field, ref.current.getBoundingClientRect());
        }
      }}
    >
      {value ? (
        <RichText content={value as any} />
      ) : (
        <p className="wysiwyg-preview__placeholder">Click to edit…</p>
      )}
    </div>
  );
}

export default function WysiwygBlockRenderer({
  blocks,
  path: pathFromProps,
  schemaPath: schemaPathFromProps,
  permissions,
}: {
  blocks: ClientBlock[];
  path: string;
  schemaPath?: string;
  permissions:
    | { [fieldName: string]: SanitizedFieldPermissions }
    | SanitizedFieldPermissions;
}) {
  const drawerSlug = useDrawerSlug("blocks-drawer");
  const { addFieldRow } = useForm();
  const [active, setActive] = useState<ActiveEditor | null>(null);

  const { path, rows: blockRows = [] } = useField<number>({
    hasRows: true,
    potentiallyStalePath: pathFromProps,
  });

  const schemaPath = schemaPathFromProps ?? path;

  const addRow = useCallback(
    (rowIndex: number, blockType?: string) => {
      if (!blockType) return;
      addFieldRow({ blockType, path, rowIndex, schemaPath });
    },
    [addFieldRow, path, schemaPath],
  );

  const handleClose = () => setActive(null);

  return (
    <div className={[fieldBaseClass, "blocks-field", "wysiwyg-canvas"].join(" ")}>
      {blockRows.map((row, i) => {
        const blockConfig = blocks.find((b) => b.slug === row.blockType);
        if (!blockConfig) return null;

        const rowPath = `${path}.${i}`;
        const rowSchemaPath = `${schemaPath}.${blockConfig.slug}`;

        const richTextFields = (blockConfig.fields as ClientField[]).filter(
          (f): f is ClientField & { type: "richText"; name: string } =>
            "name" in f && f.type === "richText",
        );

        return (
          <div key={rowPath} className="wysiwyg-canvas__block">
            {richTextFields.map((f) => {
              const fieldPath = `${rowPath}.${f.name}`;
              const fieldSchemaPath = `${rowSchemaPath}.${f.name}`;
              return (
                <FieldPathContext.Provider key={fieldPath} value={fieldPath}>
                  <RichTextPreview
                    path={fieldPath}
                    field={f}
                    onActivate={(p, field, rect) =>
                      setActive({
                        path: p,
                        schemaPath: fieldSchemaPath,
                        parentPath: rowPath,
                        parentSchemaPath: rowSchemaPath,
                        field,
                        permissions: permissions as SanitizedFieldPermissions,
                        rect,
                      })
                    }
                  />
                </FieldPathContext.Provider>
              );
            })}
          </div>
        );
      })}

      <DrawerToggler className="blocks-field__drawer-toggler" slug={drawerSlug}>
        <Button
          buttonStyle="icon-label"
          el="span"
          icon="plus"
          iconPosition="left"
          iconStyle="with-border"
        >
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

      {active && (
        <div
          className="wysiwyg-editor-overlay"
          style={{
            position: "fixed",
            top: active.rect.top,
            left: active.rect.left,
            width: active.rect.width,
            zIndex: 1000,
            background: "var(--theme-bg, #fff)",
          }}
        >
          <button className="wysiwyg-editor-overlay__close" onClick={handleClose}>
            ✕
          </button>
          <FieldPathContext.Provider value={active.path}>
            <RenderField
              clientFieldConfig={active.field}
              path={active.path}
              schemaPath={active.schemaPath}
              parentPath={active.parentPath}
              parentSchemaPath={active.parentSchemaPath}
              indexPath=""
              permissions={active.permissions}
              forceRender
            />
          </FieldPathContext.Provider>
        </div>
      )}
    </div>
  );
}
