"use client";

import { useEditor } from "@craftjs/core";

function ColorInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 2 }}>{label}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)}
          style={{ width: 28, height: 28, padding: 0, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="e.g. #fff or transparent"
          style={{ flex: 1, fontSize: 12, padding: "3px 6px", border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9", color: "#333" }} />
      </div>
    </div>
  );
}

function SpacingInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 2 }}>{label}</label>
      <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="e.g. 8px or 1rem"
        style={{ width: "100%", fontSize: 12, padding: "3px 6px", border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9", color: "#333" }} />
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 2 }}>{label}</label>
      <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", fontSize: 12, padding: "3px 6px", border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9", color: "#333" }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#999", letterSpacing: "0.05em", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #eee" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel() {
  const { selected, actions } = useEditor((state, query) => {
    const selectedIds = [...state.events.selected];
    const id = selectedIds[0];
    if (!id) return { selected: null };
    const node = state.nodes[id];
    return { selected: { id, props: node.data.props, name: node.data.displayName, deletable: query.node(id).isDeletable() } };
  });

  if (!selected) {
    return (
      <div style={{ padding: 16, color: "#aaa", fontSize: 13 }}>
        Select a component to edit its properties.
      </div>
    );
  }

  const setProp = (key: string, value: unknown) => {
    actions.setProp(selected.id, (props: Record<string, unknown>) => {
      props[key] = value;
    });
  };

  const p = selected.props as Record<string, string | undefined>;

  return (
    <div style={{ padding: 12, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{selected.name}</div>
        {selected.deletable && (
          <button
            type="button"
            onClick={() => actions.delete(selected.id)}
            style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #f87171", borderRadius: 4, background: "transparent", color: "#ef4444", cursor: "pointer" }}
          >
            Delete
          </button>
        )}
      </div>

      {"name" in p && (
        <Section title="Field">
          <TextInput label="Name (field key)" value={p.name} onChange={(v) => setProp("name", v)} />
          <TextInput label="Label" value={p.label} onChange={(v) => setProp("label", v)} />
        </Section>
      )}

      <Section title="Colors">
        <ColorInput label="Text color" value={p.color} onChange={(v) => setProp("color", v)} />
        <ColorInput label="Background color" value={p.backgroundColor} onChange={(v) => setProp("backgroundColor", v)} />
        <ColorInput label="Border color" value={p.borderColor} onChange={(v) => setProp("borderColor", v)} />
      </Section>

      <Section title="Padding">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" }}>
          <SpacingInput label="Top" value={p.paddingTop} onChange={(v) => setProp("paddingTop", v)} />
          <SpacingInput label="Right" value={p.paddingRight} onChange={(v) => setProp("paddingRight", v)} />
          <SpacingInput label="Bottom" value={p.paddingBottom} onChange={(v) => setProp("paddingBottom", v)} />
          <SpacingInput label="Left" value={p.paddingLeft} onChange={(v) => setProp("paddingLeft", v)} />
        </div>
      </Section>

      <Section title="Margin">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" }}>
          <SpacingInput label="Top" value={p.marginTop} onChange={(v) => setProp("marginTop", v)} />
          <SpacingInput label="Right" value={p.marginRight} onChange={(v) => setProp("marginRight", v)} />
          <SpacingInput label="Bottom" value={p.marginBottom} onChange={(v) => setProp("marginBottom", v)} />
          <SpacingInput label="Left" value={p.marginLeft} onChange={(v) => setProp("marginLeft", v)} />
        </div>
      </Section>
    </div>
  );
}
