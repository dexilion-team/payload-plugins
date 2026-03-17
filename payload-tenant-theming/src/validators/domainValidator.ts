import {
  CollectionConfig,
  CollectionSlug,
  TextField,
  TextFieldSingleValidation,
  Validate,
} from "payload";

type TenantDomainValidator = Validate<
  string,
  {
    domain: string;
    aliases?: { id: string; domain: string }[];
  },
  unknown,
  TextField
>;

export const createDomainValidator =
  (tenantsCollection: CollectionConfig): TenantDomainValidator =>
  async (
    value: string | null | undefined,
    { req, id, siblingData, data, previousValue, ...rest },
  ) => {
    if (!value) return true;

    // If the value is unchanged, validation is successful
    if (value === previousValue) {
      return true;
    }

    // Check if the current tenant already contain the same domain
    const dataDomains = [
      data.domain,
      ...(data.aliases?.map((a: any) => a.domain) || []),
    ];
    if (dataDomains.filter((d) => d === value).length > 1) {
      return `Domain "${value}" is already in use by the current tenant.`;
    }

    // Check against the domains and aliases of any other tenant
    const existingTenant = await req.payload.find({
      collection: tenantsCollection.slug as CollectionSlug,
      where: {
        or: [
          { domain: { equals: value } },
          { "aliases.domain": { equals: value } },
        ],
        id: { not_equals: id },
      },
      limit: 1,
      disableErrors: true,
    });
    if (existingTenant?.docs && existingTenant.docs.length > 0) {
      return `Domain "${value}" is already in use in a different tenant.`;
    }

    return true;
  };
