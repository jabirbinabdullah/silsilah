/**
 * Test Utilities for TreeCanvas Performance Testing
 * Provides helpers for generating large test datasets and measuring performance
 */

import { TreeRenderV1, RenderNode, RenderEdgeData } from '../api';
import { getPerformanceMonitor } from './performanceMetrics';

export interface TreeGenerationOptions {
  nodeCount: number;
  treeDepth?: number;
  childrenPerNode?: number;
  spouseRatio?: number; // Percentage of nodes with spouses (0-1)
}

export interface PerformanceTestResult {
  nodeCount: number;
  renderTime: number;
  peakMemory?: number;
  averageFPS: number;
  droppedFrames: number;
  totalFrames: number;
}

/**
 * Generate a synthetic family tree for performance testing
 */
export function generateTestTree(options: TreeGenerationOptions): TreeRenderV1 {
  const {
    nodeCount = 100,
    treeDepth = 5,
    childrenPerNode = 2,
    spouseRatio = 0.7,
  } = options;

  const nodes: RenderNode[] = [];
  const edges: RenderEdgeData[] = [];
  const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const firstNames = ['John', 'Mary', 'James', 'Patricia', 'Robert', 'Linda', 'Michael', 'Barbara'];

  // Track nodes by generation level
  const nodesByLevel = new Map<number, string[]>();
  let nodeId = 0;

  // Helper to generate random name
  const generateName = (): string => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    return `${firstName} ${surname}`;
  };

  // Helper to add a node
  const addNode = (level: number, parentId?: string): string => {
    const id = `node-${nodeId++}`;
    const displayName = generateName();

    nodes.push({
      id,
      displayName,
    });

    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(id);

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'parent-child',
      });
    }

    return id;
  };

  // Generate root node
  const rootId = addNode(0);

  // Generate nodes level by level
  let currentNodeCount = 1;
  for (let level = 0; level < treeDepth && currentNodeCount < nodeCount; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    
    for (const parentId of nodesAtLevel) {
      if (currentNodeCount >= nodeCount) break;

      // Add children
      const childCount = Math.min(
        childrenPerNode,
        nodeCount - currentNodeCount
      );

      for (let i = 0; i < childCount && currentNodeCount < nodeCount; i++) {
        const childId = addNode(level + 1, parentId);
        currentNodeCount++;

        // Randomly add spouse
        if (Math.random() < spouseRatio && currentNodeCount < nodeCount) {
          const spouseId = addNode(level + 1);
          currentNodeCount++;

          edges.push({
            id: `edge-spouse-${childId}-${spouseId}`,
            source: childId,
            target: spouseId,
            type: 'spouse',
          });
        }
      }
    }
  }

  return {
    nodes,
    edges,
    version: 'v1',
    treeId: `test-tree-${nodeCount}`,
  };
}

/**
 * Run a performance test for TreeCanvas rendering
 */
export async function runPerformanceTest(
  renderFn: (data: TreeRenderV1) => Promise<void>,
  options: TreeGenerationOptions
): Promise<PerformanceTestResult> {
  const monitor = getPerformanceMonitor();
  
  // Clear previous measurements
  monitor.clear();
  monitor.startMonitoring();

  try {
    // Generate test data
    const testData = generateTestTree(options);
    console.log(`Generated test tree with ${testData.nodes.length} nodes and ${testData.edges.length} edges`);

    // Measure render time
    const startTime = performance.now();
    await renderFn(testData);
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Wait for monitoring data
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get stats
    const stats = monitor.getStats();
    const peakMemory = (performance as any).memory?.usedJSHeapSize;

    return {
      nodeCount: testData.nodes.length,
      renderTime,
      peakMemory,
      averageFPS: stats.averageFPS,
      droppedFrames: stats.droppedFrames,
      totalFrames: stats.totalFrames,
    };
  } finally {
    monitor.stopMonitoring();
  }
}

/**
 * Run multiple performance tests at different scales
 */
