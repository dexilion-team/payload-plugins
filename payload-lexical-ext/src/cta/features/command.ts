import {
  createCommand,
  type LexicalCommand,
} from "@payloadcms/richtext-lexical/lexical";

export const INSERT_CTA: LexicalCommand<{ replace: boolean }> =
  createCommand("INSERT_CTA");

export const EDIT_CTA: LexicalCommand<{ nodeKey: string }> =
  createCommand("EDIT_CTA");
