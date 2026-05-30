/**
 * AI Usage Logging Helper
 *
 * Wraps invokeLLM and image generation to automatically log token/image usage
 * and estimated costs to the aiUsageLogs table for admin cost monitoring.
 *
 * Pricing sources (as of June 2025):
 *   https://openai.com/api/pricing/
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { aiUsageLogs, storeSettings } from "../drizzle/schema";
import { gte, sum, count, sql, eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ── Pricing table (USD per 1M tokens) ─────────────────────────────────────────
// Text / chat models
export const MODEL_PRICING: Record<string, { input: number; output: number; type: "text" }> = {
  // GPT-4o family
  "gpt-4o":                    { input: 2.50,   output: 10.00,  type: "text" },
  "gpt-4o-2024-11-20":         { input: 2.50,   output: 10.00,  type: "text" },
  "gpt-4o-2024-08-06":         { input: 2.50,   output: 10.00,  type: "text" },
  "gpt-4o-2024-05-13":         { input: 5.00,   output: 15.00,  type: "text" },
  // GPT-4o-mini family
  "gpt-4o-mini":               { input: 0.15,   output: 0.60,   type: "text" },
  "gpt-4o-mini-2024-07-18":    { input: 0.15,   output: 0.60,   type: "text" },
  // GPT-4 Turbo
  "gpt-4-turbo":               { input: 10.00,  output: 30.00,  type: "text" },
  "gpt-4-turbo-2024-04-09":    { input: 10.00,  output: 30.00,  type: "text" },
  "gpt-4-turbo-preview":       { input: 10.00,  output: 30.00,  type: "text" },
  // GPT-4
  "gpt-4":                     { input: 30.00,  output: 60.00,  type: "text" },
  "gpt-4-32k":                 { input: 60.00,  output: 120.00, type: "text" },
  // GPT-3.5
  "gpt-3.5-turbo":             { input: 0.50,   output: 1.50,   type: "text" },
  "gpt-3.5-turbo-0125":        { input: 0.50,   output: 1.50,   type: "text" },
  // o1 / o3 reasoning models
  "o1":                        { input: 15.00,  output: 60.00,  type: "text" },
  "o1-mini":                   { input: 3.00,   output: 12.00,  type: "text" },
  "o3-mini":                   { input: 1.10,   output: 4.40,   type: "text" },
  // Fallback
  default:                     { input: 0.15,   output: 0.60,   type: "text" },
};

// Image generation pricing (USD per image)
export const IMAGE_PRICING: Record<string, Record<string, number>> = {
  "dall-e-3": {
    "1024x1024":          0.040,
    "1024x1792":          0.080,
    "1792x1024":          0.080,
    "1024x1024-hd":       0.080,
    "1024x1792-hd":       0.120,
    "1792x1024-hd":       0.120,
    default:              0.040,
  },
  "dall-e-2": {
    "256x256":            0.016,
    "512x512":            0.018,
    "1024x1024":          0.020,
    default:              0.020,
  },
};

// ── Cost estimation helpers ───────────────────────────────────────────────────

export function estimateTextCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING.default;
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

export function estimateImageCost(model: string, size: string, quality?: string): number {
  const modelPricing = IMAGE_PRICING[model];
  if (!modelPricing) return 0.040; // safe default
  const key = quality === "hd" ? `${size}-hd` : size;
  return modelPricing[key] ?? modelPricing.default ?? 0.040;
}

// ── Monthly cost alert ────────────────────────────────────────────────────────

const ALERT_KEY = "ai_cost_alert_threshold";
const DEFAULT_ALERT_THRESHOLD = 50.00; // USD
let _alertSentThisMonth: string | null = null; // "YYYY-MM" to avoid repeat alerts

async function checkAndSendCostAlert(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;
  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Only alert once per calendar month
    if (_alertSentThisMonth === monthKey) return;

    // Get threshold from settings
    const [row] = await db.select().from(storeSettings).where(eq(storeSettings.key, ALERT_KEY)).limit(1);
    const threshold = row ? parseFloat(row.value) : DEFAULT_ALERT_THRESHOLD;

    // Get current month cost
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [result] = await db
      .select({ totalCostUsd: sum(aiUsageLogs.estimatedCostUsd) })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, startOfMonth));

    const currentCost = Number(result?.totalCostUsd ?? 0);

    if (currentCost >= threshold) {
      _alertSentThisMonth = monthKey;
      await notifyOwner({
        title: `⚠️ AI Cost Alert — $${currentCost.toFixed(4)} this month`,
        content: `Your AI usage cost has reached $${currentCost.toFixed(4)} this month, exceeding the configured alert threshold of $${threshold.toFixed(2)}.\n\nCheck the AI Cost Monitor in the admin panel for details: /admin/ai-costs`,
      });
    }
  } catch {
    // Non-critical
  }
}

// ── Tracked invokeLLM wrapper ─────────────────────────────────────────────────

export async function invokeLLMTracked(
  params: Parameters<typeof invokeLLM>[0],
  feature: string
): Promise<ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never> {
  const response = await invokeLLM(params);

  // Fire-and-forget: log usage to DB + check alert
  (async () => {
    try {
      const usage = (response as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage;
      if (usage) {
        const promptTokens = usage.prompt_tokens ?? 0;
        const completionTokens = usage.completion_tokens ?? 0;
        const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
        const model = (response as { model?: string }).model ?? "gpt-4o-mini";
        const estimatedCostUsd = estimateTextCost(model, promptTokens, completionTokens).toFixed(6);

        const db = await getDb();
        if (db) {
          await db.insert(aiUsageLogs).values({
            feature,
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCostUsd,
          });
          await checkAndSendCostAlert(db);
        }
      }
    } catch {
      // Non-critical — never block the AI response
    }
  })();

  return response as never;
}

/**
 * Log an image generation call manually.
 * Call this after every generateImage() invocation.
 *
 * @example
 * const { url } = await generateImage({ prompt: "..." });
 * await logImageGeneration("menu_item_photo", "dall-e-3", "1024x1024", 1);
 */
