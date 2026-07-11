"use client";

import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  convertLexicalToHTMLAsync,
  HTMLConvertersAsync,
} from "@payloadcms/richtext-lexical/html-async";
import {
  getRestPopulateFn,
  NodeFormat,
} from "@payloadcms/richtext-lexical/client";

import React, { useEffect, useState } from "react";
import { uploadConverter } from "./uploadConverter";

export const RichText = ({
  content,
  ...rest
}: {
  content: SerializedEditorState;
}) => {
  const [html, setHTML] = useState<null | string>(null);
  useEffect(() => {
    async function convert() {
      const html = await convertLexicalToHTMLAsync({
        data: content,
        populate: getRestPopulateFn({
          apiURL: `/api`,
        }),
        converters: ({ defaultConverters }) => {
          return {
            ...defaultConverters,
            upload: uploadConverter,
            text: convertTextNode,
            "custom-paragraph": defaultConverters.paragraph,
            vimeo: async ({ node }) => {
              const style = node.format
                ? ` style="text-align:${node.format}"`
                : "";
              return `<div${style}><iframe
                src="https://player.vimeo.com/video/${node.id}"
                style="aspect-ratio: 16/9"
                width="${node.width || "100%"}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"                
              ></iframe></div>`;
            },
            youtube: async ({ node }) => {
              const style = node.format
                ? ` style="text-align:${node.format}"`
                : "";
              return `<div${style}><iframe
                src="https://www.youtube-nocookie.com/embed/${node.id}?modestbranding=1&rel=0"
                width="${node.width || "100%"}"
                style="aspect-ratio: 16/9"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe></div>`;
            },
            cta: async ({ node }) => {
              const url = escapeHTML(node.url ?? "");
              const label = escapeHTML(node.label ?? "");
              const justify =
                node.format === "center"
                  ? "center"
                  : node.format === "right"
                    ? "flex-end"
                    : node.format === "left"
                      ? "flex-start"
                      : null;
              const wrap = justify
                ? ` style="display:flex;justify-content:${justify}"`
                : "";
              return `<div${wrap}><a class="EditorCtaButton" href="${url}">${label}</a></div>`;
            },
            // Raw HTML block: rendered as-is by design.
            html: async ({ node }) => {
              return node.html ?? "";
            },
          };
        },
      });
      setHTML(html);
    }

    void convert();
  }, [content]);

  return (
    html && (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        suppressHydrationWarning
      />
    )
  );
};

const escapeHTML = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const convertTextNode = ({ node }: any) => {
  let text = node.text;

  if (!text) {
    return "";
  }

  if (node.format & NodeFormat.IS_BOLD) {
    text = `<strong>${text}</strong>`;
  }
  if (node.format & NodeFormat.IS_ITALIC) {
    text = `<em>${text}</em>`;
  }
  if (node.format & NodeFormat.IS_STRIKETHROUGH) {
    text = `<span style="text-decoration: line-through">${text}</span>`;
  }
  if (node.format & NodeFormat.IS_UNDERLINE) {
    text = `<span style="text-decoration: underline">${text}</span>`;
  }
  if (node.format & NodeFormat.IS_CODE) {
    text = `<code>${text}</code>`;
  }
  if (node.format & NodeFormat.IS_SUBSCRIPT) {
    text = `<sub>${text}</sub>`;
  }
  if (node.format & NodeFormat.IS_SUPERSCRIPT) {
    text = `<sup>${text}</sup>`;
  }
  if (node.style) {
    text = `<span style="${node.style}">${text}</span>`;
  }

  return text;
};

export default RichText;
