import {
  parsePropertyView,
  propertyViewKey,
  type PropertyView,
} from './property-presentation';

type Snapshot = { view: PropertyView; ready: boolean; saved: boolean };
const initial: Snapshot = { view: 'home', ready: false, saved: true };
/** Account-scoped, presentation-only storage. Late reads cannot replace a user's selection. */
export function createPropertyViewStore(storage: {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
}) {
  const states = new Map<string, Snapshot>();
  const reads = new Set<string>();
  const writes = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    snapshot(id?: string) {
      return id ? (states.get(id) ?? initial) : initial;
    },
    serverSnapshot() {
      return initial;
    },
    async load(id: string) {
      if (reads.has(id)) return;
      reads.add(id);
      const before = states.get(id);
      try {
        const stored = await storage.get(propertyViewKey(id));
        if (states.get(id) === before)
          states.set(id, {
            view: parsePropertyView(stored),
            ready: true,
            saved: true,
          });
      } catch {
        if (states.get(id) === before)
          states.set(id, { view: 'home', ready: true, saved: false });
      }
      emit();
    },
    set(id: string, view: PropertyView) {
      const next: Snapshot = {
        view: parsePropertyView(view),
        ready: true,
        saved: true,
      };
      states.set(id, next);
      emit();
      // Serialize writes so quick taps cannot persist an older choice last.
      const write = (writes.get(id) ?? Promise.resolve())
        .then(() => storage.set(propertyViewKey(id), next.view))
        .catch(() => {
          if (states.get(id) === next) {
            states.set(id, { ...next, saved: false });
            emit();
          }
        });
      writes.set(id, write);
      return write;
    },
  };
}
