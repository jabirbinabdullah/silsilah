/**
 * Performance monitoring for render optimization
 */

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  frameTime: number;
  nodeCount: number;
  edgeCount: number;
  memoryUsage: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastFpsCheck = performance.now();
  private fps = 60;
  private frameTimings: number[] = [];
  private maxTimings = 30; // Keep last 30 frames
  private isMonitoring = false;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistory = 100;
  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set();

  private lastFrameTime = 0;
  private frameStartTime = 0;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start frame timing
   */
  startFrame(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * End frame timing
   */
  endFrame(nodeCount: number, edgeCount: number): void {
    const frameTime = performance.now() - this.frameStartTime;
    this.frameTimings.push(frameTime);

    if (this.frameTimings.length > this.maxTimings) {
      this.frameTimings.shift();
    }

    this.lastFrameTime = frameTime;
    this.updateFPS();

    // Record metrics every 30 frames
    if (this.frameCount % 30 === 0) {
      this.recordMetrics(nodeCount, edgeCount);
    }

    this.frameCount++;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Get average frame time in ms
   */
  getAverageFrameTime(): number {
    if (this.frameTimings.length === 0) return 0;
    const sum = this.frameTimings.reduce((a, b) => a + b, 0);
    return sum / this.frameTimings.length;
  }

  /**
   * Get max frame time (jank detection)
   */
  getMaxFrameTime(): number {
    if (this.frameTimings.length === 0) return 0;
    return Math.max(...this.frameTimings);
  }

  /**
   * Get performance grade
   */
  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgFrameTime = this.getAverageFrameTime();
    const maxFrameTime = this.getMaxFrameTime();

    if (this.fps >= 55 && avgFrameTime < 20 && maxFrameTime < 50) {
      return 'excellent';
    }
    if (this.fps >= 45 && avgFrameTime < 30 && maxFrameTime < 100) {
      return 'good';
    }
    if (this.fps >= 30 && avgFrameTime < 50 && maxFrameTime < 200) {
      return 'fair';
    }
    return 'poor';
  }

  /**
   * Get metrics history
   */
  getHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Subscribe to metrics updates
   */
  onMetrics(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get recommendations for optimization
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const grade = this.getPerformanceGrade();
    const avgFrameTime = this.getAverageFrameTime();
    const fps = this.fps;

    if (grade === 'poor' || grade === 'fair') {
      recommendations.push('Consider enabling LOD (Level of Detail) rendering');
    }

    if (avgFrameTime > 40) {
      recommendations.push('Reduce rendered node count or enable virtual scrolling');
    }

    if (fps < 30) {
      recommendations.push('Increase web worker utilization for layout computation');
    }

    if (this.getMaxFrameTime() > 100) {
      recommendations.push('Optimize search and filter operations with debouncing');
    }

    const memory = this.getMemoryUsage();
    if (memory && memory.percentage > 80) {
      recommendations.push('Memory usage is high - consider clearing caches');
    }

    if (this.frameTimings.length > 0) {
      const jankFrames = this.frameTimings.filter(t => t > 50).length;
      const jankPercent = (jankFrames / this.frameTimings.length) * 100;
      if (jankPercent > 10) {
        recommendations.push('High frame time variance detected - consider profiling');
      }
    }

    return recommendations;
  }

  /**
   * Get memory usage if available
   */
  getMemoryUsage(): { used: number; limit: number; percentage: number } | null {
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        limit: mem.jsHeapSizeLimit,
        percentage: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }

  /**
   * Reset monitoring
   */
  reset(): void {
    this.frameCount = 0;
    this.frameTimings = [];
    this.metricsHistory = [];
    this.fps = 60;
  }

  /**
   * Destroy monitor
   */
  destroy(): void {
    this.stopMonitoring();
  }

  // Private methods

  private updateFPS(): void {
    const now = performance.now();
    const elapsed = now - this.lastFpsCheck;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsCheck = now;
    }
  }

  private recordMetrics(nodeCount: number, edgeCount: number): void {
    const memory = this.getMemoryUsage();
    const metrics: PerformanceMetrics = {
      fps: this.fps,
      renderTime: this.lastFrameTime,
      frameTime: this.getAverageFrameTime(),
      nodeCount,
      edgeCount,
      memoryUsage: memory?.used || 0,
      timestamp: Date.now(),
    };

    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistory) {
      this.metricsHistory.shift();
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(metrics);
    }
  }

  private startMonitoring(): void {
    this.isMonitoring = true;
  }

  private stopMonitoring(): void {
    this.isMonitoring = false;
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

export function getGlobalMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

export function destroyGlobalMonitor(): void {
  if (globalMonitor) {
    globalMonitor.destroy();
    globalMonitor = null;
  }
}

/**
 * Hook for React component monitoring
 */
export function usePerformanceMonitor(
  onMetrics?: (metrics: PerformanceMetrics) => void
): { monitor: PerformanceMonitor; grade: 'excellent' | 'good' | 'fair' | 'poor' } {
  const monitor = getGlobalMonitor();

  if (onMetrics) {
    monitor.onMetrics(onMetrics);
  }

  return {
    monitor,
    grade: monitor.getPerformanceGrade(),
  };
}

/**
 * Create a scoped performance timer
 */
export class ScopedTimer {
  private name: string;
  private startTime: number;
  private isLong: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  /**
   * Mark operation as complete
   */
  end(): number {
    const duration = performance.now() - this.startTime;
    this.logIfSlow(duration);
    return duration;
  }

  /**
   * Get current elapsed time
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Mark as potentially long operation
   */
  markLong(): void {
    this.isLong = true;
  }

  private logIfSlow(duration: number): void {
    const threshold = this.isLong ? 100 : 16.67; // Frame time or long op

    if (duration > threshold) {
      console.warn(`[PERF] ${this.name}: ${duration.toFixed(2)}ms (slow)`);
    }
  }
}

/**
 * Collection of common performance issues
 */
export class PerformanceDiagnostics {
  static checkNodeRenderCount(nodeCount: number): string[] {
    const issues: string[] = [];

    if (nodeCount > 5000) {
      issues.push(`Very high node count (${nodeCount}): Consider enabling virtual rendering`);
    }
    if (nodeCount > 2000) {
      issues.push(`High node count (${nodeCount}): Enable LOD rendering for better performance`);
    }

    return issues;
  }

  static checkMemoryUsage(monitor: PerformanceMonitor): string[] {
    const issues: string[] = [];
    const memory = monitor.getMemoryUsage();

    if (memory) {
      if (memory.percentage > 90) {
        issues.push('Critical memory usage - potential memory leak or too many objects');
      }
      if (memory.percentage > 75) {
        issues.push('High memory usage - consider clearing caches or reducing data');
      }
    }

    return issues;
  }

  static checkFrameTime(monitor: PerformanceMonitor): string[] {
    const issues: string[] = [];
    const avgFrameTime = monitor.getAverageFrameTime();
    const maxFrameTime = monitor.getMaxFrameTime();

    if (maxFrameTime > 200) {
      issues.push('Janky rendering detected (frame drops > 200ms)');
    }
    if (avgFrameTime > 50) {
      issues.push('Average frame time is high - optimize rendering or logic');
    }

    return issues;
  }

  static diagnose(monitor: PerformanceMonitor, nodeCount: number): string[] {
    const issues: string[] = [];

    issues.push(...this.checkNodeRenderCount(nodeCount));
    issues.push(...this.checkMemoryUsage(monitor));
    issues.push(...this.checkFrameTime(monitor));

    return issues;
  }
}
