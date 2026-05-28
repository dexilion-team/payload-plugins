"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { BlockPreview } from "./BlockPreview";
import { parseWidgetFields } from "@dexilion/payload-dynamic-blocks/parseWidgetFields";

type Field = ReturnType<typeof parseWidgetFields>[number];

export function LivePage({
  initialData,
  widgetFieldMap,
}: {
  initialData: Record<string, any>;
  widgetFieldMap: Record<string, Field[]>;
}) {
  const serverURL = typeof window !== "undefined" ? window.location.origin : "";

  const { data } = useLivePreview({
    initialData,
    serverURL,
  });

  const blocks: any[] = Array.isArray(data.content) ? data.content : [];

  return (
    <main style={{ padding: "2rem" }}>
      {blocks.map((block, i) => (
        <BlockPreview
          key={i}
          block={block}
          fields={widgetFieldMap[block.blockType] ?? []}
          blockIndex={i}
          contentPath="content_blocks"
        />
      ))}
    </main>
  );
}
