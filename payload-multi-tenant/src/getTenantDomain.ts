import { headers } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";

export async function getTenantDomain(): Promise<string | null> {
  const payload = await getPayload({ config });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  const tenant = await payload.find<"tenants", { domain: true }, false>({
    collection: "tenants",
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

  const domain = tenant.docs?.[0]?.domain as string | undefined;

  return domain ?? host;
}
