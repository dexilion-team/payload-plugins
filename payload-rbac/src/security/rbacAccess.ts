import userHasPermission from "./userHasPermission";
import { PermissionAction } from "../components/admin/PermissionsField";

// Enable RBAC access control for specific mode of a collection
export function rbacAccess(principal: string, action: PermissionAction) {
  return async ({ req }: { req: any }) => {
    const result = await userHasPermission({ req, principal, action });

    return result;
  };
}

// Enable RBAC access control for all modes of a collection
export function rbacAccessAll(principal: string) {
  return {
    create: rbacAccess(principal, "create"),
    read: rbacAccess(principal, "read"),
    update: rbacAccess(principal, "update"),
    delete: rbacAccess(principal, "delete"),
  };
}

// Enable RBAC access for all collections
//
// Usage:
// import { applyRbacToCollections } from "./src/security/rbacAccess";
//
// const collections = [
//   { slug: "posts", fields: [] },
//   { slug: "media", fields: [], upload: { staticDir: "media" } },
//   { slug: "users", auth: true, fields: [] },
// ];
//
// buildConfig({
//   // ...
//   collections: applyRbacToCollections(collections),
//   // ...
// });
export function applyRbacToCollections(collections: any[]) {
  return collections.map((col) => {
    const rbac = rbacAccessAll(col.slug);
    const existing = col.access || {};

    const merged: Record<string, any> = {};

    for (const action of ["create", "read", "update", "delete"] as const) {
      const rbacFn = rbac[action];
      const existingFn = existing[action];

      if (existingFn) {
        // Both must pass
        merged[action] = async (args: any) => {
          const rbacResult = await rbacFn(args);
          if (!rbacResult) return false;
          return existingFn(args);
        };
      } else {
        merged[action] = rbacFn;
      }
    }

    return {
      ...col,
      access: merged,
    };
  });
}
