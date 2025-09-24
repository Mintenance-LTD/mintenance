/**
 * Mock ML Memory Manager
 * Provides test-safe implementation without TensorFlow dependency
 */

export interface MLMemoryTracker {
  component: string;
  tensors: any[];
  intervals: NodeJS.Timeout[];
  timeouts: NodeJS.Timeout[];
  eventListeners: Array<{
    element: any;
    event: string;
    handler: Function;
  }>;
  models: Map<string, any>;
  startTime: number;
  memoryUsage: number;
}

export class MLMemoryManager {
  private static instance: MLMemoryManager;
  private trackers: Map<string, MLMemoryTracker> = new Map();

  static getInstance(): MLMemoryManager {
    if (!MLMemoryManager.instance) {
      MLMemoryManager.instance = new MLMemoryManager();
    }
    return MLMemoryManager.instance;
  }

  startTracking(componentId: string, component: string): MLMemoryTracker {
    const tracker: MLMemoryTracker = {
      component,
      tensors: [],
      intervals: [],
      timeouts: [],
      eventListeners: [],
      models: new Map(),
      startTime: Date.now(),
      memoryUsage: 0,
    };

    this.trackers.set(componentId, tracker);
    return tracker;
  }

  stopTracking(componentId: string): boolean {
    const tracker = this.trackers.get(componentId);
    if (!tracker) return false;

    // Cleanup intervals and timeouts
    tracker.intervals.forEach(clearInterval);
    tracker.timeouts.forEach(clearTimeout);

    // Remove event listeners
    tracker.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });

    this.trackers.delete(componentId);
    return true;
  }

  getMemoryStats(): {
    totalTensors: number;
    totalModels: number;
    totalMemoryUsage: number;
    activeTrackers: number;
  } {
    let totalTensors = 0;
    let totalModels = 0;
    let totalMemoryUsage = 0;

    for (const tracker of this.trackers.values()) {
      totalTensors += tracker.tensors.length;
      totalModels += tracker.models.size;
      totalMemoryUsage += tracker.memoryUsage;
    }

    return {
      totalTensors,
      totalModels,
      totalMemoryUsage,
      activeTrackers: this.trackers.size,
    };
  }

  cleanup(): void {
    for (const componentId of this.trackers.keys()) {
      this.stopTracking(componentId);
    }
  }
}

// Export singleton instance
export const mlMemoryManager = MLMemoryManager.getInstance();