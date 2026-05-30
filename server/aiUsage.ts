/**
 * AI Usage Logging Helper
 *
 * Wraps invokeLLM to automatically log token usage and estimated costs
 * to the aiUsageLogs table for admin cost monitoring.
 *
 * Pricing (as of 2025, gpt-4o-mini):
 *   Input:  $0.150 / 1M tokens
 *   Output: $0.600 / 1M tokens
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { aiUsageLogs } from "../drizzle/schema";
import { gte, sum, count, sql } from "drizzle-orm";

// ── Pricing table (USD per 1M tokens) ─────────────────────────────────────────
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":        { input: 0.15,   output: 0.60  },
  "gpt-4o":             { input: 5.00,   output: 15.00 },
  "gpt-4-turbo":        { input: 10.00,  output: 30.00 },
  "gpt-3.5-turbo":      { input: 0.50,   output: 1.50  },
  default:              { input: 0.15,   output: 0.60  },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING.default;
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

// ── Tracked invokeLLM wrapper ─────────────────────────────────────────────────

export async function invokeLLMTracked(
  params: Parameters<typeof invokeLLM>[0],
  feature: string
): Promise<ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never> {
  const response = await invokeLLM(params);

  // Fire-and-forget: log usage to DB
  try {
    const usage = (response as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage;
    if (usage) {
      const promptTokens = usage.prompt_tokens ?? 0;
      const completionTokens = usage.completion_tokens ?? 0;
      const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
      const model = (response as { model?: string }).model ?? "gpt-4o-mini";
      const estimatedCostUsd = estimateCost(model, promptTokens, completionTokens).toFixed(6);

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
      }
    }
  } catch {
    // Non-critical — never block the AI response
  }

  return response as never;
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
    .orderBy(sql`SUM(${aiUsageLogs.totalTokens}) DESC`);

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
  };
}
