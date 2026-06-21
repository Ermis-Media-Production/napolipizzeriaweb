/**
 * evaInteractions.ts
 * tRPC router + public REST endpoint for Eva AI interaction tracking and knowledge base.
 */
import { z } from "zod";
import { desc, eq, and, gte, like, or, sql, isNull, lte } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { evaInteractions, evaKnowledge } from "../drizzle/schema";
import type { Request, Response } from "express";

// ── Eva Interactions Router ───────────────────────────────────────────────────
export const evaInteractionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(50),
      channel: z.enum(["voice", "sms", "all"]).default("all"),
      status: z.enum(["completed", "abandoned", "missed", "sms", "all"]).default("all"),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { interactions: [], total: 0, page: input.page, pageSize: input.pageSize };
      const { page, pageSize, channel, status, search } = input;
      const offset = (page - 1) * pageSize;
      const conditions = [];
      if (channel !== "all") conditions.push(eq(evaInteractions.channel, channel));
      if (status !== "all") conditions.push(eq(evaInteractions.status, status));
      if (search) {
        conditions.push(or(
          like(evaInteractions.customerPhone, `%${search}%`),
          like(evaInteractions.customerName, `%${search}%`),
        ));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [rows, countResult] = await Promise.all([
        db.select().from(evaInteractions).where(where)
          .orderBy(desc(evaInteractions.createdAt)).limit(pageSize).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(evaInteractions).where(where),
      ]);
      return { interactions: rows, total: Number(countResult[0]?.count ?? 0), page, pageSize };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(evaInteractions)
        .where(eq(evaInteractions.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  stats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { allTime: { completed: 0, abandoned: 0, missed: 0, sms: 0, total: 0 }, today: { completed: 0, abandoned: 0, missed: 0, sms: 0, total: 0 } };
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [allTime, today] = await Promise.all([
        db.select({ status: evaInteractions.status, channel: evaInteractions.channel, count: sql<number>`count(*)` })
          .from(evaInteractions).groupBy(evaInteractions.status, evaInteractions.channel),
        db.select({ status: evaInteractions.status, channel: evaInteractions.channel, count: sql<number>`count(*)` })
          .from(evaInteractions).where(gte(evaInteractions.createdAt, todayStart))
          .groupBy(evaInteractions.status, evaInteractions.channel),
      ]);
      const tally = (rows: { status: string; channel: string; count: number }[]) => ({
        completed: rows.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.count), 0),
        abandoned: rows.filter(r => r.status === "abandoned").reduce((s, r) => s + Number(r.count), 0),
        missed: rows.filter(r => r.status === "missed").reduce((s, r) => s + Number(r.count), 0),
        sms: rows.filter(r => r.channel === "sms").reduce((s, r) => s + Number(r.count), 0),
        total: rows.reduce((s, r) => s + Number(r.count), 0),
      });
      return { allTime: tally(allTime), today: tally(today) };
    }),
});

// ── Eva Knowledge Router ──────────────────────────────────────────────────────
export const evaKnowledgeRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      activeOnly: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.category) conditions.push(eq(evaKnowledge.category, input.category));
      if (input.activeOnly) conditions.push(eq(evaKnowledge.isActive, true));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(evaKnowledge).where(where)
        .orderBy(desc(evaKnowledge.priority), desc(evaKnowledge.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      category: z.enum(["promo", "faq", "policy", "hours", "info", "custom"]).default("info"),
      title: z.string().min(1).max(256),
      content: z.string().min(1),
      isActive: z.boolean().default(true),
      priority: z.number().int().min(1).max(10).default(5),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(evaKnowledge).values({
        ...input,
        expiresAt: input.expiresAt ?? null,
        createdBy: ctx.user?.name ?? "admin",
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      category: z.enum(["promo", "faq", "policy", "hours", "info", "custom"]).optional(),
      title: z.string().min(1).max(256).optional(),
      content: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      priority: z.number().int().min(1).max(10).optional(),
      expiresAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...rest } = input;
      await db.update(evaKnowledge).set(rest).where(eq(evaKnowledge.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(evaKnowledge).where(eq(evaKnowledge.id, input.id));
      return { success: true };
    }),

  /** Public endpoint for Eva SMS handler to fetch active knowledge */
  getActive: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      const now = new Date();
      return db.select().from(evaKnowledge)
        .where(and(
          eq(evaKnowledge.isActive, true),
          or(isNull(evaKnowledge.expiresAt), gte(evaKnowledge.expiresAt, now))
        ))
        .orderBy(desc(evaKnowledge.priority));
    }),
});

// ── Public REST endpoint (called by eva-napoli VPS) ───────────────────────────
export async function handleEvaInteractionWebhook(req: Request, res: Response) {
  const secret = process.env.EVA_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers["x-eva-secret"] as string | undefined;
    if (!provided || provided !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const schema = z.object({
    externalId: z.string().min(1),
    channel: z.enum(["voice", "sms"]).default("voice"),
    status: z.enum(["completed", "abandoned", "missed", "sms"]).default("missed"),
    customerPhone: z.string().min(1),
    customerName: z.string().optional(),
    endedBy: z.string().optional(),
    durationSeconds: z.number().int().optional(),
    transcript: z.string().optional(),
    recordingUrl: z.string().optional(),
    summary: z.string().optional(),
    orderId: z.string().optional(),
    totalCents: z.number().int().optional(),
    rawPayload: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const data = parsed.data;
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "DB unavailable" });

  try {
    await db.insert(evaInteractions).values({
      externalId: data.externalId,
      channel: data.channel,
      status: data.status,
      customerPhone: data.customerPhone,
      customerName: data.customerName ?? null,
      endedBy: data.endedBy ?? null,
      durationSeconds: data.durationSeconds ?? null,
      transcript: data.transcript ?? null,
      recordingUrl: data.recordingUrl ?? null,
      summary: data.summary ?? null,
      orderId: data.orderId ?? null,
      totalCents: data.totalCents ?? null,
      rawPayload: data.rawPayload ?? null,
    }).onDuplicateKeyUpdate({
      set: {
        status: data.status,
        customerName: data.customerName ?? null,
        endedBy: data.endedBy ?? null,
        durationSeconds: data.durationSeconds ?? null,
        transcript: data.transcript ?? null,
        recordingUrl: data.recordingUrl ?? null,
        summary: data.summary ?? null,
        orderId: data.orderId ?? null,
        totalCents: data.totalCents ?? null,
        rawPayload: data.rawPayload ?? null,
      },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[EvaInteraction] DB error:", err);
    return res.status(500).json({ error: "Database error" });
  }
}

/** Public REST endpoint for Eva SMS/Voice to fetch active knowledge entries */
export async function handleEvaKnowledgeFetch(_req: Request, res: Response) {
  const db = await getDb();
  if (!db) return res.json([]);
  const now = new Date();
  try {
    const rows = await db.select().from(evaKnowledge)
      .where(and(
        eq(evaKnowledge.isActive, true),
        or(isNull(evaKnowledge.expiresAt), gte(evaKnowledge.expiresAt, now))
      ))
      .orderBy(desc(evaKnowledge.priority));
    return res.json(rows);
  } catch (err) {
    console.error("[EvaKnowledge] Fetch error:", err);
    return res.json([]);
  }
}
