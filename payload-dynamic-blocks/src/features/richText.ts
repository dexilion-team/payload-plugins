import { Config } from "payload";

export const richTextFeature = (config: Config): Config => {
  config.admin = config.admin || {};
  config.admin.dependencies = config.admin.dependencies || {};
  config.admin.dependencies["RscEntryLexicalCell"] = {
    path: "@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell",
    type: "component",
  };
  config.admin.dependencies["RscEntryLexicalField"] = {
    path: "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField",
    type: "component",
  };
  config.admin.dependencies["LexicalDiffComponent"] = {
    path: "@payloadcms/richtext-lexical/rsc#LexicalDiffComponent",
    type: "component",
  };
  config.admin.dependencies["InlineToolbarFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#InlineToolbarFeatureClient",
    type: "component",
  };
  config.admin.dependencies["HorizontalRuleFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#HorizontalRuleFeatureClient",
    type: "component",
  };
  config.admin.dependencies["UploadFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#UploadFeatureClient",
    type: "component",
  };
  config.admin.dependencies["BlockquoteFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#BlockquoteFeatureClient",
    type: "component",
  };
  config.admin.dependencies["RelationshipFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#RelationshipFeatureClient",
    type: "component",
  };
  config.admin.dependencies["LinkFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#LinkFeatureClient",
    type: "component",
  };
  config.admin.dependencies["ChecklistFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#ChecklistFeatureClient",
    type: "component",
  };
  config.admin.dependencies["OrderedListFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#OrderedListFeatureClient",
    type: "component",
  };
  config.admin.dependencies["UnorderedListFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#UnorderedListFeatureClient",
    type: "component",
  };
  config.admin.dependencies["IndentFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#IndentFeatureClient",
    type: "component",
  };
  config.admin.dependencies["AlignFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#AlignFeatureClient",
    type: "component",
  };
  config.admin.dependencies["HeadingFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#HeadingFeatureClient",
    type: "component",
  };
  config.admin.dependencies["ParagraphFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#ParagraphFeatureClient",
    type: "component",
  };
  config.admin.dependencies["InlineCodeFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#InlineCodeFeatureClient",
    type: "component",
  };
  config.admin.dependencies["SuperscriptFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#SuperscriptFeatureClient",
    type: "component",
  };
  config.admin.dependencies["SubscriptFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#SubscriptFeatureClient",
    type: "component",
  };
  config.admin.dependencies["StrikethroughFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#StrikethroughFeatureClient",
    type: "component",
  };
  config.admin.dependencies["UnderlineFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#UnderlineFeatureClient",
    type: "component",
  };
  config.admin.dependencies["BoldFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#BoldFeatureClient",
    type: "component",
  };
  config.admin.dependencies["ItalicFeatureClient"] = {
    path: "@payloadcms/richtext-lexical/client#ItalicFeatureClient",
    type: "component",
  };

  return config;
};
