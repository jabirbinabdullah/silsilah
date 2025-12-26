import * as d3 from 'd3';

export type Orientation = 'vertical' | 'horizontal';

export type LayoutOptions = {
  orientation?: Orientation; // default 'vertical'
  useCluster?: boolean; // default false (use d3.tree)
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  siblingGap?: number; // nodeSize x-axis gap between siblings (px), default 28
  generationGap?: number; // nodeSize y-axis gap per generation (px), default 140
  bandPadding?: number; // padding inside generation bands (px), default 32
};

export type LayoutConfig<T> = {
  layout: d3.TreeLayout<T> | d3.ClusterLayout<T>;
  orientation: Orientation;
  size: { width: number; height: number };
  margin: { top: number; right: number; bottom: number; left: number };
  nodeSize: { x: number; y: number };
  // Position a hierarchy point node according to orientation and margins
  position: (d: d3.HierarchyPointNode<T>) => { x: number; y: number };
  // Compute generation band rect for a given depth
  bandRect: (depth: number) => { x: number; y: number; width: number; height: number };
};

/**
 * Create a reusable genealogy tree layout configuration using d3.tree() or d3.cluster().
 * Centers the tree within the container and provides helpers for positioning and generation bands.
 */
export function createGenealogyTreeLayout<T>(
  container: SVGSVGElement,
  options: LayoutOptions = {},
): LayoutConfig<T> {
  const orientation: Orientation = options.orientation ?? 'vertical';
  const margin = {
    top: options.margin?.top ?? 40,
    right: options.margin?.right ?? 40,
    bottom: options.margin?.bottom ?? 40,
    left: options.margin?.left ?? 80,
  };
  const siblingGap = options.siblingGap ?? 28;
  const generationGap = options.generationGap ?? 140;
  const bandPadding = options.bandPadding ?? 32;

  const rect = container.getBoundingClientRect();
  const width = rect.width || 1000;
  const height = rect.height || 700;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  // Choose tree or cluster layout
  const layout = options.useCluster ? d3.cluster<T>() : d3.tree<T>();

  // Use nodeSize to enforce fixed per-generation separation and sibling spacing
  // separation influences how far cousins are spread; keep modest to avoid huge gaps
  (layout as d3.TreeLayout<T>).separation?.((a, b) => (a.parent === b.parent ? 1 : 1.5));
  (layout as d3.TreeLayout<T>).nodeSize?.([siblingGap, generationGap]);

  // Position helper: maps layout coordinates to screen coordinates with margins
  const position = (d: d3.HierarchyPointNode<T>) => {
    if (orientation === 'vertical') {
      // x spreads horizontally, y increases with depth vertically
      const x = margin.left + innerWidth / 2 + d.x;
      const y = margin.top + d.y;
      return { x, y };
    } else {
      // horizontal: x increases with depth, y spreads vertically
      const x = margin.left + d.y;
      const y = margin.top + innerHeight / 2 + d.x;
      return { x, y };
    }
  };

  // Generation band rect for depth
  const bandRect = (depth: number) => {
    if (orientation === 'vertical') {
      const yStart = margin.top + depth * generationGap + bandPadding / 2;
      return { x: 0, y: yStart, width, height: generationGap - bandPadding };
    } else {
      const xStart = margin.left + depth * generationGap + bandPadding / 2;
      return { x: xStart, y: 0, width: generationGap - bandPadding, height };
    }
  };

  return {
    layout,
    orientation,
    size: { width, height },
    margin,
    nodeSize: { x: siblingGap, y: generationGap },
    position,
    bandRect,
  };
}
