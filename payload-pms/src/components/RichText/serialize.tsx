import type {
  LinkFields,
  SerializedLinkNode,
} from "@payloadcms/richtext-lexical";
import type {
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedTextNode,
} from "@payloadcms/richtext-lexical/lexical";
import type {
  SerializedListItemNode,
  SerializedListNode,
} from "@payloadcms/richtext-lexical/lexical/list";
import type { SerializedHeadingNode } from "@payloadcms/richtext-lexical/lexical/rich-text";
import type { JSX } from "react";
import Image from "next/image";

import React, { Fragment } from "react";

import {
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_SUBSCRIPT,
  IS_SUPERSCRIPT,
  IS_UNDERLINE,
} from "./nodeFormat";
import Link from "next/link";

interface Props {
  nodes: SerializedLexicalNode[];
  opts?: {
    uploadCaption?: boolean;
  };
}

export function serializeLexical({ nodes, opts }: Props): JSX.Element {
  return (
    <Fragment>
      {nodes?.map((_node, index): JSX.Element | null => {
        if (_node.type === "text") {
          const node = _node as SerializedTextNode;
          let text = <React.Fragment key={index}>{node.text}</React.Fragment>;

          if (node.format & IS_BOLD) {
            text = <strong key={index}>{text}</strong>;
          }
          if (node.format & IS_ITALIC) {
            text = <em key={index}>{text}</em>;
          }
          if (node.format & IS_STRIKETHROUGH) {
            text = (
              <span key={index} style={{ textDecoration: "line-through" }}>
                {text}
              </span>
            );
          }
          if (node.format & IS_UNDERLINE) {
            text = (
              <span key={index} style={{ textDecoration: "underline" }}>
                {text}
              </span>
            );
          }
          if (node.format & IS_CODE) {
            text = <code key={index}>{node.text}</code>;
          }
          if (node.format & IS_SUBSCRIPT) {
            text = <sub key={index}>{text}</sub>;
          }
          if (node.format & IS_SUPERSCRIPT) {
            text = <sup key={index}>{text}</sup>;
          }

          return text;
        }

        if (_node == null) {
          return null;
        }

        // NOTE: Hacky fix for
        // https://github.com/facebook/lexical/blob/d10c4e6e55261b2fdd7d1845aed46151d0f06a8c/packages/lexical-list/src/LexicalListItemNode.ts#L133
        // which does not return checked: false (only true - i.e. there is no prop for false)
        const serializedChildrenFn = (
          node: SerializedElementNode,
        ): JSX.Element | null => {
          if (node.children == null) {
            return null;
          } else {
            if (
              node?.type === "list" &&
              (node as SerializedListNode)?.listType === "check"
            ) {
              for (const item of node.children) {
                if ("checked" in item) {
                  if (!item?.checked) {
                    item.checked = false;
                  }
                }
              }
              return serializeLexical({ nodes: node.children });
            } else {
              return serializeLexical({ nodes: node.children });
            }
          }
        };

        const serializedChildren =
          "children" in _node
            ? serializedChildrenFn(_node as SerializedElementNode)
            : "";

        switch (_node.type) {
          case "heading": {
            const node = _node as SerializedHeadingNode;
            const params: Record<string, any> = {};
            // @ts-ignore
            if (node.format === "center") {
              params.style = { textAlign: "center" };
            }
            // @ts-ignore
            if (node.format === "right" || node.format === "end") {
              params.style = { textAlign: "right" };
            }
            // @ts-ignore
            if (node.format === "justify") {
              params.style = { textAlign: "justify" };
            }

            type Heading = Extract<
              keyof JSX.IntrinsicElements,
              "h1" | "h2" | "h3" | "h4" | "h5"
            >;
            const Tag = node?.tag as Heading;
            return (
              <Tag key={index} {...params}>
                {serializedChildren}
              </Tag>
            );
          }
          case "linebreak": {
            return <br key={index} />;
          }
          case "link": {
            const node = _node as SerializedLinkNode;

            const fields: LinkFields = node.fields;

            return (
              <Link key={index} href={fields.url!}>
                {serializedChildren}
              </Link>
            );
          }
          case "list": {
            const node = _node as SerializedListNode;

            type List = Extract<keyof JSX.IntrinsicElements, "ol" | "ul">;
            const Tag = node?.tag as List;
            return (
              <Tag className="list" key={index}>
                {serializedChildren}
              </Tag>
            );
          }
          case "listitem": {
            const node = _node as SerializedListItemNode;

            if (node?.checked != null) {
              return (
                <li
                  aria-checked={node.checked ? "true" : "false"}
                  className={` ${node.checked ? "" : ""}`}
                  key={index}
                  role="checkbox"
                  tabIndex={-1}
                  value={node?.value}
                >
                  {serializedChildren}
                </li>
              );
            } else {
              return (
                <li key={index} value={node?.value}>
                  {serializedChildren}
                </li>
              );
            }
          }
          case "paragraph": {
            const params: Record<string, any> = {};
            // @ts-ignore
            if (_node.format === "center") {
              params.style = { textAlign: "center" };
            }
            // @ts-ignore
            if (_node.format === "right" || _node.format === "end") {
              params.style = { textAlign: "right" };
            }
            // @ts-ignore
            if (_node.format === "justify") {
              params.style = { textAlign: "justify" };
            }
            return (
              <p key={index} {...params}>
                {serializedChildren}
              </p>
            );
          }
          case "quote": {
            return <blockquote key={index}>{serializedChildren}</blockquote>;
          }
          case "upload": {
            const upload = _node as any;
            if (typeof upload.value === "number") {
              console.warn(
                "Upload node has numeric value, cannot render",
                upload.value,
              );
              return <Fragment key={index}></Fragment>;
            }

            const mediaUrl = upload.value?.url || "";
            const altText = upload.value?.alt || "";
            const mimeType = upload.value?.mimeType || "";
            const width = upload.value?.width || 0;
            const height = upload.value?.height || 0;

            if (
              !["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(
                mimeType,
              )
            ) {
              return <Fragment key={index}></Fragment>;
            }

            const img = (
              <Image
                key={index}
                src={mediaUrl}
                alt={altText}
                width={width}
                height={height}
              />
            );

            return opts?.uploadCaption ? (
              <figure key={index}>
                {img}
                <figcaption>
                  <em>{altText}</em>
                </figcaption>
              </figure>
            ) : (
              img
            );
          }

          default:
            return null;
        }
      })}
    </Fragment>
  );
}
