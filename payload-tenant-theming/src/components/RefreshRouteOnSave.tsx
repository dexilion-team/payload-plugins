"use client";

import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation.js";
import React from "react";

export const RefreshRouteOnSave = ({
  livePreviewPathBase,
}: {
  livePreviewPathBase?: string;
}) => {
  const router = useRouter();

  return (
    <PayloadLivePreview
      refresh={() => router.refresh()}
      serverURL={window.location.origin + (livePreviewPathBase ?? "")}
    />
  );
};
