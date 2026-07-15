"use client";

import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $getNodeByKey,
  $createParagraphNode,
} from "@payloadcms/richtext-lexical/lexical";
import { $insertNodeToNearestRoot } from "@payloadcms/richtext-lexical/lexical/utils";
import {
  FieldsDrawer,
  useEditorConfigContext,
  useLexicalDrawer,
} from "@payloadcms/richtext-lexical/client";
import { formatDrawerSlug, useEditDepth } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { INSERT_HTML, EDIT_HTML } from "./command";
import { $createHtmlNode, $isHtmlNode, HtmlNode } from "../nodes/HtmlNode";

type CreatePluginProps = {
  title: string;
};

export const createPlugin = ({ title }: CreatePluginProps) => {
  return () => {
    const editDepth = useEditDepth();
    const [editor] = useLexicalComposerContext();
    const {
      fieldProps: { schemaPath },
      uuid,
    } = useEditorConfigContext();
    const drawerSlug = formatDrawerSlug({
      slug: `lexical-html-${HtmlNode.getType()}-${uuid}`,
      depth: editDepth,
    });
    const { toggleDrawer } = useLexicalDrawer(drawerSlug, true);
    const schemaFieldsPath = `${schemaPath}.lexical_internal_feature.${HtmlNode.getType()}.fields`;

    // Node key currently being edited (null when inserting a new block).
    const editingNodeKey = useRef<string | null>(null);
    // Prefilled value passed to the drawer form when editing.
    const [drawerData, setDrawerData] = useState<{ html: string }>({
      html: "",
    });

    const handleDrawerSubmit = useCallback(
      (_fields: unknown, data: any) => {
        const html = (data?.html as string) ?? "";

        if (!html) {
          return;
        }

        const nodeKey = editingNodeKey.current;

        editor.update(() => {
          if (nodeKey) {
            const existing = $getNodeByKey(nodeKey);
            if ($isHtmlNode(existing)) {
              existing.setHtml(html);
            }
            return;
          }

          const htmlNode = $createHtmlNode(html);

          let selection = $getSelection();

          // Drawer interactions can temporarily clear lexical selection.
          if (!$isRangeSelection(selection)) {
            $getRoot().selectEnd();
            selection = $getSelection();
          }

          // `useLexicalDrawer` re-applies the selection it captured before the
          // drawer opened, so the inserted node must not consume the node that
          // selection points at.
          if ($isRangeSelection(selection)) {
            $insertNodeToNearestRoot(htmlNode);
          }

          // Keep editor state structurally valid.
          if ($getRoot().getChildrenSize() === 0) {
            $getRoot().append($createParagraphNode());
          }
        });
      },
      [editor],
    );

    useEffect(() => {
      return editor.registerCommand(
        INSERT_HTML,
        () => {
          editingNodeKey.current = null;
          setDrawerData({ html: "" });
          toggleDrawer();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      );
    }, [editor, toggleDrawer]);

    useEffect(() => {
      return editor.registerCommand(
        EDIT_HTML,
        ({ nodeKey }) => {
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isHtmlNode(node)) {
              editingNodeKey.current = nodeKey;
              setDrawerData({ html: node.getHtml() });
              toggleDrawer();
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      );
    }, [editor, toggleDrawer]);

    return (
      <FieldsDrawer
        className="lexical-html-drawer"
        data={drawerData}
        drawerSlug={drawerSlug}
        drawerTitle={title}
        featureKey={HtmlNode.getType()}
        schemaFieldsPathOverride={schemaFieldsPath}
        schemaPath={schemaPath}
        schemaPathSuffix="fields"
        handleDrawerSubmit={handleDrawerSubmit}
      />
    );
  };
};
