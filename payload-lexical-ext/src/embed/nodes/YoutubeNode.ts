import type {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
} from "@payloadcms/richtext-lexical/lexical";
import { JSX } from "react";
import YoutubeComponent from "../components/YoutubeComponent";
import { EmbedNode } from "./EmbedNode";
import { SerializedEmbedNode } from "../types";

export class YouTubeNode extends EmbedNode {
  static override getType(): string {
    return "youtube";
  }

  static override clone(node: EmbedNode): EmbedNode {
    return super.clone(node);
  }

  static override importJSON(serializedNode: SerializedEmbedNode): YouTubeNode {
    return super.importJSON(serializedNode) as YouTubeNode;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement("iframe");

    element.style.aspectRatio = "16/9";
    element.setAttribute("data-lexical-youtube", this.__id);
    element.setAttribute("width", "100%");
    element.setAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${this.__id}`,
    );
    element.setAttribute("frameborder", "0");
    element.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    );

    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      iframe: (domNode: HTMLElement) => {
        const src =
          domNode.getAttribute("src") || domNode.getAttribute("data-src");

        const match = src?.match(/youtube(\-nocookie)?\.com\/embed\/([^?]+)/);

        if (match && match[2]) {
          return {
            conversion: () => ({ node: $createYouTubeNode(match[2]!) }),
            priority: 1,
          };
        }

        return null;
      },
    };
  }

  override getTextContent(): string {
    return `https://www.youtube.com/watch?v=${this.__id}`;
  }

  override decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const className = config.theme.embedBlock?.base ?? undefined;

    return YoutubeComponent({ id: this.__id, className });
  }

  override exportJSON(): SerializedEmbedNode {
    return super.exportJSON();
  }
}

export function $createYouTubeNode(
  videoID: string,
  width?: string,
): YouTubeNode {
  return new YouTubeNode(videoID, width);
}

export function $isYouTubeNode(
  node: YouTubeNode | LexicalNode | null | undefined,
): node is YouTubeNode {
  return node instanceof YouTubeNode;
}
