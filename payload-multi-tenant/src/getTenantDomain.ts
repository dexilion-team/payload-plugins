import { headers } from "next/headers";
import config from "@payload-config";
import { CollectionSlug, getPayload } from "payload";

export async function getTenantDomain() {
  const payload = await getPayload({ config });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  const tenant = await payload.find({
    collection: "tenants" as CollectionSlug,
    disableErrors: true,
    limit: 1,
    where: {
      or: [
        {
          domain: {
            equals: host,
          },
        },
        {
          "aliases.domain": {
            equals: host,
          },
        },
      ],
    },
  });

  return tenant.docs?.[0]?.domain ?? host;
}
