import { SerializedDecoratorBlockNode } from "@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode";
import type { ElementFormatType } from "@payloadcms/richtext-lexical/lexical";

// Utility type for spreading properties
type Spread<T, U> = Omit<U, keyof T> & T;

export type CtaComponentProps = Readonly<{
  url: string;
  label: string;
  nodeKey: string;
  format?: ElementFormatType;
}>;

export type SerializedCtaNode = Spread<
  {
    url: string;
    label: string;
  },
  SerializedDecoratorBlockNode
>;
