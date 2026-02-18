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

  let { width, height } = node.fields;
  const format = node.format;
  const payload = await getPayload({ config: payloadConfig });
  const image = await payload.findByID({
    id: node.value as string,
    collection: node.relationTo,
  });

  if (!image) {
    return "";
  }

  const aspectRatio = image ? image.width / image.height : undefined;
  height = !isNaN(height)
    ? height
    : !isNaN(width)
      ? width && aspectRatio
        ? Math.round(width / aspectRatio)
        : undefined
      : image.height;
  width = !isNaN(width)
    ? width
    : !isNaN(height)
      ? height && aspectRatio
        ? Math.round(height * aspectRatio)
        : undefined
      : image.width;

  return `<img ${format ? `style="text-align: ${format};"` : ""} src="${image.url || image.src}" alt="${image.alt || ""}" width="${width}" height="${height}" />`;
};
