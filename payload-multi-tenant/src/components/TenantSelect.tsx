import type { CollectionSlug, PayloadRequest } from "payload";
// import { getPayload } from "payload";
// import config from "@payload-config";

import TenantSelectClient from "./TenantSelectClient";

// async function setPreference<T>(key: string, value: T) {
//   "use server";
//   const payload = await getPayload({ config });
//   await payload.db.upsert({
//     collection: "payload-preferences" as CollectionSlug,
//     data: {
//       key,
//       value,
//     },
//     where: {
//       and: [{ key: { equals: key } }],
//     },
//   });
// }

// async function getPreference<T>(key: string): Promise<T | undefined> {
//   "use server";
//   const payload = await getPayload({ config });
//   const preference = await payload.find({
//     collection: "payload-preferences" as CollectionSlug,
//     where: {
//       key: { equals: key },
//     },
//   });
//   const value = preference.docs[0];

//   return "value" in value ? (value.value as T) : undefined;
// }

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
      pagination: false,
      req,
    })
    .then((res) =>
      res.docs.map((tenant) => ({
        id: String(tenant.id),
        value: String(tenant[tenantLabelFieldName as keyof typeof tenant]),
      })),
    );

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
      // setPreference={setPreference}
      // getPreference={getPreference}
    />
  );
};

export default TenantSelect;
