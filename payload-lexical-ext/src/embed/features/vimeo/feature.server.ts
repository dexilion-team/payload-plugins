import { createNode } from "@payloadcms/richtext-lexical";
import { VimeoNode } from "../../nodes/VimeoNode";
import { createEmbedServerFeature } from "../createServerEmbed";

export const VimeoFeature = createEmbedServerFeature({
  ClientFeature: "@dexilion/payload-lexical-ext/client#VimeoFeatureClient",
  fieldDescription:
    "Paste a Vimeo video URL or enter the video ID (e.g., 123456789)",
  fieldLabel: "Vimeo URL or Video ID",
  fieldPlaceholder: "https://vimeo.com/123456789",
  node: createNode({
    node: VimeoNode,
    converters: {
      html: {
        nodeTypes: [VimeoNode.getType()],
        async converter({ node }) {
          return `
						<div>
							<iframe
								src="https://player.vimeo.com/video/${node.id}"
								width="100%"
								style="aspect-ratio: 16/9"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"								
							></iframe>
						</div>
					`;
        },
      },
    },
  }),
  key: "vimeo",
});
