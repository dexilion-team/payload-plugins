"use client";

import { useNode } from "@craftjs/core";
import type { CSSProperties } from "react";

export type StyleProps = {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
};

export type FieldProps = StyleProps & {
  name?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
};

function buildStyle(props: StyleProps): CSSProperties {
  return {
    color: props.color || undefined,
    backgroundColor: props.backgroundColor || undefined,
    borderColor: props.borderColor || undefined,
    paddingTop: props.paddingTop || undefined,
    paddingRight: props.paddingRight || undefined,
    paddingBottom: props.paddingBottom || undefined,
    paddingLeft: props.paddingLeft || undefined,
    marginTop: props.marginTop || undefined,
    marginRight: props.marginRight || undefined,
    marginBottom: props.marginBottom || undefined,
    marginLeft: props.marginLeft || undefined,
  };
}

function FieldWrapper({
  label,
  required,
  style,
  children,
  selected,
}: {
  label?: string;
  required?: boolean;
  style: CSSProperties;
  children: React.ReactNode;
  selected: boolean;
}) {
  return (
    <div
      style={{
        ...style,
        border: selected ? "2px solid #4f46e5" : "1px dashed #ccc",
        borderRadius: 4,
        padding: style.paddingTop ? undefined : "6px 8px",
        marginBottom: style.marginBottom ?? "8px",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {label && (
        <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 2 }}>
          {label}
          {required && <span style={{ color: "red", marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

// --- Text ---
export function TextField(props: FieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <input type="text" placeholder={props.placeholder ?? props.label ?? "Text"} disabled style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 14 }} />
      </FieldWrapper>
    </div>
  );
}
TextField.craft = { displayName: "Text", props: { name: "field", label: "Text Field" } };

// --- Email ---
export function EmailField(props: FieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <input type="email" placeholder={props.placeholder ?? props.label ?? "Email"} disabled style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 14 }} />
      </FieldWrapper>
    </div>
  );
}
EmailField.craft = { displayName: "Email", props: { name: "field", label: "Email Field" } };

// --- Textarea ---
export function TextareaField(props: FieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <textarea placeholder={props.placeholder ?? props.label ?? "Textarea"} disabled rows={3} style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 14, resize: "none" }} />
      </FieldWrapper>
    </div>
  );
}
TextareaField.craft = { displayName: "Textarea", props: { name: "field", label: "Textarea Field" } };

// --- Number ---
export function NumberField(props: FieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <input type="number" placeholder={props.placeholder ?? props.label ?? "0"} disabled style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 14 }} />
      </FieldWrapper>
    </div>
  );
}
NumberField.craft = { displayName: "Number", props: { name: "field", label: "Number Field" } };

// --- Checkbox ---
export function CheckboxField(props: FieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={undefined} required={props.required} style={buildStyle(props)} selected={selected}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" disabled />
          {props.label ?? "Checkbox"}
          {props.required && <span style={{ color: "red" }}>*</span>}
        </label>
      </FieldWrapper>
    </div>
  );
}
CheckboxField.craft = { displayName: "Checkbox", props: { name: "field", label: "Checkbox Field" } };

// --- Select ---
export type SelectFieldProps = FieldProps & { options?: { label: string; value: string }[] };
export function SelectField(props: SelectFieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <select disabled style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 14 }}>
          <option value="">Select…</option>
          {(props.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </FieldWrapper>
    </div>
  );
}
SelectField.craft = { displayName: "Select", props: { name: "field", label: "Select Field", options: [] } };

// --- Radio ---
export type RadioFieldProps = FieldProps & { options?: { label: string; value: string }[] };
export function RadioField(props: RadioFieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(props.options ?? [{ label: "Option 1", value: "opt1" }, { label: "Option 2", value: "opt2" }]).map((o) => (
            <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
              <input type="radio" disabled />
              {o.label}
            </label>
          ))}
        </div>
      </FieldWrapper>
    </div>
  );
}
RadioField.craft = { displayName: "Radio", props: { name: "field", label: "Radio Field", options: [{ label: "Option 1", value: "opt1" }] } };

