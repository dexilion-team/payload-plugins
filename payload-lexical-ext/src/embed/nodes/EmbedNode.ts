import { DecoratorBlockNode } from "@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode";
import { SerializedEmbedNode } from "../types";

import type {
  ElementFormatType,
  NodeKey,
} from "@payloadcms/richtext-lexical/lexical";

export type { SerializedEmbedNode };

export class EmbedNode extends DecoratorBlockNode {
  __id: string;

  static override getType(): string {
    return "embed";
  }

  static override clone(node: EmbedNode): EmbedNode {
    return new this(node.__id, node.__format, node.__key);
  }

  static override importJSON(serializedNode: SerializedEmbedNode): EmbedNode {
    const node = new this(serializedNode.id);

    node.setFormat(serializedNode.format);

    return node;
  }

  constructor(id: string, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__id = id;
  }

  getId(): string {
    return this.__id;
  }

  override exportJSON(): SerializedEmbedNode {
    return {
      ...super.exportJSON(),
      type: this.getType(),
      version: 1,
      id: this.__id,
    };
  }
}
