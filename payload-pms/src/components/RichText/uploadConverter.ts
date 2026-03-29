"use server";

import { HTMLConvertersAsync } from "@payloadcms/richtext-lexical/html-async";
import payloadConfig from "@payload-config";
import { getPayload } from "payload";

export const uploadConverter: HTMLConvertersAsync["upload"] = async (
  params,
) => {
  const { node } = params;

  if (node.type !== "upload") {
    return "";
  }

  let { width, height } = node?.fields || {};
  const format = node.format;
  const payload = await getPayload({ config: payloadConfig });
  let image: any = node?.value;
  if (typeof image === "number" || typeof image === "string") {
    try {
      image = (await payload.findByID({
        id: node.value as string,
        collection: node.relationTo,
      })) as unknown as {
        url: string;
        src: string;
        alt?: string;
        width: number;
        height: number;
      };
    } catch (error) {
      payload.logger.error(
        `Error fetching upload data for ID ${node.value}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "";
    }
  }

  if (!image) {
    return "";
  }

  const imgStyle = !width && !height ? "object-fit: contain;" : "";
  const aspectRatio = image ? image.width / image.height : undefined;
  height =
    imgStyle.length > 0
      ? "auto"
      : !isNaN(height)
        ? height
        : !isNaN(width)
          ? width && aspectRatio
            ? Math.round(width / aspectRatio)
            : undefined
          : image.height;
  width =
    imgStyle.length > 0
      ? "100%"
      : !isNaN(width)
        ? width
        : !isNaN(height)
          ? height && aspectRatio
            ? Math.round(height * aspectRatio)
            : undefined
          : image.width;

  const style = format ? `display: flex; justify-content: ${format};` : "";
  const styleParam = style.length > 0 ? `style="${style}"` : "";

  return `<div ${styleParam}><img src="${image.url || image.src}" alt="${image.alt || ""}" width="${width}" height="${height}" style="${imgStyle}" /></div>`;
};
