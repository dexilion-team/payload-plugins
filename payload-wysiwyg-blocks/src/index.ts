import { Config, Field } from "payload";

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

// Run after dynamicBlocks — overrides the Field component on content_blocks
// with the WYSIWYG renderer. Must be added last in the plugins array.
export const wysiwygBlocksOverride = () => {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig };
    const pagesCollection = config.collections?.find((c) => c.slug === "pages");

    if (pagesCollection) {
      const contentField = pagesCollection.fields?.find(
        (f): f is Extract<Field, { name: string }> =>
          "name" in f && f.name === "content_blocks",
      );

      if (contentField && contentField.type === "blocks") {
        if (!contentField.admin) contentField.admin = {};
        if (!contentField.admin.components) contentField.admin.components = {};
        contentField.admin.components.Field = {
          path: "@dexilion/payload-wysiwyg-blocks/WysiwygField",
        };
      }
    }

    return config;
  };
};

export default wysiwygBlocks;
