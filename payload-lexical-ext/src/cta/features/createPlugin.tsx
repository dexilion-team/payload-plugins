"use client";

import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_EDITOR,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $getNodeByKey,
  $createParagraphNode,
} from "@payloadcms/richtext-lexical/lexical";
import {
  FieldsDrawer,
  useEditorConfigContext,
  useLexicalDrawer,
} from "@payloadcms/richtext-lexical/client";
import { formatDrawerSlug, useEditDepth } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { INSERT_CTA, EDIT_CTA } from "./command";
import { $createCtaNode, $isCtaNode, CtaNode } from "../nodes/CtaNode";

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
      slug: `lexical-cta-${CtaNode.getType()}-${uuid}`,
      depth: editDepth,
    });
    const { toggleDrawer } = useLexicalDrawer(drawerSlug, true);
    const schemaFieldsPath = `${schemaPath}.lexical_internal_feature.${CtaNode.getType()}.fields`;

    // Node key currently being edited (null when inserting a new CTA).
    const editingNodeKey = useRef<string | null>(null);
    // Prefilled values passed to the drawer form when editing.
    const [drawerData, setDrawerData] = useState<{
      url: string;
      label: string;
    }>({ url: "", label: "" });

    const handleDrawerSubmit = useCallback(
      (_fields: unknown, data: any) => {
        const url = (data?.url as string) ?? "";
        const label = (data?.label as string) ?? "";

        if (!url || !label) {
          return;
        }

        const nodeKey = editingNodeKey.current;

        editor.update(() => {
          if (nodeKey) {
            const existing = $getNodeByKey(nodeKey);
            if ($isCtaNode(existing)) {
              existing.setUrl(url);
              existing.setLabel(label);
            }
            return;
          }

          const ctaNode = $createCtaNode(url, label);

          let selection = $getSelection();

          // Drawer interactions can temporarily clear lexical selection.
          if (!$isRangeSelection(selection)) {
            $getRoot().selectEnd();
            selection = $getSelection();
          }

          if ($isRangeSelection(selection)) {
            $insertNodes([ctaNode]);
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
        INSERT_CTA,
        () => {
          editingNodeKey.current = null;
          setDrawerData({ url: "", label: "" });
          toggleDrawer();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      );
    }, [editor, toggleDrawer]);

    useEffect(() => {
      return editor.registerCommand(
        EDIT_CTA,
        ({ nodeKey }) => {
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isCtaNode(node)) {
              editingNodeKey.current = nodeKey;
              setDrawerData({ url: node.getUrl(), label: node.getLabel() });
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
        className="lexical-cta-drawer"
        data={drawerData}
        drawerSlug={drawerSlug}
        drawerTitle={title}
        featureKey={CtaNode.getType()}
        schemaFieldsPathOverride={schemaFieldsPath}
        schemaPath={schemaPath}
        schemaPathSuffix="fields"
        handleDrawerSubmit={handleDrawerSubmit}
      />
    );
  };
};
