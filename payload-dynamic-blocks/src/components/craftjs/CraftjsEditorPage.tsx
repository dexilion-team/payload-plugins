"use client";

import { useEffect, useState } from "react";
import { Editor, Frame, Element } from "@craftjs/core";
import { craftjsStateToJsx } from "./craftjsToJsx";
import {
  TextField, EmailField, TextareaField, NumberField,
  CheckboxField, SelectField, RadioField, RichTextField,
  RelationshipField, DivContainer,
} from "./components/FieldComponents";
import { Toolbox } from "./Toolbox";
import { SettingsPanel } from "./SettingsPanel";
import { LayersPanel } from "./LayersPanel";

const RESOLVER = {
  TextField,
  EmailField,
  TextareaField,
  NumberField,
  CheckboxField,
  SelectField,
  RadioField,
  RichTextField,
  RelationshipField,
  DivContainer,
};

function Topbar({ onSave, onUndo, onRedo, canUndo, canRedo }: {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div style={{
      height: 44,
      background: "#1e1e2e",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 14px",
      flexShrink: 0,
    }}>
      <span style={{ color: "#a0a0c0", fontSize: 13, fontWeight: 600 }}>Widget Builder</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onUndo} disabled={!canUndo} style={btnStyle(!canUndo)}>Undo</button>
        <button onClick={onRedo} disabled={!canRedo} style={btnStyle(!canRedo)}>Redo</button>
        <button onClick={onSave} style={{ ...btnStyle(false), background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" }}>
          Save
        </button>
      </div>
    </div>
  );
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "4px 12px",
    fontSize: 12,
    border: "1px solid #555",
    borderRadius: 4,
    background: "transparent",
    color: disabled ? "#555" : "#ccc",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function EditorInner({ initialJson, onSave }: {
  initialJson?: string;
  onSave: (json: string, jsx: string) => void;
}) {
  const [rightTab, setRightTab] = useState<"settings" | "layers">("settings");

  const { useEditor } = require("@craftjs/core");
  const { actions, query, canUndo, canRedo } = useEditor((state: any, q: any) => ({
    canUndo: q.history.canUndo(),
    canRedo: q.history.canRedo(),
  }));

  useEffect(() => {
    if (initialJson) {
      try { actions.deserialize(initialJson); } catch { /* ignore */ }
    }
  }, []);

  const handleSave = () => {
    const json = query.serialize();
    const jsx = craftjsStateToJsx(json);
    onSave(json, jsx);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 600, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#333" }}>
      <Topbar
        onSave={handleSave}
        onUndo={() => actions.history.undo()}
        onRedo={() => actions.history.redo()}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left — Toolbox */}
        <div style={{ width: 180, borderRight: "1px solid #e8e8e8", overflowY: "auto", flexShrink: 0 }}>
          <Toolbox />
        </div>

        {/* Center — Canvas */}
        <div style={{ flex: 1, overflowY: "auto", background: "#f8f8f8", padding: 24 }}>
          <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 24, minHeight: 400 }}>
            <Frame>
              <Element is={DivContainer} canvas id="root-canvas" />
            </Frame>
          </div>
        </div>

        {/* Right — Settings + Layers */}
        <div style={{ width: 240, borderLeft: "1px solid #e8e8e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e8e8e8" }}>
            {(["settings", "layers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  fontSize: 12,
                  border: "none",
                  borderBottom: rightTab === tab ? "2px solid #4f46e5" : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  color: rightTab === tab ? "#4f46e5" : "#666",
                  fontWeight: rightTab === tab ? 600 : 400,
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {rightTab === "settings" ? <SettingsPanel /> : <LayersPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CraftjsEditorPage({ initialJson, onSave }: {
  initialJson?: string;
  onSave: (json: string, jsx: string) => void;
}) {
  return (
    <Editor resolver={RESOLVER}>
      <EditorInner initialJson={initialJson} onSave={onSave} />
    </Editor>
  );
}
