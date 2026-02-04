import { PermissionAction } from "../components/admin/PermissionsField";
import { PayloadRequest } from "payload";
export default function userHasPermission({ req, principal, action, }: {
    req: PayloadRequest;
    principal: string | readonly string[];
    action: PermissionAction;
}): Promise<boolean>;
//# sourceMappingURL=userHasPermission.d.ts.map