import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleAuthorizeNetWebhook } from "../authorizenetWebhook";
import { handleCloverWebhook } from "../cloverCheckout";
import { handleScheduledCloverSync } from "../scheduledCloverSync";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Authorize.net webhook — also needs raw body for HMAC-SHA512 signature verification
  app.post(
    "/api/authorizenet/webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      handleAuthorizeNetWebhook(req, res);
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Clover Hosted Checkout webhook — fires after customer completes payment on Clover's page
  // Registered AFTER json middleware so req.body is already parsed
  app.post("/api/clover/webhook", (req, res) => {
    handleCloverWebhook(req.body)
      .then(() => res.json({ received: true }))
      .catch((err) => {
        console.error("[CloverWebhook] Error:", err);
        res.status(500).json({ error: "Webhook processing failed" });
      });
  });

  // Scheduled Clover item sync — called by Manus heartbeat cron daily at 2 AM Las Vegas time
  app.post("/api/scheduled/clover-sync", (req, res) => {
    handleScheduledCloverSync(req, res).catch((err) => {
      console.error("[ScheduledCloverSync] Unhandled error:", err);
      res.status(500).json({ error: String(err) });
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
