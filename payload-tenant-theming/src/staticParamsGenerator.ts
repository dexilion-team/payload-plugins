import payloadConfig from "@/payload.config";
import { CollectionSlug, getPayload } from "payload";

export const staticParamsGenerator =
  ({
    pagesSlug = "pages",
    pathFieldName = "path",
  }: {
    pagesSlug?: string;
    pathFieldName?: string;
  } = {}) =>
  async () => {
    const payload = await getPayload({ config: payloadConfig });
    const pages = await payload.find({
      collection: pagesSlug as CollectionSlug,
      limit: 0,
    });

    let params: any[] = [];
    try {
      params = pages.docs.map((page) => {
        const path = page[pathFieldName as keyof typeof page];
        if (!path || typeof path !== "string") {
          throw new Error(
            `[@dexilion/payload-tenant-theming] The specified path field "${pathFieldName}" does not exist or is not a string on page with ID "${page.id}".`,
          );
        }

        return {
          segments: path === "/" ? [] : path.replace(/^\//, "").split("/"),
        };
      });
    } catch (error) {
      payload.logger.error(error);
    }

    return params;
  };
