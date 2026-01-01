import { Block } from "payload";
import { PropsWithChildren } from "react";

export type Widget = {
  block: Block;
  component: (block: any) => Promise<React.ElementType>;
};

export interface Theme {
  name: string;
  label: string;
  Layout: React.ComponentType<PropsWithChildren>;
  Widgets: Widget[];
}
