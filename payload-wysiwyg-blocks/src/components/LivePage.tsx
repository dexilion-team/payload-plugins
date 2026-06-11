"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { BlockPreview, type PreviewField } from "./BlockPreview";

export function LivePage({
  initialData,
  widgetFieldMap,
  renderField,
}: {
  initialData: Record<string, any>;
  widgetFieldMap: Record<string, PreviewField[]>;
  renderField?: (field: PreviewField, value: unknown) => React.ReactNode;
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
          renderField={renderField}
        />
      ))}
    </main>
  );
}
