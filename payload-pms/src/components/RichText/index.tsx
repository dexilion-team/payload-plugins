"use client";

import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { convertLexicalToHTMLAsync } from "@payloadcms/richtext-lexical/html-async";
import {
  getRestPopulateFn,
  NodeFormat,
} from "@payloadcms/richtext-lexical/client";

import React, { useEffect, useState } from "react";

const customConverter = async ({
  node,
  providedStyleTag,
}: {
  node: any;
  providedStyleTag: any;
}) => {
  const sub = node.children.map((child: any) => {
    let text = child.text;

    if (!text) {
      return "";
    }

    if (child.format & NodeFormat.IS_BOLD) {
      text = `<strong>${text}</strong>`;
    }
    if (child.format & NodeFormat.IS_ITALIC) {
      text = `<em>${text}</em>`;
    }
    if (child.format & NodeFormat.IS_STRIKETHROUGH) {
      text = `<span style="text-decoration: line-through">${text}</span>`;
    }
    if (child.format & NodeFormat.IS_UNDERLINE) {
      text = `<span style="text-decoration: underline">${text}</span>`;
    }
    if (child.format & NodeFormat.IS_CODE) {
      text = `<code>${text}</code>`;
    }
    if (child.format & NodeFormat.IS_SUBSCRIPT) {
      text = `<sub>${text}</sub>`;
    }
    if (child.format & NodeFormat.IS_SUPERSCRIPT) {
      text = `<sup>${text}</sup>`;
    }
    if (child.style) {
      text = `<span style="${child.style}">${text}</span>`;
    }

    return text;
  });
  return `<${node.tag}${providedStyleTag}>${sub.join("")}</${node.tag}>`;
};

export const RichText = ({ content }: { content: SerializedEditorState }) => {
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
            "custom-heading": customConverter,
            "custom-paragraph": customConverter,
            vimeo: async ({ node }) =>
              `<iframe
                src="https://player.vimeo.com/video/${node.id}"
                width="100%"
                style={ aspect-ratio: "16/9" }
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              `,
            youtube: async ({ node }) =>
              `<iframe
                src="https://www.youtube-nocookie.com/embed/${node.id}?modestbranding=1&rel=0"
                width="100%"
                style={{ aspect-ratio: "16/9" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>`,
          };
        },
      });
      setHTML(html);
    }

    void convert();
  }, [content]);

  return html && <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default RichText;
