"use client";

import { useEditor } from "@craftjs/core";

type NodeItem = {
  id: string;
  name: string;
  depth: number;
  selected: boolean;
};

function collectNodes(
  nodeId: string,
  nodes: Record<string, any>,
  depth: number,
  result: NodeItem[],
) {
  const node = nodes[nodeId];
  if (!node) return;
  result.push({
    id: nodeId,
    name: node.data.displayName || node.data.type,
    depth,
    selected: node.events.selected,
  });
  for (const childId of node.data.nodes ?? []) {
    collectNodes(childId, nodes, depth + 1, result);
  }
}

export function LayersPanel() {
  const { nodes, actions, rootNodeId } = useEditor((state) => ({
    nodes: state.nodes,
    rootNodeId: state.nodes.ROOT?.data ? "ROOT" : null,
  }));

  if (!rootNodeId) return null;

  const items: NodeItem[] = [];
  collectNodes(rootNodeId, nodes, 0, items);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#999", letterSpacing: "0.05em", marginBottom: 10 }}>
        Layers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => actions.selectNode(item.id)}
            style={{
              paddingLeft: 8 + item.depth * 14,
              paddingTop: 5,
              paddingBottom: 5,
              paddingRight: 8,
              fontSize: 12,
              borderRadius: 3,
              cursor: "pointer",
              background: item.selected ? "#ede9fe" : "transparent",
              color: item.selected ? "#4f46e5" : "#333",
              fontWeight: item.selected ? 600 : 400,
            }}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}
