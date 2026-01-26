import { ApiMiddleware } from '../ApiMiddleware';

describe('ApiMiddleware', () => {
  it('creates an instance', () => {
    const service = new ApiMiddleware();
    expect(service).toBeDefined();
  });
});
