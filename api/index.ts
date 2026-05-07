import { app, initSurreal, setupDatabase } from '../app';

// Vercel serverless function entry point
// We need to ensure DB is initialized
// But usually serverless functions are cold-started, 
// so we might need a top-level await if supported or a middleware.
// app.ts already has a middleware to check !db and call initSurreal().

export default app;
