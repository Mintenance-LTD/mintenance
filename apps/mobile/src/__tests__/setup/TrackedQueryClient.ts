import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

const clients = new Set<QueryClient>();

/** Real query behavior with explicit ownership of test-created caches. */
export class TrackedQueryClient extends QueryClient {
  constructor(config?: QueryClientConfig) {
    super(config);
    clients.add(this);
  }
}

afterEach(() => {
  for (const client of clients) client.clear();
});

afterAll(() => {
  // Also catch GC timers scheduled by component unmount cleanup.
  for (const client of clients) client.clear();
  clients.clear();
});
