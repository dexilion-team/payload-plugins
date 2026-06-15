"use client";

import { useEditor } from "@craftjs/core";
import {
  TextField, EmailField, TextareaField, NumberField,
  CheckboxField, SelectField, RadioField, RichTextField,
  RelationshipField, GroupField, TabsContainer, TabField, DivContainer,
} from "./components/FieldComponents";

type ComponentEntry = {
  label: string;
  component: any;
  defaultProps?: Record<string, unknown>;
};

const COMPONENTS: ComponentEntry[] = [
  { label: "Text", component: TextField, defaultProps: { name: "title", label: "Title" } },
  { label: "Email", component: EmailField, defaultProps: { name: "email", label: "Email" } },
  { label: "Textarea", component: TextareaField, defaultProps: { name: "body", label: "Body" } },
  { label: "Number", component: NumberField, defaultProps: { name: "count", label: "Count" } },
  { label: "Checkbox", component: CheckboxField, defaultProps: { name: "enabled", label: "Enabled" } },
  { label: "Select", component: SelectField, defaultProps: { name: "status", label: "Status", options: [{ label: "Draft", value: "draft" }, { label: "Published", value: "published" }] } },
  { label: "Radio", component: RadioField, defaultProps: { name: "layout", label: "Layout", options: [{ label: "Full", value: "full" }, { label: "Sidebar", value: "sidebar" }] } },
  { label: "RichText", component: RichTextField, defaultProps: { name: "content", label: "Content" } },
  { label: "Relationship", component: RelationshipField, defaultProps: { name: "image", label: "Image", relationTo: "media" } },
  { label: "Group", component: GroupField, defaultProps: { name: "group", label: "Group" } },
  { label: "Tabs", component: TabsContainer, defaultProps: {} },
  { label: "Tab", component: TabField, defaultProps: { name: "content", label: "Content" } },
  { label: "Div", component: DivContainer, defaultProps: {} },
];

export function Toolbox() {
  const { connectors } = useEditor();

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#999", letterSpacing: "0.05em", marginBottom: 10 }}>
        Components
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {COMPONENTS.map(({ label, component, defaultProps }) => {
          const C: React.ElementType = component.default ?? component;
          return (
            <div
              key={label}
              ref={(r) => { if (r) connectors.create(r, <C {...(defaultProps ?? {})} />); }}
              style={{
                padding: "7px 10px",
                background: "#f5f5f5",
                borderRadius: 4,
                fontSize: 13,
                cursor: "grab",
                border: "1px solid #e8e8e8",
                color: "#333",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 15 }}>&#8287;</span>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
