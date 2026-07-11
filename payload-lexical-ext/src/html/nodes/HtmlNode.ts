import { DecoratorBlockNode } from "@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode";

import type {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from "@payloadcms/richtext-lexical/lexical";
import { createElement, JSX } from "react";
import HtmlComponent from "../components/HtmlComponent";
import { SerializedHtmlNode } from "../types";

// Marker attribute so raw-HTML blocks can round-trip through copy/paste.
export const HTML_NODE_ATTR = "data-lexical-html";

export class HtmlNode extends DecoratorBlockNode {
  __html: string;

  static override getType(): string {
    return "html";
  }

  static override clone(node: HtmlNode): HtmlNode {
    return new HtmlNode(node.__html, node.__format, node.__key);
  }

  static override importJSON(serializedNode: SerializedHtmlNode): HtmlNode {
    const node = new HtmlNode(serializedNode.html);

    node.setFormat(serializedNode.format);

    return node;
  }

  constructor(html: string, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__html = html;
  }

  getHtml(): string {
    return this.__html;
  }

  setHtml(html: string): void {
    const writable = this.getWritable();
    writable.__html = html;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.setAttribute(HTML_NODE_ATTR, "true");
    element.innerHTML = this.__html;

    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute(HTML_NODE_ATTR)) {
          return null;
        }

        return {
          conversion: () => ({
            node: $createHtmlNode(domNode.innerHTML ?? ""),
          }),
          priority: 1,
        };
      },
    };
  }

  override getTextContent(): string {
    return "";
  }

  override createDOM(): HTMLElement {
    const element = document.createElement("div");
    // Payload styles decorator wrappers as `width: fit-content`; force the
    // wrapper to fill its line so injected block HTML lays out normally.
    element.style.width = "100%";
    return element;
  }

  override decorate(
    _editor: LexicalEditor,
    _config: EditorConfig,
  ): JSX.Element {
    return createElement(HtmlComponent, {
      html: this.__html,
      nodeKey: this.getKey(),
    });
  }

  override exportJSON(): SerializedHtmlNode {
    return {
      ...super.exportJSON(),
      type: this.getType(),
      version: 1,
      html: this.__html,
    };
  }
}

export function $createHtmlNode(html: string): HtmlNode {
  return new HtmlNode(html);
}

export function $isHtmlNode(
  node: HtmlNode | LexicalNode | null | undefined,
): node is HtmlNode {
  return node instanceof HtmlNode;
}
