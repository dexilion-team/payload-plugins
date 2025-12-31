import { notFound } from "next/navigation";
import payloadConfig from "@/payload.config";
import { getPayload } from "payload";
import { getPage } from "../getPage";

export type PageType = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
  pagesSlug: string;
};

export async function Page({ params, searchParams, pagesSlug }: PageType) {
  const { segments } = await params;

  let page;
  try {
    page = await getPage({
      segments,
      pagesSlug,
    });

    if (!page) {
      return notFound();
    }
  } catch (error) {
    const payload = await getPayload({ config: payloadConfig });
    payload.logger.error(error);

    return notFound();
  }

  return <></>;
}
