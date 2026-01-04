import type { CollectionConfig, CollectionSlug, Config } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { Tags } from "./collections/Tags";
import { createPostsCollection } from "./collections/Posts";

export type PayloadBlogPluginOptions = {
  mediaSlug?: string;
  postsOverride?: (posts: CollectionConfig) => CollectionConfig;
  tagsOverride?: (tags: CollectionConfig) => CollectionConfig;
};

const DEFAULT_MEDIA_SLUG = "media";

export const blogPlugin =
  (options: PayloadBlogPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];

    const mediaSlug = (options.mediaSlug ?? DEFAULT_MEDIA_SLUG) as CollectionSlug;

    const tagsCollection = options.tagsOverride ? options.tagsOverride(Tags) : Tags;
    const tagsCollectionSlug = tagsCollection.slug as CollectionSlug;
    const tagsCollectionExists = config.collections.some(
      (collection) => collection.slug === tagsCollectionSlug,
    );
    if (!tagsCollectionExists) {
      config.collections.push(tagsCollection);
    }

    const Posts = createPostsCollection({
      mediaSlug,
      tagsSlug: tagsCollectionSlug,
    });
    const postsCollectionExists = config.collections.some(
      (collection) => collection.slug === Posts.slug,
    );
    if (!postsCollectionExists) {
      config.collections.push(
        options.postsOverride ? options.postsOverride(Posts) : Posts,
      );
    }

    config.editor = config.editor || lexicalEditor();

    return config;
  };