export async function runScaledPerformanceTests(
  renderFn: (data: TreeRenderV1) => Promise<void>,
  nodeCounts: number[] = [100, 500, 1000, 2000]
): Promise<PerformanceTestResult[]> {
  const results: PerformanceTestResult[] = [];

  for (const nodeCount of nodeCounts) {
    console.log(`\n📊 Testing with ${nodeCount} nodes...`);
    
    try {
      const result = await runPerformanceTest(renderFn, {
        nodeCount,
        treeDepth: 5,
        childrenPerNode: 2,
        spouseRatio: 0.7,
      });

      results.push(result);

      console.log(`  ✓ Render Time: ${result.renderTime.toFixed(0)}ms`);
      console.log(`  ✓ Average FPS: ${result.averageFPS.toFixed(1)}`);
      console.log(`  ✓ Dropped Frames: ${result.droppedFrames}/${result.totalFrames}`);
      if (result.peakMemory) {
        console.log(`  ✓ Peak Memory: ${(result.peakMemory / 1024 / 1024).toFixed(1)}MB`);
      }
    } catch (error) {
      console.error(`  ✗ Test failed:`, error);
    }
  }

  return results;
}

/**
 * Generate performance report table
 */
export function generatePerformanceReport(results: PerformanceTestResult[]): string {
  let report = '\n📈 Performance Test Results:\n';
  report += '│ Nodes │ Render (ms) │ FPS │ Dropped │ Memory (MB) │\n';
  report += '├───────┼─────────────┼─────┼─────────┼─────────────┤\n';

  for (const result of results) {
    const memory = result.peakMemory ? (result.peakMemory / 1024 / 1024).toFixed(1) : 'N/A';
    const dropRate = result.totalFrames > 0 
      ? `${((result.droppedFrames / result.totalFrames) * 100).toFixed(1)}%`
      : 'N/A';

    report += `│ ${String(result.nodeCount).padEnd(5)} │ ${String(result.renderTime.toFixed(0)).padEnd(11)} │ ${String(result.averageFPS.toFixed(1)).padEnd(4)} │ ${dropRate.padEnd(7)} │ ${String(memory).padEnd(11)} │\n`;
  }

  return report;
}

/**
 * Benchmark debounce implementations
 */
export function benchmarkDebounce() {
  const iterations = 10000;
  const { debounce, rafDebounce, throttle } = require('./debounce');

  console.group('🔧 Debounce Implementation Benchmarks');

  // Test debounce
  let debounceCount = 0;
  const debouncedFn = debounce(() => debounceCount++, 50);

  const debounceStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    debouncedFn();
  }
  const debounceTime = performance.now() - debounceStart;
  console.log(`debounce (${iterations} calls): ${debounceTime.toFixed(2)}ms`);

  // Test throttle
  let throttleCount = 0;
  const throttledFn = throttle(() => throttleCount++, 50);

  const throttleStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    throttledFn();
  }
  const throttleTime = performance.now() - throttleStart;
  console.log(`throttle (${iterations} calls): ${throttleTime.toFixed(2)}ms`);

  // Test rafDebounce
  let rafCount = 0;
  const rafFn = rafDebounce(() => rafCount++);

  const rafStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    rafFn();
  }
  const rafTime = performance.now() - rafStart;
  console.log(`rafDebounce (${iterations} calls): ${rafTime.toFixed(2)}ms`);

  console.groupEnd();
}

/**
 * Compare performance before and after optimization
 */
export function comparePerformance(
  before: PerformanceTestResult,
  after: PerformanceTestResult
) {
  console.group('📊 Performance Improvement');
  
  const renderImprovement = ((before.renderTime - after.renderTime) / before.renderTime * 100).toFixed(1);
  const fpsImprovement = ((after.averageFPS - before.averageFPS) / before.averageFPS * 100).toFixed(1);
  const dropImprovement = ((before.droppedFrames - after.droppedFrames) / before.droppedFrames * 100).toFixed(1);

  console.log(`Render Time: ${before.renderTime.toFixed(0)}ms → ${after.renderTime.toFixed(0)}ms (${renderImprovement}% faster)`);
  console.log(`Average FPS: ${before.averageFPS.toFixed(1)} → ${after.averageFPS.toFixed(1)} (${fpsImprovement}% improvement)`);
  console.log(`Dropped Frames: ${before.droppedFrames} → ${after.droppedFrames} (${dropImprovement}% fewer drops)`);

  console.groupEnd();
}

export default {
  generateTestTree,
  runPerformanceTest,
  runScaledPerformanceTests,
  generatePerformanceReport,
  benchmarkDebounce,
  comparePerformance,
};
