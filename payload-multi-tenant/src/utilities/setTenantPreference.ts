import { FieldHook } from "payload";
import { getPreference, setPreference } from "@dexilion/payload-utils";

export const setTenantPreference: FieldHook<any, any, any> = async ({
  req,
  operation,
}) => {
  if (operation === "create") {
    const existingPreference = await getPreference<number | undefined>({
      req,
      key: "admin-tenant-select",
    });

    if (existingPreference == null) {
      await setPreference({
        req,
        key: "admin-tenant-select",
        value: 1,
      });
    }
  }
};
