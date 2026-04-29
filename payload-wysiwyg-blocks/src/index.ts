import { Config } from "payload";

interface PluginOptions {
  enable?: boolean;
}

const wysiwygBlocks = ({ enable }: PluginOptions = {}) => {
  return (incomingConfig: Config): Config => {
    if (enable === false) {
      return incomingConfig;
    }

    const config = { ...incomingConfig };

    config.collections = [
      ...(config.collections || []),
      {
        slug: "pages",
        fields: [
          {
            name: "title",
            type: "text",
            required: true,
          },
          {
            name: "content",
            label: "Content",
            labels: {
              singular: "Content Block",
              plural: "Content Blocks",
            },
            type: "blocks",
            blocks: [],
            custom: { dynamic: true },
          },
        ],
      },
    ];

    return config;
  };
};

export default wysiwygBlocks;
