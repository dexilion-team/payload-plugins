import { FieldHook } from "payload";

export const setTenantPreference: FieldHook<any, any, any> = async () => {
  // No-op: tenant selection is now client-authoritative via cookie.
  // The TenantSelectClient component sets the "payload-tenant-id" cookie
  // on the browser, which is sent with every request and read by the
  // server-side getActiveTenantIDFromReq function.
};
