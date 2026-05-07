import { app, initSurreal, setupDatabase } from './app';

const PORT = 3000;

async function start() {
  await initSurreal();
  await setupDatabase();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
