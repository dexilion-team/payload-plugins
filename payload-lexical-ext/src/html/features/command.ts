import {
  createCommand,
  type LexicalCommand,
} from "@payloadcms/richtext-lexical/lexical";

export const INSERT_HTML: LexicalCommand<{ replace: boolean }> =
  createCommand("INSERT_HTML");

export const EDIT_HTML: LexicalCommand<{ nodeKey: string }> =
  createCommand("EDIT_HTML");