export async function logImageGeneration(
  feature: string,
  model: "dall-e-3" | "dall-e-2" | string,
  size: string,
  count: number = 1,
  quality?: "standard" | "hd"
): Promise<void> {
  try {
    const costPerImage = estimateImageCost(model, size, quality);
    const totalCost = costPerImage * count;

    const db = await getDb();
    if (!db) return;

    await db.insert(aiUsageLogs).values({
      feature,
      model,
      promptTokens: 0,
      completionTokens: 0,
      // Store image count in totalTokens field as a proxy (1 image = 1 "token unit")
      totalTokens: count,
      estimatedCostUsd: totalCost.toFixed(6),
    });

    await checkAndSendCostAlert(db);
  } catch {
    // Non-critical
  }
}

// ── Alert threshold CRUD ──────────────────────────────────────────────────────

export async function getAlertThreshold(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return DEFAULT_ALERT_THRESHOLD;
    const [row] = await db.select().from(storeSettings).where(eq(storeSettings.key, ALERT_KEY)).limit(1);
    return row ? parseFloat(row.value) : DEFAULT_ALERT_THRESHOLD;
  } catch {
    return DEFAULT_ALERT_THRESHOLD;
  }
}

export async function setAlertThreshold(threshold: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(storeSettings).where(eq(storeSettings.key, ALERT_KEY)).limit(1);
  if (existing.length > 0) {
    await db.update(storeSettings).set({ value: threshold.toFixed(2) }).where(eq(storeSettings.key, ALERT_KEY));
  } else {
    await db.insert(storeSettings).values({ key: ALERT_KEY, value: threshold.toFixed(2) });
  }
  // Reset in-memory flag so alert can fire again if threshold was lowered
  _alertSentThisMonth = null;
}

// ── Admin stats query ─────────────────────────────────────────────────────────

export async function getAiUsageStats() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // All-time totals
  const [allTime] = await db
    .select({
      totalCalls: count(),
      totalTokens: sum(aiUsageLogs.totalTokens),
      totalCostUsd: sum(aiUsageLogs.estimatedCostUsd),
    })
    .from(aiUsageLogs);

  // This month totals
  const [thisMonth] = await db
    .select({
      totalCalls: count(),
      totalTokens: sum(aiUsageLogs.totalTokens),
      totalCostUsd: sum(aiUsageLogs.estimatedCostUsd),
    })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, startOfMonth));

  // Today totals
  const [today] = await db
    .select({
      totalCalls: count(),
      totalTokens: sum(aiUsageLogs.totalTokens),
      totalCostUsd: sum(aiUsageLogs.estimatedCostUsd),
    })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, startOfToday));

  // Per-feature breakdown (all time)
  const byFeature = await db
    .select({
      feature: aiUsageLogs.feature,
      totalCalls: count(),
      totalTokens: sum(aiUsageLogs.totalTokens),
      totalCostUsd: sum(aiUsageLogs.estimatedCostUsd),
    })
    .from(aiUsageLogs)
    .groupBy(aiUsageLogs.feature)
    .orderBy(sql`SUM(${aiUsageLogs.estimatedCostUsd}) DESC`);

  // Daily usage for the last 30 days (for chart)
  const dailyRaw = await db
    .select({
      day: sql<string>`DATE(${aiUsageLogs.createdAt})`,
      totalCalls: count(),
      totalTokens: sum(aiUsageLogs.totalTokens),
      totalCostUsd: sum(aiUsageLogs.estimatedCostUsd),
    })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, startOf30Days))
    .groupBy(sql`DATE(${aiUsageLogs.createdAt})`)
    .orderBy(sql`DATE(${aiUsageLogs.createdAt}) ASC`);

  // Alert threshold
  const alertThreshold = await getAlertThreshold();

  return {
    allTime: {
      calls: Number(allTime.totalCalls ?? 0),
      tokens: Number(allTime.totalTokens ?? 0),
      costUsd: Number(allTime.totalCostUsd ?? 0),
    },
    thisMonth: {
      calls: Number(thisMonth.totalCalls ?? 0),
      tokens: Number(thisMonth.totalTokens ?? 0),
      costUsd: Number(thisMonth.totalCostUsd ?? 0),
    },
    today: {
      calls: Number(today.totalCalls ?? 0),
      tokens: Number(today.totalTokens ?? 0),
      costUsd: Number(today.totalCostUsd ?? 0),
    },
    byFeature: byFeature.map((r) => ({
      feature: r.feature,
      calls: Number(r.totalCalls ?? 0),
      tokens: Number(r.totalTokens ?? 0),
      costUsd: Number(r.totalCostUsd ?? 0),
    })),
    daily: dailyRaw.map((r) => ({
      day: r.day,
      calls: Number(r.totalCalls ?? 0),
      tokens: Number(r.totalTokens ?? 0),
      costUsd: Number(r.totalCostUsd ?? 0),
    })),
    alertThreshold,
  };
}
