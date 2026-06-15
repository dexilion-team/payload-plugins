"use client";

import { useState } from "react";
import { useField } from "@payloadcms/ui";
import dynamic from "next/dynamic";
import { jsxToCraftjsState } from "./craftjs/jsxToCraftjs";

const CraftjsEditorPage = dynamic(
  () => import("./craftjs/CraftjsEditorPage"),
  { ssr: false },
);

export default function CraftjsWidgetField({ path }: { path: string }) {
  const { value: jsxValue, setValue: setJsxValue } = useField<string>({ path });
  const craftjsStatePath = path.replace(/(^|\.)widget$/, (_, prefix) => `${prefix}craftjsState`);
  const { value: craftjsState, setValue: setCraftjsState } = useField<string>({ path: craftjsStatePath });
  const [mode, setMode] = useState<"code" | "visual">("code");
  const [visualKey, setVisualKey] = useState(0);
  const [visualJson, setVisualJson] = useState<string | null>(null);

  const switchMode = (next: "code" | "visual") => {
    if (next === "visual") {
      // Always re-derive from JSX when coming from code editor so manual
      // edits to the code field are always reflected in the visual editor.
      const json = mode === "code"
        ? (jsxValue ? jsxToCraftjsState(jsxValue) : null)
        : craftjsState || (jsxValue ? jsxToCraftjsState(jsxValue) : null);
      setVisualJson(json);
      setVisualKey((k) => k + 1);
    }
    setMode(next);
  };

  const handleSave = (json: string, jsx: string) => {
    setCraftjsState(json);
    setJsxValue(jsx);
  };

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 8, border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden", width: "fit-content" }}>
        {(["code", "visual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            style={{
              padding: "5px 16px",
              fontSize: 12,
              border: "none",
              background: mode === m ? "#4f46e5" : "transparent",
              color: "#fff",
              cursor: "pointer",
              fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === "code" ? "Code Editor" : "Visual Editor"}
          </button>
        ))}
      </div>

      {/* Code editor */}
      {mode === "code" && (
        <textarea
          value={jsxValue ?? ""}
          onChange={(e) => setJsxValue(e.target.value)}
          rows={12}
          style={{
            width: "100%",
            fontFamily: "monospace",
            fontSize: 13,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 4,
            resize: "vertical",
          }}
        />
      )}

      {/* Visual editor */}
      {mode === "visual" && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" }}>
          <CraftjsEditorPage
            key={visualKey}
            initialJson={visualJson ?? undefined}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
