import {
  Block,
  BlocksField,
  BlocksFieldServerComponent,
  ClientBlock,
  ClientFieldSchemaMap,
  createClientBlocks,
  createClientField,
  Field,
  FieldSchemaMap,
  flattenAllFields,
  FlattenedBlock,
  PayloadRequest,
} from "payload";
import { BlocksField as BlocksFieldUI } from "@payloadcms/ui";
import { WIDGET_COLLECTION_NAME } from "../constants";
import { parseWidgetFields } from "../utils/parseWidgetFields";

function addBlockFieldsToSchemaMap(
  fieldSchemaMap: FieldSchemaMap,
  clientFieldSchemaMap: ClientFieldSchemaMap,
  fields: Field[],
  parentSchemaPath: string,
  req: PayloadRequest,
) {
  for (const field of fields) {
    if ("name" in field && typeof field.name === "string") {
      const fieldSchemaPath = `${parentSchemaPath}.${field.name}`;
      fieldSchemaMap.set(fieldSchemaPath, field);
      const clientField = createClientField({
        defaultIDType: req.payload.config.db.defaultIDType,
        field,
        i18n: req.i18n,
        importMap: req.payload.importMap,
      });
      clientFieldSchemaMap.set(fieldSchemaPath, clientField);
      if ("fields" in field && Array.isArray(field.fields)) {
        addBlockFieldsToSchemaMap(
          fieldSchemaMap,
          clientFieldSchemaMap,
          field.fields as Field[],
          fieldSchemaPath,
          req,
        );
      }
      if (field.type === "blocks" && "blocks" in field) {
        for (const block of field.blocks as Block[]) {
          addBlockFieldsToSchemaMap(
            fieldSchemaMap,
            clientFieldSchemaMap,
            block.fields as Field[],
            `${fieldSchemaPath}.${block.slug}`,
            req,
          );
        }
      }
      if ((field as any).type === "tabs" && "tabs" in (field as any)) {
        for (const tab of (field as any).tabs) {
          const tabPath =
            "name" in tab && tab.name
              ? `${fieldSchemaPath}.${tab.name}`
              : fieldSchemaPath;
          addBlockFieldsToSchemaMap(
            fieldSchemaMap,
            clientFieldSchemaMap,
            tab.fields as Field[],
            tabPath,
            req,
          );
        }
      }
    } else if ("fields" in field && Array.isArray((field as any).fields)) {
      addBlockFieldsToSchemaMap(
        fieldSchemaMap,
        clientFieldSchemaMap,
        (field as any).fields as Field[],
        parentSchemaPath,
        req,
      );
    } else if ("tabs" in (field as any)) {
      for (const tab of (field as any).tabs) {
        const tabPath =
          "name" in tab && tab.name
            ? `${parentSchemaPath}.${tab.name}`
            : parentSchemaPath;
        addBlockFieldsToSchemaMap(
          fieldSchemaMap,
          clientFieldSchemaMap,
          tab.fields as Field[],
          tabPath,
          req,
        );
      }
    }
  }
}

const WidgetField: BlocksFieldServerComponent = async (props) => {
  const {
    payload,
    i18n,
    schemaPath,
    permissions,
    fieldSchemaMap,
    clientFieldSchemaMap,
    req,
    data,
    siblingData,
    id,
    user,
    field,
  } = props;

  const widgets = await payload.find({
    collection: WIDGET_COLLECTION_NAME,
    disableErrors: true,
    pagination: false,
  });

  if (widgets.docs.length === 0) {
    payload.logger.error(
      `No widget definitions found in the "${WIDGET_COLLECTION_NAME}" collection. Please add widget definitions to this collection to use dynamic blocks.`,
    );
    return null; // No widget definitions, render nothing
  }

  let blocks: Block[] = widgets.docs.map((doc: any): Block => {
    const parsedFields = parseWidgetFields(doc.widget ?? "");

    // Inject the editor config for all richText fields
    const fields: Field[] = parsedFields.map((f) =>
      f.type === "richText"
        ? ({ ...f, editor: payload.config.editor, admin: {} } as Field)
        : (f as Field),
    );

    return {
      slug: doc.name,
      labels: {
        singular: doc.name,
        plural: doc.name,
      },
      dbName: doc.name, // Needed but unused
      fields,
    };
  });

  // Apply filterOptions if defined on the field
  const filterOptions = (field as BlocksField).filterOptions;
  if (filterOptions != null) {
    const filterResult =
      typeof filterOptions === "function"
        ? await filterOptions({ id: id!, data, req, siblingData, user })
        : filterOptions;

    if (filterResult !== true) {
      const allowed = new Set(filterResult as string[]);
      blocks = blocks.filter((b) => allowed.has(b.slug));
    }
  }

  // Populate fieldSchemaMap and clientFieldSchemaMap with dynamic block fields
  // so renderFieldFn can resolve schema paths like `posts.blocks.exampleBlock.text`
  for (const block of blocks) {
    addBlockFieldsToSchemaMap(
      fieldSchemaMap,
      clientFieldSchemaMap,
      block.fields as Field[],
      `${schemaPath}.${block.slug}`,
      req,
    );
  }

  // Register all dynamic blocks in payload.blocks so Payload can resolve them
  // during form state building and validation
  payload.blocks = Object.fromEntries(
    blocks.map((block) => [
      block.slug,
      {
        ...block,
        flattenedFields: flattenAllFields({ fields: block.fields }),
      } as FlattenedBlock,
    ]),
  );

  // Create client blocks for rendering in the admin UI
  const clientBlocks: ClientBlock[] = createClientBlocks({
    blocks,
    i18n: i18n,
    defaultIDType: payload.config.db.defaultIDType,
    importMap: payload.importMap,
  }) as ClientBlock[];

  return (
    <BlocksFieldUI
      path={props.path}
      field={{
        ...props.clientField,
        blocks: clientBlocks,
      }}
      schemaPath={schemaPath}
      permissions={permissions}
    />
  );
};

export default WidgetField;
