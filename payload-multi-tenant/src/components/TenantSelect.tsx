import type { CollectionSlug, PayloadRequest } from "payload";

import { findUserTenants } from "../utils";
import TenantSelectClient from "./TenantSelectClient";

const TenantSelect = async ({
  req,
  req: { t },
  tenantSlug,
  tenantFieldName,
  tenantLabelFieldName,
}: {
  req: PayloadRequest;
  tenantSlug: CollectionSlug;
  tenantFieldName: string;
  tenantLabelFieldName: string;
}) => {
  const tenants = (
    await findUserTenants({
      payload: req.payload,
      req,
      tenantFieldName,
      tenantsSlug: tenantSlug,
      user: req.user,
    })
  ).map((tenant) => ({
    id: String(tenant.id),
    value: String(tenant[tenantLabelFieldName]),
  }));

  if (tenants.length === 0) {
    return null;
  }

  return (
    <TenantSelectClient
      tenants={tenants}
      placeholder={
        // @ts-ignore
        t("plugin-multi-tenant:selectorPlaceholder")
      }
    />
  );
};

export default TenantSelect;
