"use client";

import type {
  ClientBlock,
  ClientField,
  // StaticLabel
} from "payload";
import { useCallback } from "react";
import {
  BlocksDrawer,
  Button,
  DraggableSortable,
  DraggableSortableItem,
  DrawerToggler,
  // FieldLabel,
  TextField,
  FieldPathContext,
  fieldBaseClass,
  useDrawerSlug,
  useField,
  useForm,
} from "@payloadcms/ui";

// function TextInput({
//   field,
//   path,
// }: {
//   field: ClientField & { name: string };
//   path: string;
// }) {
//   const { value, setValue } = useField<string>({ path });
//   const label = ("label" in field ? field.label : field.name) as StaticLabel;
//   return (
//     <div className={[fieldBaseClass, "text"].join(" ")}>
//       <FieldLabel htmlFor={path} label={label} path={path} />
//       <input
//         id={path}
//         onChange={(e) => setValue(e.target.value)}
//         type="text"
//         value={value ?? ""}
//       />
//     </div>
//   );
// }

function renderField(field: ClientField, rowPath: string) {
  if (!("name" in field)) return null;
  const fieldPath = `${rowPath}.${field.name}`;

  switch (field.type) {
    case "text":
      return (
        <FieldPathContext.Provider value="">
          <TextField field={field as any} path={fieldPath} />
        </FieldPathContext.Provider>
      );
    default:
      return null;
  }
}

export default function CustomBlockRenderer({
  blocks,
  path: pathFromProps,
  schemaPath: schemaPathFromProps,
}: {
  blocks: ClientBlock[];
  path: string;
  schemaPath?: string;
}) {
  const drawerSlug = useDrawerSlug("blocks-drawer");

  const { addFieldRow, moveFieldRow, removeFieldRow } = useForm();

  const { path, rows = [] } = useField<number>({
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

  const removeRow = useCallback(
    (rowIndex: number) => {
      removeFieldRow({ path, rowIndex });
    },
    [path, removeFieldRow],
  );

  const moveRow = useCallback(
    (moveFromIndex: number, moveToIndex: number) => {
      moveFieldRow({ moveFromIndex, moveToIndex, path });
    },
    [moveFieldRow, path],
  );

  return (
    <div className={[fieldBaseClass, "blocks-field"].join(" ")}>
      {rows.length > 0 && (
        <DraggableSortable
          ids={rows.map((row) => row.id)}
          onDragEnd={({ moveFromIndex, moveToIndex }) =>
            moveRow(moveFromIndex, moveToIndex)
          }
        >
          {rows.map((row, i) => {
            const blockConfig = blocks.find((b) => b.slug === row.blockType);
            if (!blockConfig) return null;

            const rowPath = `${path}.${i}`;

            const rowSchemaPath = `${schemaPath}.${blockConfig.slug}`;

            return (
              <DraggableSortableItem id={row.id} key={row.id}>
                {() => (
                  <div>
                    {(blockConfig.fields as ClientField[]).map((field) =>
                      renderField(field, rowPath),
                    )}
                    <button onClick={() => removeRow(i)} type="button">
                      Remove
                    </button>
                  </div>
                )}
              </DraggableSortableItem>
            );
          })}
        </DraggableSortable>
      )}
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
        addRowIndex={rows.length}
        blocks={blocks}
        drawerSlug={drawerSlug}
        labels={{ singular: "Block", plural: "Blocks" }}
      />
    </div>
  );
}
