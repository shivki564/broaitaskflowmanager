import app, { initializeServer } from "../server/server.js";

let initializationPromise: Promise<void> | null = null;

function ensureInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeServer();
  }

  return initializationPromise;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);

    return res.status(500).json({
      error: "Server initialization failed",
    });
  }
}