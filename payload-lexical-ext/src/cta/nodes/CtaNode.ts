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
import CtaComponent from "../components/CtaComponent";
import { SerializedCtaNode } from "../types";

export const CTA_BUTTON_CLASS = "EditorCtaButton";

export class CtaNode extends DecoratorBlockNode {
  __url: string;
  __label: string;

  static override getType(): string {
    return "cta";
  }

  static override clone(node: CtaNode): CtaNode {
    return new CtaNode(node.__url, node.__label, node.__format, node.__key);
  }

  static override importJSON(serializedNode: SerializedCtaNode): CtaNode {
    const node = new CtaNode(serializedNode.url, serializedNode.label);

    node.setFormat(serializedNode.format);

    return node;
  }

  constructor(
    url: string,
    label: string,
    format?: ElementFormatType,
    key?: NodeKey,
  ) {
    super(format, key);
    this.__url = url;
    this.__label = label;
  }

  getUrl(): string {
    return this.__url;
  }

  getLabel(): string {
    return this.__label;
  }

  setUrl(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  setLabel(label: string): void {
    const writable = this.getWritable();
    writable.__label = label;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement("a");

    element.className = CTA_BUTTON_CLASS;
    element.setAttribute("href", this.__url);
    element.textContent = this.__label;

    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      a: (domNode: HTMLElement) => {
        if (!domNode.classList.contains(CTA_BUTTON_CLASS)) {
          return null;
        }

        return {
          conversion: () => ({
            node: $createCtaNode(
              domNode.getAttribute("href") ?? "",
              domNode.textContent ?? "",
            ),
          }),
          priority: 1,
        };
      },
    };
  }

  override getTextContent(): string {
    return this.__label;
  }

  override createDOM(): HTMLElement {
    const element = document.createElement("div");
    element.style.width = "100%";
    return element;
  }

  override decorate(
    _editor: LexicalEditor,
    _config: EditorConfig,
  ): JSX.Element {
    return createElement(CtaComponent, {
      url: this.__url,
      label: this.__label,
      nodeKey: this.getKey(),
      format: this.__format || "",
    });
  }

  override exportJSON(): SerializedCtaNode {
    return {
      ...super.exportJSON(),
      type: this.getType(),
      version: 1,
      url: this.__url,
      label: this.__label,
    };
  }
}

export function $createCtaNode(url: string, label: string): CtaNode {
  return new CtaNode(url, label);
}

export function $isCtaNode(
  node: CtaNode | LexicalNode | null | undefined,
): node is CtaNode {
  return node instanceof CtaNode;
}
