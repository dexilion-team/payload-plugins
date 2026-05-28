import { handleLivePreview } from "@payloadcms/ui/rsc";
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
import { parseWidgetFields } from "@dexilion/payload-dynamic-blocks/parseWidgetFields";
import { WIDGET_COLLECTION_NAME } from "@dexilion/payload-dynamic-blocks/constants";
import { LivePreviewClient } from "./LivePreviewClient";

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
        addBlockFieldsToSchemaMap(fieldSchemaMap, clientFieldSchemaMap, field.fields as Field[], fieldSchemaPath, req);
      }
      if (field.type === "blocks" && "blocks" in field) {
        for (const block of field.blocks as Block[]) {
          addBlockFieldsToSchemaMap(fieldSchemaMap, clientFieldSchemaMap, block.fields as Field[], `${fieldSchemaPath}.${block.slug}`, req);
        }
      }
      if ((field as any).type === "tabs") {
        for (const tab of (field as any).tabs) {
          const tabPath = "name" in tab && tab.name ? `${fieldSchemaPath}.${tab.name}` : fieldSchemaPath;
          addBlockFieldsToSchemaMap(fieldSchemaMap, clientFieldSchemaMap, tab.fields as Field[], tabPath, req);
        }
      }
    } else if ("fields" in field && Array.isArray((field as any).fields)) {
      addBlockFieldsToSchemaMap(fieldSchemaMap, clientFieldSchemaMap, (field as any).fields as Field[], parentSchemaPath, req);
    } else if ("tabs" in (field as any)) {
      for (const tab of (field as any).tabs) {
        const tabPath = "name" in tab && tab.name ? `${parentSchemaPath}.${tab.name}` : parentSchemaPath;
        addBlockFieldsToSchemaMap(fieldSchemaMap, clientFieldSchemaMap, tab.fields as Field[], tabPath, req);
      }
    }
  }
}

export const LivePreview: BlocksFieldServerComponent = async (props) => {
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
    collectionSlug,
  } = props;

  const { livePreviewURL } = await handleLivePreview({
    collectionSlug,
    config: req.payload.config,
    data,
    req,
  });

  const widgets = await payload.find({
    collection: WIDGET_COLLECTION_NAME,
    disableErrors: true,
    pagination: false,
  });

  if (widgets.docs.length === 0) return null;

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
    addBlockFieldsToSchemaMap(fieldSchemaMap, clientFieldSchemaMap, block.fields as Field[], `${schemaPath}.${block.slug}`, req);
  }

  payload.blocks = Object.fromEntries(
    blocks.map((block) => [
      block.slug,
      { ...block, flattenedFields: flattenAllFields({ fields: block.fields }) } as FlattenedBlock,
    ]),
  );

  const clientBlocks: ClientBlock[] = createClientBlocks({
    blocks,
    i18n,
    defaultIDType: payload.config.db.defaultIDType,
    importMap: payload.importMap,
  }) as ClientBlock[];

  return (
    <LivePreviewClient
      url={livePreviewURL ?? null}
      blocks={clientBlocks}
      path={path}
      schemaPath={schemaPath}
      permissions={permissions}
    />
  );
};

export default LivePreview;
