import { createServer, type Server } from 'node:http';
import { test, expect } from './fixtures';

test.describe('Disposable CI client isolation', () => {
  test.describe.configure({ mode: 'serial' });
  let server: Server;
  let origin: string;
  const budgets = new Map<string, number>();

  test.beforeAll(async () => {
    test.skip(
      !process.env.CI,
      'Client-IP injection only runs in disposable CI.'
    );
    server = createServer((request, response) => {
      if (request.url !== '/check') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<main>Synthetic local rate limit fixture</main>');
        return;
      }
      const ip = String(request.headers['x-vercel-forwarded-for'] ?? '');
      const used = (budgets.get(ip) ?? 0) + 1;
      budgets.set(ip, used);
      response.writeHead(used <= 2 ? 200 : 429, {
        'Content-Type': 'application/json',
      });
      response.end(JSON.stringify({ ip }));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing fixture port');
    origin = `http://127.0.0.1:${address.port}`;
  });
  test.afterAll(async () => {
    if (server)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
  });

  for (const client of ['first', 'second']) {
    test(`${client} test has its own budget shared by browser and request API`, async ({
      page,
    }) => {
      await page.goto(origin);
      const browserResult = await page.evaluate(async () => {
        const response = await fetch('/check');
        return { status: response.status, ...(await response.json()) };
      });
      expect(browserResult.status).toBe(200);
      expect(browserResult.ip).toMatch(/^2001:db8:/);
      const requestResult = await page.request.get(`${origin}/check`);
      expect(requestResult.status()).toBe(200);
      expect((await requestResult.json()).ip).toBe(browserResult.ip);
      expect((await page.request.get(`${origin}/check`)).status()).toBe(429);
    });
  }
});
