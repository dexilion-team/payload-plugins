"use client";

import { BlocksField } from "@payloadcms/ui";
import { useEffect, useState } from "react";

export default function WidgetField() {
  const [blocks, setBlocks] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/blocks")
      .then((res) => res.json())
      .then((data) => {
        setBlocks(data.blocks);
        setReady(true);
      })
      .catch((err) => console.error("Error fetching blocks:", err));
  }, []);

  if (!ready) return null;

  return (
    <BlocksField
      path="widget"
      field={{
        name: "widget",
        blocks,
        labels: { singular: "Widget", plural: "Widgets" },
      }}
    />
  );
}
