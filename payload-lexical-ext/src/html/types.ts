import { SerializedDecoratorBlockNode } from "@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode";

// Utility type for spreading properties
type Spread<T, U> = Omit<U, keyof T> & T;

export type HtmlComponentProps = Readonly<{
  html: string;
  nodeKey: string;
}>;

export type SerializedHtmlNode = Spread<
  {
    html: string;
  },
  SerializedDecoratorBlockNode
>;
