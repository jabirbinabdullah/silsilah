/**
 * Performance Metrics Tracking Module
 * Tracks FPS, frame time, rendering performance, and identifies bottlenecks
 */

export interface FrameMetrics {
  timestamp: number;
  frameTime: number;
  fps: number;
  memoryUsage?: number;
}

export interface OperationMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  eventCount?: number;
  averageTime?: number;
}

export interface PerformanceStats {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  averageFrameTime: number;
  droppedFrames: number;
  totalFrames: number;
  operations: Map<string, OperationMetrics>;
}

class PerformanceMonitor {
  private frameMetrics: FrameMetrics[] = [];
  private operationMetrics: Map<string, OperationMetrics> = new Map();
  private lastFrameTime = performance.now();
  private animationFrameId: number | null = null;
  private maxFrameHistory = 300; // Keep last 5 seconds at 60fps
  private fpsThreshold = 30; // Consider <30fps as dropped frame
  private enabled = true;

  /**
   * Start monitoring frames
   */
  startMonitoring() {
    if (this.animationFrameId !== null) return;

    const measureFrame = () => {
      if (!this.enabled) {
        this.animationFrameId = requestAnimationFrame(measureFrame);
        return;
      }

      const now = performance.now();
      const frameTime = now - this.lastFrameTime;
      const fps = frameTime > 0 ? 1000 / frameTime : 0;

      this.frameMetrics.push({
        timestamp: now,
        frameTime,
        fps,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
      });

      // Keep only recent frames
      if (this.frameMetrics.length > this.maxFrameHistory) {
        this.frameMetrics.shift();
      }

      this.lastFrameTime = now;
      this.animationFrameId = requestAnimationFrame(measureFrame);
    };

    this.animationFrameId = requestAnimationFrame(measureFrame);
  }

  /**
   * Stop monitoring frames
   */
  stopMonitoring() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Start tracking an operation
   */
  startOperation(name: string): string {
    const operationId = `${name}-${Date.now()}-${Math.random()}`;
    this.operationMetrics.set(operationId, {
      name,
      startTime: performance.now(),
    });
    return operationId;
  }

  /**
   * End tracking an operation
   */
  endOperation(operationId: string): number {
    const operation = this.operationMetrics.get(operationId);
    if (!operation) {
      console.warn(`Operation ${operationId} not found`);
      return 0;
    }

    operation.endTime = performance.now();
    operation.duration = operation.endTime - operation.startTime;
    return operation.duration;
  }

  /**
   * Record an event for an operation
   */
  recordEvent(operationId: string) {
    const operation = this.operationMetrics.get(operationId);
    if (operation) {
      operation.eventCount = (operation.eventCount || 0) + 1;
    }
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    if (this.frameMetrics.length === 0) return 0;
    return this.frameMetrics[this.frameMetrics.length - 1].fps;
  }

  /**
   * Get average FPS over the measurement period
   */
  getAverageFPS(): number {
    if (this.frameMetrics.length === 0) return 0;
    const totalFPS = this.frameMetrics.reduce((sum, m) => sum + m.fps, 0);
    return totalFPS / this.frameMetrics.length;
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const fpsList = this.frameMetrics.map(m => m.fps);
    const droppedFrames = fpsList.filter(fps => fps < this.fpsThreshold).length;

    return {
      averageFPS: this.getAverageFPS(),
      minFPS: Math.min(...fpsList, Infinity),
      maxFPS: Math.max(...fpsList, -Infinity),
      averageFrameTime: this.frameMetrics.length > 0
        ? this.frameMetrics.reduce((sum, m) => sum + m.frameTime, 0) / this.frameMetrics.length
        : 0,
      droppedFrames,
      totalFrames: this.frameMetrics.length,
      operations: new Map(this.operationMetrics),
    };
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(name: string): OperationMetrics | undefined {
    // Find latest operation with this name
    let latest: OperationMetrics | undefined;
    this.operationMetrics.forEach(op => {
      if (op.name === name && (!latest || op.startTime > latest.startTime)) {
        latest = op;
      }
    });
    return latest;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.frameMetrics = [];
    this.operationMetrics.clear();
    this.lastFrameTime = performance.now();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Log performance report
   */
  logReport() {
    const stats = this.getStats();
    console.group('🎯 Performance Report');
    console.log(`Average FPS: ${stats.averageFPS.toFixed(1)} (${stats.minFPS.toFixed(1)}-${stats.maxFPS.toFixed(1)})`);
    console.log(`Average Frame Time: ${stats.averageFrameTime.toFixed(2)}ms`);
    console.log(`Dropped Frames: ${stats.droppedFrames}/${stats.totalFrames}`);
    console.log(`Drop Rate: ${((stats.droppedFrames / stats.totalFrames) * 100).toFixed(1)}%`);
    
    if (stats.operations.size > 0) {
      console.group('Operations');
      stats.operations.forEach((op, id) => {
        if (op.duration) {
          console.log(`${op.name}: ${op.duration.toFixed(2)}ms${op.eventCount ? ` (${op.eventCount} events)` : ''}`);
        }
      });
      console.groupEnd();
    }
    console.groupEnd();
  }
}

// Global instance
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Performance measurement hook
 */
export function measurePerformance<T>(
  fn: () => T,
  label?: string
): T {
  const monitor = getPerformanceMonitor();
  const operationId = monitor.startOperation(label || 'measurement');
  try {
    return fn();
  } finally {
    monitor.endOperation(operationId);
  }
}

/**
 * Async performance measurement
 */
export async function measurePerformanceAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const operationId = monitor.startOperation(label || 'async-measurement');
  try {
    return await fn();
  } finally {
    monitor.endOperation(operationId);
  }
}

export default getPerformanceMonitor;
