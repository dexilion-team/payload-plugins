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
