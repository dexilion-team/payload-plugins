"use client";

import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import {
  LexicalCommand,
  COMMAND_PRIORITY_EDITOR,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $createParagraphNode,
} from "@payloadcms/richtext-lexical/lexical";
import {
  FieldsDrawer,
  useEditorConfigContext,
  useLexicalDrawer,
} from "@payloadcms/richtext-lexical/client";
import { formatDrawerSlug, useEditDepth } from "@payloadcms/ui";
import { useCallback, useEffect } from "react";
import type { EmbedNode } from "../nodes/EmbedNode";
import { $createYouTubeNode } from "../nodes/YoutubeNode";
import { $createVimeoNode } from "../nodes/VimeoNode";

type CreatePluginProps = {
  command: LexicalCommand<{ replace: boolean }>;
  node: typeof EmbedNode;
  title: string;
  placeholder: string;
  description: string;
};

function extractVideoId(input: string, type: string): string | null {
  if (!input) return null;

  // If it's already just an ID (no URL parts), return it
  if (!/[:/]/.test(input)) {
    return input;
  }

  // Extract from URLs
  if (type === "youtube") {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  } else if (type === "vimeo") {
    // Handle various Vimeo URL formats
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/,
      /^(\d+)$/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return null;
}

export const createPlugin = ({
  command,
  node,
  title,
  placeholder,
  description,
}: CreatePluginProps) => {
  return () => {
    const editDepth = useEditDepth();
    const [editor] = useLexicalComposerContext();
    const {
      fieldProps: { schemaPath },
      uuid,
    } = useEditorConfigContext();
    const drawerSlug = formatDrawerSlug({
      slug: `lexical-embed-${node.getType()}-${uuid}`,
      depth: editDepth,
    });
    const { toggleDrawer } = useLexicalDrawer(drawerSlug, true);
    const schemaFieldsPath = `${schemaPath}.lexical_internal_feature.${node.getType()}.fields`;

    const handleDrawerSubmit = useCallback(
      (_fields: unknown, data: any) => {
        const input = data?.video as string;

        if (!input) {
          return;
        }

        const nodeType = node.getType();
        const videoId = extractVideoId(input, nodeType);

        if (!videoId) {
          console.error(`Invalid ${nodeType} video ID or URL:`, input);
          return;
        }

        editor.update(() => {
          let selection = $getSelection();

          let embedNode: EmbedNode;
          if (nodeType === "youtube") {
            embedNode = $createYouTubeNode(videoId);
          } else if (nodeType === "vimeo") {
            embedNode = $createVimeoNode(videoId);
          } else {
            // Fallback for custom embed types
            embedNode = new node(videoId);
          }

          // Drawer interactions can temporarily clear lexical selection.
          if (!$isRangeSelection(selection)) {
            $getRoot().selectEnd();
            selection = $getSelection();
          }

          if ($isRangeSelection(selection)) {
            $insertNodes([embedNode]);
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
        command,
        (payload: { replace: boolean }) => {
          toggleDrawer();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      );
    }, [editor, command, toggleDrawer]);

    return (
      <FieldsDrawer
        className="lexical-embed-drawer"
        drawerSlug={drawerSlug}
        drawerTitle={title}
        featureKey={node.getType()}
        schemaFieldsPathOverride={schemaFieldsPath}
        schemaPath={schemaPath}
        schemaPathSuffix="fields"
        handleDrawerSubmit={handleDrawerSubmit}
      />
    );
  };
};
