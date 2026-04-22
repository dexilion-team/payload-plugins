import {
  Block,
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
import { BlocksField } from "@payloadcms/ui";

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

const WidgetField: BlocksFieldServerComponent = (props) => {
  const {
    payload,
    i18n,
    schemaPath,
    permissions,
    fieldSchemaMap,
    clientFieldSchemaMap,
    req,
  } = props;

  const blocks: Block[] = [
    {
      slug: "exampleBlock",
      labels: {
        singular: "Example Block",
        plural: "Example Blocks",
      },
      dbName: "exampleBlock",
      fields: [
        {
          name: "text",
          type: "text",
          label: "Text",
        },
        {
          name: "content",
          type: "richText",
          label: "Content",
          required: true,
          editor: payload.config.editor, // <-- This is required, override from field definition if needed
          admin: {},
        },
        {
          name: "featured",
          type: "relationship",
          label: "Featured Item",
          relationTo: "media",
          //hidden: true, // <-- Hack to override validation
        },
      ],
    },
  ];

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

  const clientBlocks: ClientBlock[] = createClientBlocks({
    blocks,
    i18n: i18n,
    defaultIDType: payload.config.db.defaultIDType,
    importMap: payload.importMap,
  }) as ClientBlock[];

  // Prepare for validation
  const flattenedFields = flattenAllFields({ fields: blocks[0]!.fields });
  payload.blocks = {
    exampleBlock: {
      ...blocks[0],
      flattenedFields: flattenedFields,
    } as FlattenedBlock,
  };

  return (
    <BlocksField
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
