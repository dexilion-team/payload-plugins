import React from "react";
import { EmbedComponentProps } from "../types";

export default function ({
  id,
  width,
}: EmbedComponentProps): React.JSX.Element {
  return (
    <div style={{ pointerEvents: "none" }} tabIndex={-1}>
      <iframe
        width={width ?? "100%"}
        src={`https://player.vimeo.com/video/${id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title="Play video"
        style={{ aspectRatio: "16/9", pointerEvents: "none" }}
        tabIndex={-1}
      />
    </div>
  );
}
