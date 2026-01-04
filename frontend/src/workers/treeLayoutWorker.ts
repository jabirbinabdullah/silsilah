/* eslint-disable no-restricted-globals */
import * as d3 from 'd3';

export type TreeNode = {
  id: string;
  name: string;
  children: TreeNode[];
  _children?: TreeNode[];
};

export type LayoutRequest = {
  tree: TreeNode;
  nodeSizeX: number;
  nodeSizeY: number;
};

export type LayoutResponse = {
  descendants: Array<{ id: string; name: string; depth: number; x: number; y: number }>;
  links: Array<{ sourceId: string; targetId: string }>;
};

self.onmessage = (evt: MessageEvent<LayoutRequest>) => {
  const { tree, nodeSizeX, nodeSizeY } = evt.data;
  try {
    const hierarchy = d3.hierarchy<TreeNode>(tree, (d) => d.children);
    const treeLayout = d3.tree<TreeNode>();
    treeLayout.nodeSize([nodeSizeX, nodeSizeY]);
    treeLayout(hierarchy);

    const descendants = hierarchy.descendants().map((d) => ({
      id: d.data.id,
      name: d.data.name,
      depth: d.depth,
      x: (d as any).x as number,
      y: (d as any).y as number,
    }));

    const links = hierarchy.links().map((l) => ({
      sourceId: l.source.data.id,
      targetId: l.target.data.id,
    }));

    const response: LayoutResponse = { descendants, links };
    (self as any).postMessage(response);
  } catch (e) {
    // Return empty layout on error to avoid breaking UI
    const response: LayoutResponse = { descendants: [], links: [] };
    (self as any).postMessage(response);
  }
};
