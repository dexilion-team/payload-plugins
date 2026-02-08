import { createNode } from "@payloadcms/richtext-lexical";
import { $createYouTubeNode, YouTubeNode } from "../../nodes/YoutubeNode";
import { createEmbedServerFeature } from "../createServerEmbed";

export const YoutubeFeature = createEmbedServerFeature({
  ClientFeature: "@dexilion/payload-lexical-ext/client#YoutubeFeatureClient",
  fieldDescription:
    "Paste a YouTube video URL or enter the video ID (e.g., dQw4w9WgXcQ)",
  fieldLabel: "YouTube URL or Video ID",
  fieldPlaceholder: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  node: createNode({
    node: YouTubeNode,
    converters: {
      html: {
        nodeTypes: [YouTubeNode.getType()],
        async converter({ node }) {
          return `
						<div>
							<iframe
								src="https://www.youtube-nocookie.com/embed/${node.id}?modestbranding=1&rel=0"
								width="100%"
								style="aspect-ratio: 16/9"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowfullscreen
							></iframe>
						</div>
					`;
        },
      },
    },
  }),
  key: "youtube",
});
