import type { CollectionSlug, PayloadRequest } from "payload";

export async function setPreference({
  req,
  key,
  value,
}: {
  req: PayloadRequest;
  key: string;
  value: unknown;
}) {
  const payload = req.payload;
  const userSlug = req.payload.config.admin.user;

  await payload.db.upsert({
    collection: "payload-preferences" as CollectionSlug,
    data: {
      key,
      user: {
        relationTo: userSlug,
        value: req.user?.id,
      },
      value,
      req,
    },
    where: {
      and: [
        { key: { equals: "admin-tenant-select" } },
        { "user.value": { equals: req.user?.id } },
        { "user.relationTo": { equals: userSlug } },
      ],
    },
  });
}

export async function getPreference<P = unknown>({
  req,
  key,
}: {
  req: {
    payload: PayloadRequest["payload"];
    user: PayloadRequest["user"];
  };
  key: string;
}): Promise<P | undefined> {
  if (!Object.keys(req).includes("headers")) {
    return undefined;
  }

  const payload = req.payload;
  const userSlug = req.payload.config.admin.user;

  return payload
    .find({
      collection: "payload-preferences" as CollectionSlug,
      where: {
        and: [
          { key: { equals: key } },
          { "user.value": { equals: req.user?.id } },
          { "user.relationTo": { equals: userSlug } },
        ],
      },
      req,
      limit: 1,
    })
    .then(
      (res) => (res.docs[0] as { value?: unknown } | undefined)?.value as P,
    );
}
