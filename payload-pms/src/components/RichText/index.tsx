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
            vimeo: async ({ node }) =>
              `<iframe
                src="https://player.vimeo.com/video/${node.id}"
                style="aspect-ratio: 16/9"
                width="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"                
              ></iframe>
              `,
            youtube: async ({ node }) =>
              `<iframe
                src="https://www.youtube-nocookie.com/embed/${node.id}?modestbranding=1&rel=0"
                width="100%"
                style="aspect-ratio: 16/9"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
