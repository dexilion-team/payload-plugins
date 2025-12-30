import { Metadata } from "next";
import { getPage } from "./getPage";

export const metadataGenerator =
  () =>
  async ({
    params,
    searchParams,
  }: {
    params: any;
    searchParams: any;
  }): Promise<Metadata> => {
    const { segments } = await params;
    const page = await getPage({
      segments,
      pagesSlug: "pages",
    });

    return {
      title: "Dexilion",
      description: "Dexilion Theme",
    };
  };
