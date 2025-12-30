import { CollectionSlug, PayloadRequest, TypeWithID } from "payload";

export type IsUserInTenantParams<U extends TypeWithID> = {
  user: U | null | undefined;
  tenantsSlug?: CollectionSlug;
  req: PayloadRequest;
};

/**
 * Returns true if the user is associated with the tenant collection you provided.
 *
 * @param param.user The user to check
 * @param param.tenants The tenant collection config to check against
 * @param param.req The Payload request object
 * @returns boolean TRUE if user is in the tenant, FALSE otherwise
 */
export async function isUserInTenant<U extends TypeWithID>({
  user,
  tenantsSlug = "tenants",
  req: { payload },
}: IsUserInTenantParams<U>): Promise<boolean> {
  if (!user) {
    return false;
  }

  return await payload
    .find({
      collection: tenantsSlug,
      where: {
        users: { contains: user.id },
      },
      limit: 1,
    })
    .then(({ totalDocs }) => totalDocs > 0);
}
