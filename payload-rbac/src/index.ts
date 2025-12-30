import { CollectionSlug, Config } from "payload";
import { Roles } from "./collections/Roles";

export const rbacPlugin =
  () =>
  (incomingConfig: Config): Config => {
    const config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];

    config.collections.push(Roles);

    const authCollection =
      config.collections.find((c) => c.slug === config.admin?.user) ??
      config.collections.find((c) => Boolean(c.auth));

    if (!authCollection) {
      throw new Error(
        "[@dexilion/payload-rbac] No auth-enabled collection found" +
          ' (e.g. "users").',
      );
    }

    authCollection.fields = authCollection.fields || [];
    authCollection.fields.push({
      name: "roles",
      type: "relationship",
      relationTo: "roles" as CollectionSlug,
      hasMany: true,
      hidden: true,
      admin: {
        hidden: false,
      },
    });

    return config;
  };
