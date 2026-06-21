import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAdminLoginRoutes } from "./adminLogin";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleAuthorizeNetWebhook } from "../authorizenetWebhook";
import { handleCloverWebhook } from "../cloverCheckout";
import { handleScheduledCloverSync } from "../scheduledCloverSync";
import { handleTwilioSmsWebhook } from "../twilioSmsWebhook";
import { handleEvaInteractionWebhook, handleEvaKnowledgeFetch } from "../evaInteractions";

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

  // Clover webhook verification — Clover sends GET with verificationCode query param
  app.get("/api/clover/webhook", (req, res) => {
    const code = req.query.verificationCode as string | undefined;
    console.log(`[CloverWebhook] Verification GET received, code: ${code ?? "none"}`);
    if (code) {
      res.status(200).send(code);
    } else {
      res.status(200).send("ok");
    }
  });

  // Clover Hosted Checkout webhook — fires after customer completes payment on Clover's page
  // Also handles verification: Clover sends POST with { verificationCode } before real events
  // Registered AFTER json middleware so req.body is already parsed
  app.post("/api/clover/webhook", (req, res) => {
    // Clover verification: POST body contains { verificationCode: "..." }
    const body = req.body as Record<string, unknown>;
    if (body?.verificationCode && typeof body.verificationCode === "string") {
      console.log(`[CloverWebhook] Verification POST received, code: ${body.verificationCode}`);
      res.status(200).send(body.verificationCode);
      return;
    }
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

  // Twilio inbound SMS webhook — Eva AI responds to customer texts
  // Twilio sends: From, To, Body, MessageSid, etc. as form-encoded POST
  app.post("/api/twilio/sms", (req, res) => {
    handleTwilioSmsWebhook(req, res).catch((err) => {
      console.error("[TwilioSMS] Unhandled error:", err);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Hi! I'm Eva from Napoli Pizzeria. Please call us at 725-204-0379 for help. 🍕</Message>
</Response>`);
    });
  });


  // Eva AI interaction log — called by eva-napoli VPS after each call/SMS
  app.post("/api/eva/interaction", (req, res) => {
    handleEvaInteractionWebhook(req, res).catch((err) => {
      console.error("[EvaInteraction] Unhandled error:", err);
      res.status(500).json({ error: "Internal error" });
    });
  });
  // Eva AI knowledge fetch — called by eva-napoli VPS to get active training content
  app.get("/api/eva/knowledge", (req, res) => {
    handleEvaKnowledgeFetch(req, res).catch((err) => {
      console.error("[EvaKnowledge] Unhandled error:", err);
      res.json([]);
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerAdminLoginRoutes(app);

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
