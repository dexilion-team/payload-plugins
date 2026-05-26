import {
  Block,
  BlocksField,
  BlocksFieldServerComponent,
  ClientBlock,
  ClientFieldSchemaMap,
  Field,
  FieldSchemaMap,
  FlattenedBlock,
  PayloadRequest,
  createClientBlocks,
  createClientField,
  flattenAllFields,
} from "payload";
import { parseWidgetFields } from "@dexilion/payload-dynamic-blocks/parseWidgetFields";
import WysiwygBlockRenderer from "./WysiwygBlockRenderer";

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
    }
  }
}

const WysiwygField: BlocksFieldServerComponent = async (props) => {
  const {
    payload,
    i18n,
    schemaPath,
    path,
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
    collection: "widgets",
    disableErrors: true,
    pagination: false,
  });

  if (widgets.docs.length === 0) {
    return null;
  }

  let blocks: Block[] = widgets.docs.map((doc: any): Block => {
    const parsedFields = parseWidgetFields(doc.widget ?? "");

    const fields: Field[] = parsedFields.map((f) =>
      f.type === "richText"
        ? ({ ...f, editor: payload.config.editor, admin: {} } as Field)
        : (f as Field),
    );

    return {
      slug: doc.name,
      labels: { singular: doc.name, plural: doc.name },
      dbName: doc.name,
      fields,
    };
  });

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

  for (const block of blocks) {
    addBlockFieldsToSchemaMap(
      fieldSchemaMap,
      clientFieldSchemaMap,
      block.fields as Field[],
      `${schemaPath}.${block.slug}`,
      req,
    );
  }

  payload.blocks = Object.fromEntries(
    blocks.map((block) => [
      block.slug,
      {
        ...block,
        flattenedFields: flattenAllFields({ fields: block.fields }),
      } as FlattenedBlock,
    ]),
  );

  const clientBlocks: ClientBlock[] = createClientBlocks({
    blocks,
    i18n,
    defaultIDType: payload.config.db.defaultIDType,
    importMap: payload.importMap,
  }) as ClientBlock[];

  return (
    <WysiwygBlockRenderer
      blocks={clientBlocks}
      path={path}
      schemaPath={schemaPath}
      permissions={permissions}
    />
  );
};

export default WysiwygField;
