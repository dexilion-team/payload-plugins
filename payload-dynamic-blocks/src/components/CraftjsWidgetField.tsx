"use client";

import { useEffect, useRef, useState } from "react";
import { useField } from "@payloadcms/ui";

export default function CraftjsWidgetField({ path }: { path: string }) {
  const { value, setValue } = useField<string>({ path });
  const [mode, setMode] = useState<"code" | "visual">("code");
  const [craftJson, setCraftJson] = useState<string | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for save messages from the craft.js iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "craftjs-save") return;
      setCraftJson(e.data.json);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // When switching to visual mode, pass existing craftJson into the iframe via URL param
  const iframeSrc = `/craftjs-editor${craftJson ? `?state=${encodeURIComponent(craftJson)}` : ""}`;

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 8, border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden", width: "fit-content" }}>
        {(["code", "visual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "5px 16px",
              fontSize: 12,
              border: "none",
              background: mode === m ? "#4f46e5" : "transparent",
              color: mode === m ? "#fff" : "#555",
              cursor: "pointer",
              fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === "code" ? "Code Editor" : "Visual Editor"}
          </button>
        ))}
      </div>

      {/* Code editor (Payload's default CodeField, shown/hidden via display) */}
      <div style={{ display: mode === "code" ? "block" : "none" }}>
        <textarea
          value={value ?? ""}
          onChange={(e) => setValue(e.target.value)}
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
      </div>

      {/* Visual editor iframe */}
      {mode === "visual" && (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" }}>
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{ width: "100%", height: 600, border: "none", display: "block" }}
          />
        </div>
      )}

      {/* Show saved craft.js state summary */}
      {craftJson && mode === "code" && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
          ✓ Visual editor state saved ({craftJson.length} chars)
        </div>
      )}
    </div>
  );
}
