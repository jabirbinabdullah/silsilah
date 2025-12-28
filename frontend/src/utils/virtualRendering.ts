/**
 * Virtual rendering system for large trees
 * Only renders visible nodes and edges within viewport
 */

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface VirtualNode {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  importance: number;
}

export interface VirtualRenderingConfig {
  enableVirtualRendering: boolean;
  cullingMargin: number; // Pixels around viewport to pre-render
  batchSize: number; // Nodes to render per frame
  useWebWorker: boolean;
  cacheRenderData: boolean;
}

/**
 * Virtual renderer for culling nodes outside viewport
 */
export class VirtualRenderer {
  private config: VirtualRenderingConfig;
  private visibleNodes: Set<string> = new Set();
  private visibleEdges: Set<string> = new Set();
  private viewport: Viewport = {
    x: 0,
    y: 0,
    width: 1000,
    height: 800,
    scale: 1,
  };

  constructor(config: Partial<VirtualRenderingConfig> = {}) {
    this.config = {
      enableVirtualRendering: true,
      cullingMargin: 200,
      batchSize: 50,
      useWebWorker: true,
      cacheRenderData: true,
      ...config,
    };
  }

  /**
   * Update viewport dimensions and position
   */
  updateViewport(viewport: Viewport): void {
    this.viewport = viewport;
  }

  /**
   * Cull nodes - determine which should be rendered
   */
  cullNodes(
    allNodes: Array<{ id: string; x: number; y: number }>,
    importance?: (nodeId: string) => number
  ): Set<string> {
    if (!this.config.enableVirtualRendering || allNodes.length < 100) {
      // Don't bother culling for small datasets
      return new Set(allNodes.map(n => n.id));
    }

    const visible = new Set<string>();
    const margin = this.config.cullingMargin;

    // Calculate viewport bounds with margin
    const minX = this.viewport.x - margin;
    const maxX = this.viewport.x + this.viewport.width + margin;
    const minY = this.viewport.y - margin;
    const maxY = this.viewport.y + this.viewport.height + margin;

    for (const node of allNodes) {
      // Check if node is within viewport bounds
      if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
        visible.add(node.id);
      }
      // Always render important nodes even if outside viewport
      else if (importance && importance(node.id) > 0.8) {
        visible.add(node.id);
      }
    }

    this.visibleNodes = visible;
    return visible;
  }

  /**
   * Cull edges - only show edges between visible nodes
   */
  cullEdges(
    allEdges: Array<{ id: string; source: string | any; target: string | any }>,
    visibleNodes: Set<string>
  ): Set<string> {
    const visible = new Set<string>();

    for (const edge of allEdges) {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

      // Show edge if both nodes are visible
      if (visibleNodes.has(sourceId) && visibleNodes.has(targetId)) {
        visible.add(edge.id);
      }
    }

    this.visibleEdges = visible;
    return visible;
  }

  /**
   * Get visible nodes
   */
  getVisibleNodes(): Set<string> {
    return this.visibleNodes;
  }

  /**
   * Get visible edges
   */
  getVisibleEdges(): Set<string> {
    return this.visibleEdges;
  }

  /**
   * Check if node is visible
   */
  isNodeVisible(nodeId: string): boolean {
    return this.visibleNodes.has(nodeId);
  }

  /**
   * Check if edge is visible
   */
  isEdgeVisible(edgeId: string): boolean {
    return this.visibleEdges.has(edgeId);
  }

  /**
   * Get culling statistics
   */
  getStats(): {
    totalNodes: number;
    visibleNodes: number;
    culledNodes: number;
    totalEdges: number;
    visibleEdges: number;
    culledEdges: number;
    cullingRatio: number;
  } {
    return {
      totalNodes: 0, // Would be set by caller
      visibleNodes: this.visibleNodes.size,
      culledNodes: 0, // Calculated by caller
      totalEdges: 0,
      visibleEdges: this.visibleEdges.size,
      culledEdges: 0,
      cullingRatio: 0,
    };
  }
}

/**
 * Progressive rendering queue - render nodes in batches
 */
