import type {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
} from "@payloadcms/richtext-lexical/lexical";
import { JSX } from "react";
import VimeoComponent from "../components/VimeoComponent";
import { EmbedNode } from "./EmbedNode";
import { SerializedEmbedNode } from "../types";

export class VimeoNode extends EmbedNode {
  static override getType(): string {
    return "vimeo";
  }

  static override clone(node: EmbedNode): EmbedNode {
    return super.clone(node);
  }

  static override importJSON(serializedNode: SerializedEmbedNode): VimeoNode {
    return super.importJSON(serializedNode) as VimeoNode;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement("iframe");

    element.style.aspectRatio = "16/9";
    element.setAttribute("data-lexical-vimeo", this.__id);
    element.setAttribute("width", this.__width ? String(this.__width) : "100%");
    element.setAttribute("src", `https://player.vimeo.com/video/${this.__id}`);
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

        const match = src?.match(/vimeo\.com\/video\/([^?]+)/);

        if (match && match[1]) {
          return {
            conversion: () => ({
              node: $createVimeoNode(match[1]!, undefined),
            }),
            priority: 1,
          };
        }

        return null;
      },
    };
  }

  override getTextContent(): string {
    return `https://www.vimeo.com/${this.__id}`;
  }

  override decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const className = config.theme.embedBlock?.base ?? undefined;

    return VimeoComponent({ id: this.__id, width: this.__width, className });
  }

  override exportJSON(): SerializedEmbedNode {
    return super.exportJSON();
  }
}

export function $createVimeoNode(videoID: string, width?: string): VimeoNode {
  return new VimeoNode(videoID, width);
}

export function $isVimeoNode(
  node: VimeoNode | LexicalNode | null | undefined,
): node is VimeoNode {
  return node instanceof VimeoNode;
}
