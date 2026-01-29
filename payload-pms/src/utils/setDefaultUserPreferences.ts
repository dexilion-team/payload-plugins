import { CollectionAfterOperationHook, CollectionSlug } from "payload";

const setDefaultUserPreferences: CollectionAfterOperationHook = async ({
  req,
  req: { payload, user },
  operation,
  result,
}) => {
  // HACK: Trigger as soon as possible so by the time the page editor is loaded
  // the default preference is already changed. The "find" operation necessarily
  // happens before the page editor UI loads.
  if (operation !== "find" || !user) {
    return result;
  }

  try {
    const authCollectionSlug = payload.config.admin.user;

    const existing = await payload.db.findOne<{
      id: number;
      value: {
        editViewType: "default" | "live-preview";
      };
    }>({
      collection: "payload-preferences" as CollectionSlug,
      where: {
        and: [
          { key: { equals: "collection-pages" } },
          { "user.value": { equals: user.id } },
          { "user.relationTo": { equals: authCollectionSlug } },
        ],
      },
      req,
    });

    // If the preference is already set by the user, do not overwrite it
    if (
      existing?.value?.editViewType &&
      existing?.value?.editViewType !== "default"
    ) {
      return result;
    }

    await req.payload.db.upsert({
      collection: "payload-preferences" as CollectionSlug,
      data: {
        key: "collection-pages",
        user: {
          relationTo: authCollectionSlug,
          value: user.id,
        },
        value: {
          ...(existing?.value ?? {}),
          editViewType: "live-preview",
        },
        req,
      },
      where: {
        and: [
          { key: { equals: "collection-pages" } },
          { "user.value": { equals: user.id } },
          { "user.relationTo": { equals: authCollectionSlug } },
        ],
      },
    });
  } catch {
    /* do nothing as existing preferences shouldn't be overwritten */
  }

  return result;
};

export default setDefaultUserPreferences;
