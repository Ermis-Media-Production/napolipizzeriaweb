/**
 * testOrder.ts — Offline test endpoint for Clover print flow.
 * Only active when NODE_ENV !== "production".
 * Bypasses payment processing and calls pushOrderToClover directly.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { pushOrderToClover } from "./cloverSync";
import { ENV } from "./_core/env";

const ModificationSchema = z.object({
  name: z.string(),
  amount: z.number().default(0),
  cloverModifierId: z.string().optional(),
});

const CartItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number().default(1),
  description: z.string().optional(),
  cloverItemId: z.string().optional(),
  modifications: z.array(ModificationSchema).optional(),
});

export const testOrderRouter = router({
  placeTestOrder: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemSchema),
        orderType: z.enum(["pickup", "delivery", "dine-in"]).default("pickup"),
        customerName: z.string().default("Test Customer"),
        customerPhone: z.string().default("+17025550000"),
      })
    )
    .mutation(async ({ input }) => {
      const totalCents = input.items.reduce(
        (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
        0
      );

      const result = await pushOrderToClover({
        items: input.items.map((item) => ({
          name: item.name,
          price: Math.round(item.price * 100),
          quantity: item.quantity,
          description: item.description,
          cloverItemId: item.cloverItemId,
          modifications: item.modifications,
        })),
        orderType: input.orderType,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        externalId: `TEST-${Date.now()}`,
        totalCents,
        orderRef: `TEST-${Date.now()}`,
      });

      return {
        success: true,
        cloverOrderId: result.cloverOrderId,
        dashboardUrl: result.dashboardUrl,
        totalCents,
      };
    }),
});
