/**
 * AI Usage Router
 * Exposes admin-only endpoints for monitoring LLM token usage and estimated costs.
 */
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAiUsageStats } from "./aiUsage";

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
      };
    }
    return stats;
  }),
});
