"use client";

import { useEffect, useRef, useState } from "react";
import { useField } from "@payloadcms/ui";

export default function CraftjsWidgetField({ path }: { path: string }) {
  const { value, setValue } = useField<string>({ path });
  const [mode, setMode] = useState<"code" | "visual">("code");
  const craftJsonRef = useRef<string | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoadedRef = useRef(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "craftjs-save") return;
      craftJsonRef.current = e.data.json;
      if (e.data.jsx) {
        setValue(e.data.jsx);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [setValue]);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    if (craftJsonRef.current) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "craftjs-load", json: craftJsonRef.current },
        "*",
      );
    }
  };

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

      {/* Code editor */}
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

      {/*
        Visual editor iframe.
        Uses visibility+overflow hidden instead of display:none or conditional
        rendering so React never unmounts/remounts the iframe element.
      */}
      <div
        style={{
          border: mode === "visual" ? "1px solid #e0e0e0" : "none",
          borderRadius: 6,
          overflow: "hidden",
          visibility: mode === "visual" ? "visible" : "hidden",
          height: mode === "visual" ? "auto" : 0,
        }}
      >
        <iframe
          key="craftjs-iframe"
          ref={iframeRef}
          src="/craftjs-editor"
          onLoad={handleIframeLoad}
          style={{ width: "100%", height: 600, border: "none", display: "block" }}
        />
      </div>
    </div>
  );
}
