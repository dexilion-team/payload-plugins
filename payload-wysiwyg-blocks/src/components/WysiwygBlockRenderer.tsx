"use client";

import type { ClientBlock, ClientField, SanitizedFieldPermissions } from "payload";
import { useCallback } from "react";
import {
  BlocksDrawer,
  Button,
  DrawerToggler,
  fieldBaseClass,
  useDrawerSlug,
  useField,
  useForm,
} from "@payloadcms/ui";
import { RenderFields } from "./RenderFields";

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

  return (
    <div className={[fieldBaseClass, "blocks-field"].join(" ")}>
      {blockRows.length > 0 &&
        blockRows.map((row, i) => {
          const blockConfig = blocks.find((b) => b.slug === row.blockType);
          if (!blockConfig) return null;

          const rowPath = `${path}.${i}`;
          const rowSchemaPath = `${schemaPath}.${blockConfig.slug}`;

          return (
            <div key={rowPath}>
              <RenderFields
                fields={blockConfig.fields as ClientField[]}
                parentIndexPath={rowPath}
                parentPath={rowPath}
                parentSchemaPath={rowSchemaPath}
                permissions={permissions}
              />
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
    </div>
  );
}
