import type { FieldClientComponent } from "payload";
declare const actions: readonly ["read", "create", "delete", "update"];
export type PermissionAction = (typeof actions)[number];
declare const PermissionsField: FieldClientComponent;
export default PermissionsField;
//# sourceMappingURL=PermissionsField.d.ts.map