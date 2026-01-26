export interface ContextFlow {
  keys: number[];
  values: number[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
