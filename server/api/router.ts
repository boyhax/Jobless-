import { Hono } from 'hono';

export const apiRouter = new Hono();

apiRouter.get('/', (c) => {
  return c.json({ status: 'ok' });
});

apiRouter.get('/health', (c) => {
  return c.json({ status: 'ok' });
});
