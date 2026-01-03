import { Block, Option } from "payload";
import { PropsWithChildren } from "react";

export type Widget = {
  block: Block;
  component: () => Promise<React.ElementType>;
};

export type Layout = {
  option: Option;
  component: () => Promise<React.ElementType<PropsWithChildren>>;
};

export interface Theme {
  name: string;
  label: string;
  Layout: Layout[];
  Widgets: Widget[];
  styles?: string[];
}
