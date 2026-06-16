type CraftNode = {
  type: { resolvedName: string } | string;
  props: Record<string, unknown>;
  nodes: string[];
  linkedNodes: Record<string, string>;
};

type CraftState = Record<string, CraftNode>;

const DISPLAY_NAME_TO_JSX: Record<string, string> = {
  TextField: "Text",
  EmailField: "Email",
  TextareaField: "Textarea",
  NumberField: "Number",
  CheckboxField: "Checkbox",
  SelectField: "Select",
  RadioField: "Radio",
  RichTextField: "RichText",
  RelationshipField: "Relationship",
  GroupField: "Group",
  TabsContainer: "Tabs",
  TabField: "Tab",
  DivContainer: "div",
};

const STYLE_PROPS = new Set([
  "color", "backgroundColor", "borderColor",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
]);

function serializeValue(value: unknown): string {
  if (typeof value === "string") return `"${value.replace(/"/g, '\\"')}"`;
  if (typeof value === "boolean") return value ? "" : `{false}`;
  if (value === null || value === undefined) return "";
  return `{${JSON.stringify(value)}}`;
}

function nodeToJsx(nodeId: string, state: CraftState, indent: number): string {
  const node = state[nodeId];
  if (!nodeId || !node) return "";

  const resolvedName = typeof node.type === "string" ? node.type : node.type?.resolvedName;
  if (!resolvedName || resolvedName === "ROOT") {
    return childrenToJsx(node.nodes, state, indent);
  }

  const tag = DISPLAY_NAME_TO_JSX[resolvedName];
  if (!tag) return "";

  const pad = "  ".repeat(indent);

  // Filter out style props and empty/undefined values
  const attrs = Object.entries(node.props)
    .filter(([k, v]) => !STYLE_PROPS.has(k) && v !== undefined && v !== "" && v !== null)
    .map(([k, v]) => {
      if (typeof v === "boolean" && v === true) return k;
      const serialized = serializeValue(v);
      return serialized === "" ? null : `${k}=${serialized}`;
    })
    .filter(Boolean)
    .join(" ");

  const children = node.nodes ?? [];
  const isContainer = ["Group", "Tabs", "Tab", "div"].includes(tag);

  if (children.length === 0 && !isContainer) {
    return `${pad}<${tag}${attrs ? " " + attrs : ""} />`;
  }

  const childJsx = childrenToJsx(children, state, indent + 1);
  return `${pad}<${tag}${attrs ? " " + attrs : ""}>\n${childJsx}\n${pad}</${tag}>`;
}

function childrenToJsx(nodeIds: string[], state: CraftState, indent: number): string {
  return nodeIds
    .map((id) => nodeToJsx(id, state, indent))
    .filter(Boolean)
    .join("\n");
}

export function craftjsStateToJsx(serializedJson: string): string {
  let state: CraftState;
  try {
    state = JSON.parse(serializedJson);
  } catch {
    return "";
  }

  const rootNode = state["ROOT"];
  if (!rootNode) return "";

  const children = rootNode.nodes ?? [];
  if (children.length === 0) return "<></>";

  const inner = childrenToJsx(children, state, 1);
  return `<>\n${inner}\n</>`;
}
