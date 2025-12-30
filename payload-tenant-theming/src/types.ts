import { PropsWithChildren } from "react";

export interface Theme {
  name: string;
  label: string;
  Layout: React.ComponentType<PropsWithChildren>;
  Widgets: Record<string, string | React.ElementType>;
}
