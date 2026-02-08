"use client";

import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { convertLexicalToHTMLAsync } from "@payloadcms/richtext-lexical/html-async";
import { getRestPopulateFn } from "@payloadcms/richtext-lexical/client";

import React, { useEffect, useState } from "react";

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
            vimeo: async ({ node }) =>
              `<iframe
                src="https://player.vimeo.com/video/${node.id}"
                style="aspect-ratio: 16/9"
                width="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              `,
            youtube: async ({ node }) =>
              `<iframe
                src="https://www.youtube-nocookie.com/embed/${node.id}?modestbranding=1&rel=0"
                width="100%"
                style="aspect-ratio: 16/9"
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
