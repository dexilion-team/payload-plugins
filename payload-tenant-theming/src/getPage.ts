import payloadConfig from "@/payload.config";
import { getTenantName } from "@dexilion/payload-multi-tenant";
import { CollectionSlug, getPayload } from "payload";
import { getTheme } from "./getTheme";

export const getPage = async ({
  segments,
  pagesSlug,
}: {
  segments: string[];
  pagesSlug: string;
}): Promise<any | null> => {
  const payload = await getPayload({ config: payloadConfig });
  const tenantName = await getTenantName();

  if (!tenantName) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] No tenant found for the current request.`,
    );
  }

  let theme;
  try {
    theme = await getTheme({
      config: await payloadConfig,
      tenantName,
    });

    if (!theme || !theme.Layout) {
      throw new Error(
        `[@dexilion/payload-tenant-theming] No theme or layout found for tenant "${tenantName}".`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      payload.logger.warn(error.message);
    } else {
      payload.logger.warn(
        "[@dexilion/payload-tenant-theming] Unknown error occurred while fetching theme.",
      );
    }
  }

  const path = await payload.find({
    collection: pagesSlug as CollectionSlug,
    where: {
      path: {
        equals: "/" + (segments ?? []).join("/"),
      },
    },
  });

  return path.docs[0] || null;
};
