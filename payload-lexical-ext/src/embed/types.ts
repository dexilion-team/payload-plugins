import { SerializedDecoratorBlockNode } from "@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode";

// Utility type for spreading properties
type Spread<T, U> = Omit<U, keyof T> & T;

export type EmbedComponentProps = Readonly<{
  id: string;
  className?: string;
}>;

export type SerializedEmbedNode = Spread<
  {
    id: string;
  },
  SerializedDecoratorBlockNode
>;
