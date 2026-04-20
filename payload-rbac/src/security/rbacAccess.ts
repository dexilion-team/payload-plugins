import userHasPermission from "./userHasPermission";
import { PermissionAction } from "../components/admin/PermissionsField";

// Enable RBAC access control for specific mode of a collection
export function rbacAccess(principal: string, action: PermissionAction) {
  return async ({ req }: { req: any }) => {
    console.log(
      `[RBAC] Checking ${action} on ${principal} for user`,
      req.user?.id,
    );
    const result = await userHasPermission({ req, principal, action });
    console.log(`[RBAC] Result:`, result);

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
  return collections.map((col) => ({
    ...col,
    access: rbacAccessAll(col.slug),
  }));
}
