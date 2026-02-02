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

export type Blog = {
  listingComponent: () => Promise<React.ElementType>;
  postComponent: () => Promise<React.ElementType>;
};

export interface Theme {
  name: string;
  label: string;
  Layout: Layout[];
  Widgets: Widget[];
  Blog?: Blog;
  styles?: string[];
}
