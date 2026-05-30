/**
 * AI Usage Router
 * Exposes admin-only endpoints for monitoring LLM token usage, estimated costs,
 * and configuring the monthly cost alert threshold.
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAiUsageStats, getAlertThreshold, setAlertThreshold } from "./aiUsage";

export const aiUsageRouter = router({
  /**
   * Return AI usage statistics for the admin dashboard.
   * Only accessible to admin users.
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const stats = await getAiUsageStats();
    if (!stats) {
      return {
        allTime: { calls: 0, tokens: 0, costUsd: 0 },
        thisMonth: { calls: 0, tokens: 0, costUsd: 0 },
        today: { calls: 0, tokens: 0, costUsd: 0 },
        byFeature: [],
        daily: [],
        alertThreshold: 50.00,
      };
    }
    return stats;
  }),

  /**
   * Get the current monthly cost alert threshold (USD).
   */
  getAlertThreshold: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const threshold = await getAlertThreshold();
    return { threshold };
  }),

  /**
   * Set the monthly cost alert threshold (USD).
   * When monthly cost exceeds this value, a notification is sent to the owner.
   */
  setAlertThreshold: protectedProcedure
    .input(z.object({
      threshold: z.number().min(0.01).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await setAlertThreshold(input.threshold);
      return { success: true, threshold: input.threshold };
    }),
});