export class RenderQueue {
  private queue: Array<{
    type: 'node' | 'edge';
    id: string;
    priority: number;
    data: any;
  }> = [];
  private isRendering = false;
  private batchSize: number;
  private onBatch: ((items: any[]) => void) | null = null;

  constructor(batchSize: number = 50) {
    this.batchSize = batchSize;
  }

  /**
   * Add item to render queue
   */
  enqueue(type: 'node' | 'edge', id: string, data: any, priority: number = 0): void {
    const item = { type, id, priority, data };

    // Insert in priority order
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (priority > this.queue[i].priority) {
        this.queue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(item);
    }
  }

  /**
   * Process queue in batches
   */
  async process(onBatch: (items: any[]) => void): Promise<void> {
    if (this.isRendering) return;

    this.isRendering = true;
    this.onBatch = onBatch;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      onBatch(batch);

      // Yield to browser for other tasks
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    this.isRendering = false;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if currently rendering
   */
  isProcessing(): boolean {
    return this.isRendering;
  }
}

/**
 * Canvas rendering context with virtual rendering support
 */
export class VirtualCanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private virtualRenderer: VirtualRenderer;
  private renderQueue: RenderQueue;
  private pixelRatio: number = window.devicePixelRatio || 1;

  constructor(canvas: HTMLCanvasElement | null, config?: Partial<VirtualRenderingConfig>) {
    this.canvas = canvas;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.setupCanvas();
    }
    this.virtualRenderer = new VirtualRenderer(config);
    this.renderQueue = new RenderQueue(config?.batchSize || 50);
  }

  /**
   * Setup canvas with proper DPI
   */
  private setupCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.pixelRatio;
    this.canvas.height = rect.height * this.pixelRatio;

    this.ctx.scale(this.pixelRatio, this.pixelRatio);
  }

  /**
   * Clear canvas
   */
  clear(): void {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Get virtual renderer
   */
  getVirtualRenderer(): VirtualRenderer {
    return this.virtualRenderer;
  }

  /**
   * Get render queue
   */
  getRenderQueue(): RenderQueue {
    return this.renderQueue;
  }

  /**
   * Draw circle optimized
   */
  drawCircle(x: number, y: number, radius: number, fillStyle: string, strokeStyle?: string): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = fillStyle;
    this.ctx.fill();

    if (strokeStyle) {
      this.ctx.strokeStyle = strokeStyle;
      this.ctx.stroke();
    }
  }

  /**
   * Draw line optimized
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, strokeStyle: string, width: number = 1): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }

  /**
   * Draw text optimized
   */
  drawText(text: string, x: number, y: number, font: string, fillStyle: string, align: string = 'center'): void {
    if (!this.ctx) return;

    this.ctx.font = font;
    this.ctx.fillStyle = fillStyle;
    this.ctx.textAlign = align as CanvasTextAlign;
    this.ctx.fillText(text, x, y);
  }
}

/**
 * Intersection detector for efficient hover/click detection
 */
export class IntersectionDetector {
  private nodeMap: Map<string, { x: number; y: number; radius: number }> = new Map();

  /**
   * Register node hitbox
   */
  registerNode(nodeId: string, x: number, y: number, radius: number): void {
    this.nodeMap.set(nodeId, { x, y, radius });
  }

  /**
   * Find node at point
   */
  getNodeAt(x: number, y: number, searchRadius: number = 10): string | null {
    let closest: string | null = null;
    let closestDist = searchRadius;

    for (const [nodeId, node] of this.nodeMap) {
      const dx = x - node.x;
      const dy = y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= node.radius + searchRadius && dist < closestDist) {
        closest = nodeId;
        closestDist = dist;
      }
    }

    return closest;
  }

  /**
   * Get nodes in rect
   */
  getNodesInRect(x: number, y: number, width: number, height: number): string[] {
    const nodes: string[] = [];

    for (const [nodeId, node] of this.nodeMap) {
      if (
        node.x - node.radius < x + width &&
        node.x + node.radius > x &&
        node.y - node.radius < y + height &&
        node.y + node.radius > y
      ) {
        nodes.push(nodeId);
      }
    }

    return nodes;
  }

  /**
   * Clear hitboxes
   */
  clear(): void {
    this.nodeMap.clear();
  }
}
