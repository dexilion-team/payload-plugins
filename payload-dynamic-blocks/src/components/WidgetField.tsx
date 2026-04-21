import {
  BlocksFieldServerComponent,
  ClientBlock,
  createClientBlocks,
} from "payload";
import WidgetFieldClient from "./WidgetFieldClient";

const WidgetField: BlocksFieldServerComponent = (props) => {
  const { payload, i18n } = props;

  const blocks: ClientBlock[] = createClientBlocks({
    blocks: [
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
            // admin: {
            //   components: {
            //     Field: "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField",
            //   },
            // },
          },
          {
            name: "featured",
            type: "relationship",
            label: "Featured Item",
            relationTo: "media",
          },
        ],
      },
    ],
    i18n: i18n,
    defaultIDType: payload.config.db.defaultIDType,
    importMap: payload.importMap,
  }) as ClientBlock[];

  return (
    <WidgetFieldClient
      path={props.path}
      field={{
        ...props.clientField,
        blocks,
      }}
    />
  );
};

export default WidgetField;
