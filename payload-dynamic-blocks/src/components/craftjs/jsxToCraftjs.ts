const JSX_NAME_TO_CRAFTJS: Record<string, string> = {
  Text: "TextField",
  Email: "EmailField",
  Textarea: "TextareaField",
  TextArea: "TextareaField",
  Number: "NumberField",
  Checkbox: "CheckboxField",
  Select: "SelectField",
  Radio: "RadioField",
  RichText: "RichTextField",
  Richtext: "RichTextField",
  Relationship: "RelationshipField",
  Upload: "RelationshipField",
  div: "DivContainer",
};

type ParsedElement = {
  name: string;
  props: Record<string, unknown>;
  children: ParsedElement[];
};

type CraftNode = {
  type: { resolvedName: string };
  isCanvas: boolean;
  props: Record<string, unknown>;
  displayName: string;
  custom: Record<string, unknown>;
  hidden: boolean;
  nodes: string[];
  linkedNodes: Record<string, string>;
  parent: string;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Minimal client-safe JSX parser — no Babel dependency.
// Handles: self-closing tags, paired tags, string/bool/JSON-expression attributes.
function parseJSX(src: string): ParsedElement[] {
  let j = 0;

  function skip() {
    while (j < src.length && /\s/.test(src[j])) j++;
  }

  function readAttrValue(): unknown {
    if (src[j] === '"' || src[j] === "'") {
      const q = src[j++];
      let v = "";
      while (j < src.length && src[j] !== q) v += src[j++];
      j++;
      return v;
    }
    if (src[j] === "{") {
      j++;
      const start = j;
      let depth = 1;
      while (j < src.length && depth > 0) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") depth--;
        j++;
      }
      const expr = src.slice(start, j - 1).trim();
      try { return JSON.parse(expr); } catch { return expr; }
    }
    return true;
  }

  function readAttrs(): Record<string, unknown> {
    const attrs: Record<string, unknown> = {};
    while (j < src.length) {
      skip();
      if (src[j] === "/" || src[j] === ">") break;
      const ns = j;
      while (j < src.length && !/[\s=/>]/.test(src[j])) j++;
      const name = src.slice(ns, j);
      if (!name) { j++; continue; }
      skip();
      if (src[j] === "=") {
        j++;
        skip();
        attrs[name] = readAttrValue();
      } else {
        attrs[name] = true;
      }
    }
    return attrs;
  }

  function readChildren(): ParsedElement[] {
    const children: ParsedElement[] = [];
    while (j < src.length) {
      skip();
      if (src.startsWith("</", j)) {
        j += 2;
        while (j < src.length && src[j] !== ">") j++;
        j++;
        break;
      }
      const el = readElement();
      if (el) children.push(el);
    }
    return children;
  }

  function readElement(): ParsedElement | null {
    skip();
    if (j >= src.length) return null;
    // Skip JSX fragment open/close
    if (src.startsWith("<>", j)) { j += 2; return null; }
    if (src.startsWith("</>", j)) { j += 3; return null; }
    if (src[j] !== "<") {
      while (j < src.length && src[j] !== "<") j++;
      return null;
    }
    j++;
    // Skip comments/doctype
    if (src[j] === "!") { while (j < src.length && src[j] !== ">") j++; j++; return null; }
    // Read tag name
    const ns = j;
    while (j < src.length && !/[\s/>]/.test(src[j])) j++;
    const name = src.slice(ns, j);
    if (!name) return null;
    const props = readAttrs();
    skip();
    if (src.startsWith("/>", j)) { j += 2; return { name, props, children: [] }; }
    if (src[j] === ">") { j++; return { name, props, children: readChildren() }; }
    return null;
  }

  const elements: ParsedElement[] = [];
  while (j < src.length) {
    skip();
    if (j >= src.length) break;
    const el = readElement();
    if (el) elements.push(el);
  }
  return elements;
}

function elementsToNodes(
  elements: ParsedElement[],
  parentId: string,
  nodes: Record<string, CraftNode>,
): string[] {
  const ids: string[] = [];
  for (const el of elements) {
    const resolvedName = JSX_NAME_TO_CRAFTJS[el.name];
    if (!resolvedName) continue;
    const id = uid();
    const isContainer = resolvedName === "DivContainer";
    const childIds = isContainer ? elementsToNodes(el.children, id, nodes) : [];
    nodes[id] = {
      type: { resolvedName },
      isCanvas: isContainer,
      props: el.props,
      displayName: resolvedName,
      custom: {},
      hidden: false,
      nodes: childIds,
      linkedNodes: {},
      parent: parentId,
    };
    ids.push(id);
  }
  return ids;
}

export function jsxToCraftjsState(jsxCode: string): string | null {
  try {
    const elements = parseJSX(jsxCode);
    const nodes: Record<string, CraftNode> = {};
    const rootChildren = elementsToNodes(elements, "ROOT", nodes);
    nodes["ROOT"] = {
      type: { resolvedName: "DivContainer" },
      isCanvas: true,
      props: {},
      displayName: "DivContainer",
      custom: {},
      hidden: false,
      nodes: rootChildren,
      linkedNodes: {},
      parent: "",
    };
    return JSON.stringify(nodes);
  } catch {
    return null;
  }
}
