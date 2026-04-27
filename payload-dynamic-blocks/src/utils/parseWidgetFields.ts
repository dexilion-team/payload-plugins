import { parse } from "@babel/parser";
import type { JSXAttribute, JSXElement, JSXFragment, Node } from "@babel/types";
import type { Field } from "payload";

/**
 * Maps JSX component names used in the widget code field to Payload field types.
 * `Blocks` is intentionally omitted — it is not supported as a dynamic block field.
 */
const COMPONENT_TO_FIELD_TYPE: Record<string, string> = {
  Array: "array",
  Checkbox: "checkbox",
  Code: "code",
  Collapsible: "collapsible",
  Date: "date",
  Email: "email",
  Group: "group",
  Join: "join",
  JSON: "json",
  Json: "json",
  Number: "number",
  Point: "point",
  Radio: "radio",
  Relationship: "relationship",
  RichText: "richText",
  Richtext: "richText",
  Row: "row",
  Select: "select",
  Text: "text",
  Textarea: "textarea",
  TextArea: "textarea",
  Upload: "upload",
};

/**
 * Recursively converts a Babel AST expression node to a plain JS value.
 */
function extractValue(node: Node | null | undefined): unknown {
  if (!node) return undefined;

  switch (node.type) {
    case "StringLiteral":
      return node.value;
    case "NumericLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "Identifier":
      if (node.name === "undefined") return undefined;
      if (node.name === "true") return true;
      if (node.name === "false") return false;
      // Return identifier name as-is (e.g. enum references)
      return node.name;
    case "ObjectExpression": {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type === "ObjectProperty") {
          const key =
            prop.key.type === "StringLiteral"
              ? prop.key.value
              : prop.key.type === "Identifier"
                ? prop.key.name
                : String(prop.key);
          obj[key] = extractValue(prop.value as Node);
        }
      }
      return obj;
    }
    case "ArrayExpression":
      return (node.elements ?? []).map((el) => extractValue(el as Node));
    case "TemplateLiteral":
      if (node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? "";
      }
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Parses the JSX-like widget code stored in the `widget` code field and
 * returns an array of Payload field config objects.
 *
 * Component names map to Payload field types:
 * `<Text name="title" />` - `{ type: "text", name: "title" }`
 * `<RichText name="body" required />` - `{ type: "richText", name: "body", required: true }`
 *
 * The `Blocks` component is explicitly disallowed and will be ignored.
 */
export function parseWidgetFields(widgetCode: string): Omit<Field, "editor">[] {
  // Wrap in a JSX fragment so multiple sibling elements are valid
  let ast;
  try {
    ast = parse(`${widgetCode}`, {
      plugins: ["jsx"],
      sourceType: "module",
    });
  } catch {
    // Malformed JSX — return empty fields rather than crashing
    return [];
  }

  const fragment = (ast.program.body[0] as any)?.expression as
    | JSXFragment
    | undefined;
  if (!fragment || fragment.type !== "JSXFragment") return [];

  const fields: Omit<Field, "editor">[] = [];

  for (const child of fragment.children) {
    if (child.type !== "JSXElement") continue;

    const opening = (child as JSXElement).openingElement;
    if (opening.name.type !== "JSXIdentifier") continue;
    const componentName = opening.name.name;

    // Explicitly block nested blocks
    if (componentName === "Blocks") continue;

    const fieldType = COMPONENT_TO_FIELD_TYPE[componentName];
    if (!fieldType) continue;

    const fieldConfig: Record<string, unknown> = { type: fieldType };

    for (const attr of opening.attributes) {
      if (attr.type !== "JSXAttribute") continue;
      const jsxAttr = attr as JSXAttribute;

      const propName =
        jsxAttr.name.type === "JSXIdentifier" ? jsxAttr.name.name : null;
      if (!propName) continue;

      if (jsxAttr.value === null) {
        // Boolean shorthand: `required`, `readOnly`, `unique`, etc.
        fieldConfig[propName] = true;
      } else if (jsxAttr.value?.type === "StringLiteral") {
        fieldConfig[propName] = jsxAttr.value.value;
      } else if (jsxAttr.value?.type === "JSXExpressionContainer") {
        if (jsxAttr.value.expression.type !== "JSXEmptyExpression") {
          fieldConfig[propName] = extractValue(jsxAttr.value.expression);
        }
      }
    }

    fields.push(fieldConfig as unknown as Omit<Field, "editor">);
  }

  return fields;
}
