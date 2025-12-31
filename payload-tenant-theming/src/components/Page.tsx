import { notFound } from "next/navigation";
import payloadConfig from "@/payload.config";
import { getPayload } from "payload";
import { getPage } from "../getPage.ts";

function isNextHttpError(error: unknown, code: number): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeDigest = (error as { digest?: unknown }).digest;
  return (
    typeof maybeDigest === "string" &&
    maybeDigest.startsWith("NEXT_HTTP_ERROR_FALLBACK;" + code)
  );
}

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

    if (isNextHttpError(error, 404)) {
      return notFound();
    }

    payload.logger.error(error);
    return notFound();
  }

  return <></>;
}
