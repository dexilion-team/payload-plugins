const stripHtml = (value = "") => value.replace(/<[^>]+>/g, " ").toLowerCase();

const extractLexicalText = (node: unknown): string => {
  if (!node || typeof node !== "object") {
    return "";
  }

  const { text, children } = node as { text?: string; children?: unknown[] };

  const childText = Array.isArray(children)
    ? children.map(extractLexicalText).join(" ")
    : "";

  return [text, childText].filter(Boolean).join(" ");
};

// `content` is a Payload Lexical SerializedEditorState (an object tree),
// not an HTML string, so it needs its own text extraction.
export const richTextToSearchableText = (value: unknown): string => {
  if (typeof value === "string") {
    return stripHtml(value);
  }

  if (value && typeof value === "object") {
    const root = (value as { root?: unknown }).root ?? value;
    return extractLexicalText(root).toLowerCase();
  }

  return "";
};
