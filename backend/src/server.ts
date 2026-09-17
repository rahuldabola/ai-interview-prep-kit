import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDb } from "./db/connection.js";
import { env } from "./config/env.js";
import { recoverOrphanedGenerations } from "./services/generationService.js";

async function main() {
  await connectDb();

  // Nothing in flight can have survived the previous process, so any kit still marked
  // "generating" is orphaned. Resolve those before serving traffic, otherwise their owners
  // poll a spinner that never finishes.
  await recoverOrphanedGenerations().catch((err) => {
    console.error("Orphaned-generation recovery failed (continuing to boot):", err);
  });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Render sends SIGTERM before replacing an instance. Draining in-flight requests and
  // closing the Mongo connection cleanly avoids both dropped responses mid-deploy and a
  // pile of abandoned connections on the free-tier Atlas cluster.
  let shuttingDown = false;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} received — shutting down gracefully.`);
      server.close(() => {
        void mongoose.connection.close(false).finally(() => process.exit(0));
      });
      // A hung keep-alive connection must not hold the deploy open indefinitely.
      setTimeout(() => process.exit(0), 10_000).unref();
    });
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
