import type { CollectionConfig } from "payload";

export const Roles: CollectionConfig = {
  slug: "roles",
  access: {
    read: ({ req: { user } }) => {
      if (!user) {
        return false;
      }

      if (Number(user.id) === 1) {
        return true;
      }

      return {};
    },
  },
  admin: {
    defaultColumns: ["role", "users"],
    useAsTitle: "role",
  },
  fields: [
    {
      name: "role",
      label: "Role Name",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "users",
      type: "relationship",
      relationTo: "users",
      hasMany: true,
    },
    {
      name: "permissions",
      label: "Permissions",
      type: "json",
      typescriptSchema: [
        () => ({
          type: "object",
          additionalProperties: {
            type: "object",
            additionalProperties: {
              type: "boolean",
            },
          },
        }),
      ],
      admin: {
        components: {
          Field: "/components/admin/PermissionsField",
        },
      },
    },
  ],
};