// --- RichText ---
export function RichTextField(props: FieldProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <div style={{ minHeight: 60, background: "#f9f9f9", borderRadius: 2, padding: "4px 6px", fontSize: 14, color: "#aaa" }}>
          Rich text editor…
        </div>
      </FieldWrapper>
    </div>
  );
}
RichTextField.craft = { displayName: "RichText", props: { name: "field", label: "Rich Text Field" } };

// --- Relationship/Upload ---
export function RelationshipField(props: FieldProps & { relationTo?: string }) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div ref={(r) => r && connect(drag(r))}>
      <FieldWrapper label={props.label} required={props.required} style={buildStyle(props)} selected={selected}>
        <div style={{ minHeight: 36, background: "#f0f0f0", borderRadius: 2, padding: "4px 6px", fontSize: 14, color: "#aaa" }}>
          {props.relationTo ? `Relationship → ${props.relationTo}` : "Relationship…"}
        </div>
      </FieldWrapper>
    </div>
  );
}
RelationshipField.craft = { displayName: "Relationship", props: { name: "field", label: "Relationship Field", relationTo: "media" } };

// --- Group (named object container) ---
export type GroupProps = StyleProps & { name?: string; label?: string; children?: React.ReactNode };
export function GroupField(props: GroupProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div
      ref={(r) => r && connect(drag(r))}
      style={{
        ...buildStyle(props),
        border: selected ? "2px solid #4f46e5" : "1px dashed #aaa",
        borderRadius: 4,
        padding: "8px",
        marginBottom: "8px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>
        Group: <span style={{ fontWeight: 400 }}>{props.name ?? "group"}</span>
      </div>
      {props.children ?? <span style={{ color: "#ccc", fontSize: 12 }}>Drop fields here…</span>}
    </div>
  );
}
GroupField.craft = {
  displayName: "Group",
  isCanvas: true,
  props: { name: "group", label: "Group" },
  rules: { canDrop: () => true },
};

// --- Tab (container inside Tabs) ---
export type TabProps = StyleProps & { name?: string; label?: string; children?: React.ReactNode };
export function TabField(props: TabProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div
      ref={(r) => r && connect(drag(r))}
      style={{
        ...buildStyle(props),
        border: selected ? "2px solid #4f46e5" : "1px dashed #aaa",
        borderRadius: 4,
        minHeight: 48,
        padding: "8px",
        marginBottom: "4px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{props.label ?? props.name ?? "Tab"}</div>
      {props.children ?? <span style={{ color: "#ccc", fontSize: 12 }}>Drop fields here…</span>}
    </div>
  );
}
TabField.craft = {
  displayName: "Tab",
  isCanvas: true,
  props: { name: "tab", label: "Tab" },
  rules: { canDrop: () => true },
};

// --- Tabs (container of Tab children) ---
export type TabsProps = StyleProps & { children?: React.ReactNode };
export function TabsContainer(props: TabsProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div
      ref={(r) => r && connect(drag(r))}
      style={{
        ...buildStyle(props),
        border: selected ? "2px solid #4f46e5" : "1px dashed #aaa",
        borderRadius: 4,
        padding: "8px",
        marginBottom: "8px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>Tabs</div>
      {props.children ?? <span style={{ color: "#ccc", fontSize: 12 }}>Drop Tab components here…</span>}
    </div>
  );
}
TabsContainer.craft = {
  displayName: "Tabs",
  isCanvas: true,
  props: {},
  rules: {
    canDrop: () => true,
    canMoveIn: (incoming: any[]) => incoming.every((n) => n.data?.displayName === "Tab"),
  },
};

// --- Div (container) ---
export type DivProps = StyleProps & { children?: React.ReactNode };
export function DivContainer(props: DivProps) {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }));
  return (
    <div
      ref={(r) => r && connect(drag(r))}
      style={{
        ...buildStyle(props),
        border: selected ? "2px solid #4f46e5" : "1px dashed #aaa",
        borderRadius: 4,
        minHeight: 48,
        padding: props.paddingTop ? undefined : "8px",
        marginBottom: props.marginBottom ?? "8px",
        cursor: "pointer",
      }}
    >
      {props.children ?? <span style={{ color: "#ccc", fontSize: 12 }}>Drop fields here…</span>}
    </div>
  );
}
DivContainer.craft = {
  displayName: "Div",
  isCanvas: true,
  props: {},
  rules: { canDrop: () => true },
};
