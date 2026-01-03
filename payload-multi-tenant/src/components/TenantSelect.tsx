import type { CollectionSlug, PayloadRequest } from "payload";

import TenantSelectClient from "./TenantSelectClient";

const TenantSelect = async ({
  req,
  req: { t },
  tenantSlug,
  tenantLabelFieldName,
}: {
  req: PayloadRequest;
  tenantSlug: CollectionSlug;
  tenantLabelFieldName: string;
}) => {
  const tenants = await req.payload
    .find({
      collection: tenantSlug,
      overrideAccess: false,
      pagination: false,
      req,
    })
    .then((res) => {
      return res.docs.map((tenant) => ({
        id: String(tenant.id),
        value: String(tenant[tenantLabelFieldName as keyof typeof tenant]),
      }));
    });

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
