import { initSurreal, setupDatabase } from "../api/[...].ts";

// @ts-ignore
export default defineNitroPlugin(async (nitroApp) => {
  // Database will be initialized lazily via middleware in server/api/[...].ts
  // This avoids overhead during cold starts in serverless environments.
  if (process.env.AUTOMIGRATE === 'true') {
     console.log("[Nitro Plugin] Eagerly initializing for migrations...");
     try {
       await initSurreal();
       await setupDatabase();
     } catch (err) {
       console.error("[Nitro Plugin] Migration/Setup Failed:", err);
     }
  }
});
