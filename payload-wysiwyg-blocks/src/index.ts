import { BlocksField, Config, Field, LivePreviewConfig } from "payload";

interface PluginOptions {
  enable?: boolean;
  wysiwyg?: boolean;
  livePreview?: LivePreviewConfig;
}

const wysiwygBlocks = ({ enable, wysiwyg = false, livePreview }: PluginOptions = {}) => {
  return (incomingConfig: Config): Config => {
    if (enable === false) {
      return incomingConfig;
    }

    const config = { ...incomingConfig };

    config.collections = [
      ...(config.collections || []),
      {
        slug: "pages",
        ...(livePreview ? { admin: { livePreview } } : {}),
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

    if (wysiwyg) {
      applyWysiwygRenderer(config);
    }

    return config;
  };
};

const applyWysiwygRenderer = (config: Config) => {
  for (const collection of config.collections ?? []) {
    overrideDynamicBlocksFields(collection.fields ?? []);
  }
};

const overrideDynamicBlocksFields = (fields: Field[]) => {
  for (const field of fields) {
    if (
      "name" in field &&
      field.type === "blocks" &&
      (field.custom as Record<string, unknown> | undefined)?.dynamic === true
    ) {
      const blocksField = field as BlocksField;
      if (!blocksField.admin) blocksField.admin = {};
      if (!blocksField.admin.components) blocksField.admin.components = {};
      blocksField.admin.components.Field = {
        path: "@dexilion/payload-wysiwyg-blocks/LivePreview",
      };
    }

    if ("fields" in field && Array.isArray(field.fields)) {
      overrideDynamicBlocksFields(field.fields as Field[]);
    }

    if (field.type === "tabs") {
      for (const tab of field.tabs) {
        overrideDynamicBlocksFields(tab.fields);
      }
    }
  }
};

export default wysiwygBlocks;
