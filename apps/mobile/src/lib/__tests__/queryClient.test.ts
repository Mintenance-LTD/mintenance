import { queryClient } from '../queryClient';

describe('queryClient', () => {
  it('exports a query client instance', () => {
    expect(queryClient).toBeDefined();
  });
});
