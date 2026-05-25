/**
 * Order Refund Router
 * Handles partial refunds (cancel item) and full refunds (cancel order)
 * via Authorize.net refundTransaction / voidTransaction API.
 *
 * Policy: cancellations and modifications are only accepted up to 1 hour
 * before the scheduled pickup/delivery time. After that, the customer must
 * call the restaurant directly.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { orderItems, scheduledOrders } from "../drizzle/schema";
import { publicProcedure, router } from "./_core/trpc";
import { AUTHNET_ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";

// ── Constants ─────────────────────────────────────────────────────────────────

const CANCEL_CUTOFF_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const RESTAURANT_PHONE = "(702) 544-8930";

// ── Authorize.net Refund Helpers ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANetSDK = { APIContracts: any; APIControllers: any; Constants: any };

/**
 * Issue a refund (credit) against a previously settled transaction.
 */
export async function refundTransaction(
  transactionId: string,
  amount: number,
  sdk?: ANetSDK
): Promise<{ success: boolean; refundTransactionId?: string; message?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { APIContracts, APIControllers, Constants }: ANetSDK = sdk ?? require("authorizenet");

  return new Promise((resolve) => {
    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(AUTHNET_ENV.apiLoginId);
    merchantAuth.setTransactionKey(AUTHNET_ENV.transactionKey);

    // Authorize.net requires last 4 digits for refunds; we use XXXX as placeholder
    const creditCard = new APIContracts.CreditCardType();
    creditCard.setCardNumber("XXXX");
    creditCard.setExpirationDate("XXXX");

    const payment = new APIContracts.PaymentType();
    payment.setCreditCard(creditCard);

    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(
      APIContracts.TransactionTypeEnum.REFUNDTRANSACTION
    );
    transactionRequest.setRefTransId(transactionId);
    transactionRequest.setAmount(amount.toFixed(2));
    transactionRequest.setPayment(payment);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuth);
    createRequest.setTransactionRequest(transactionRequest);

    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );
    ctrl.setEnvironment(
      AUTHNET_ENV.isSandbox
        ? Constants.endpoint.sandbox
        : Constants.endpoint.production
    );

    ctrl.execute(() => {
      try {
        const rawResponse = ctrl.getResponse();
        if (!rawResponse) {
          const ctrlErr = ctrl.getError();
          return resolve({
            success: false,
            message:
              ctrlErr?.messages?.message?.[0]?.text ?? "No response from Authorize.net",
          });
        }

        const response = new APIContracts.CreateTransactionResponse(rawResponse);
        const messages = response.getMessages();
        const resultCode = messages.getResultCode();

        if (resultCode !== APIContracts.MessageTypeEnum.OK) {
          const msgArr = messages.getMessage();
          const text = msgArr?.length ? msgArr[0].getText() : "Refund failed";
          return resolve({ success: false, message: text });
        }

        const transResponse = response.getTransactionResponse();
        if (!transResponse) {
          return resolve({ success: false, message: "No transaction response" });
        }

        const responseCode = transResponse.getResponseCode();
        if (responseCode !== "1") {
          const errors = transResponse.getErrors?.()?.getError?.();
          const errText = errors?.length ? errors[0].getErrorText() : "Refund declined";
          return resolve({ success: false, message: errText });
        }

        resolve({
          success: true,
          refundTransactionId: transResponse.getTransId() ?? undefined,
        });
      } catch (err) {
        resolve({
          success: false,
          message: err instanceof Error ? err.message : "Refund error",
        });
      }
    });
  });
}

/**
 * Void an unsettled transaction (same-day cancellation before batch settlement).
 */
export async function voidTransaction(
  transactionId: string,
  sdk?: ANetSDK
): Promise<{ success: boolean; message?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { APIContracts, APIControllers, Constants }: ANetSDK = sdk ?? require("authorizenet");

  return new Promise((resolve) => {
    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(AUTHNET_ENV.apiLoginId);
    merchantAuth.setTransactionKey(AUTHNET_ENV.transactionKey);

    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(
      APIContracts.TransactionTypeEnum.VOIDTRANSACTION
    );
    transactionRequest.setRefTransId(transactionId);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuth);
    createRequest.setTransactionRequest(transactionRequest);

    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );
    ctrl.setEnvironment(
      AUTHNET_ENV.isSandbox
        ? Constants.endpoint.sandbox
        : Constants.endpoint.production
    );

    ctrl.execute(() => {
      try {
        const rawResponse = ctrl.getResponse();
        if (!rawResponse) {
          return resolve({ success: false, message: "No response from Authorize.net" });
        }

        const response = new APIContracts.CreateTransactionResponse(rawResponse);
        const messages = response.getMessages();
        const resultCode = messages.getResultCode();

        if (resultCode !== APIContracts.MessageTypeEnum.OK) {
          const msgArr = messages.getMessage();
          const text = msgArr?.length ? msgArr[0].getText() : "Void failed";
          return resolve({ success: false, message: text });
        }

        resolve({ success: true });
      } catch (err) {
        resolve({
          success: false,
          message: err instanceof Error ? err.message : "Void error",
        });
      }
    });
  });
}

// ── 1-Hour Cutoff Check ───────────────────────────────────────────────────────

function assertCancellationAllowed(scheduledAt: number, isAsap: boolean): void {
  if (isAsap) return; // ASAP orders can always be cancelled until preparing

  const now = Date.now();
  const timeUntilOrder = scheduledAt - now;

  if (timeUntilOrder < CANCEL_CUTOFF_MS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cancellations and modifications are only accepted up to 1 hour before your scheduled time. To make changes, please call us at ${RESTAURANT_PHONE}.`,
    });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const orderRefundsRouter = router({
  /**
   * Cancel a single line item and issue a partial refund.
   * Blocked if < 1 hour before scheduled time.
   */
  cancelItem: publicProcedure
    .input(
      z.object({
        orderRef: z.string(),
        itemId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Load order
      const [order] = await db
        .select()
        .from(scheduledOrders)
        .where(eq(scheduledOrders.orderRef, input.orderRef))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      if (order.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is already cancelled" });
      }
      if (order.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot modify a completed order" });
      }

      // ── 1-hour cutoff check ──────────────────────────────────────────────────
      assertCancellationAllowed(order.scheduledAt, order.isAsap);

      // Load item
      const [item] = await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, order.id)))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (item.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Item is already cancelled" });
      }

      const refundAmount = parseFloat(String(item.lineTotal));

      // Issue refund — try refund first, fall back to void
      let refundResult: { success: boolean; message?: string } = {
        success: false,
        message: "No transaction ID on file",
      };

      if (order.transactionId) {
        refundResult = await refundTransaction(order.transactionId, refundAmount);
        if (!refundResult.success) {
          const voidResult = await voidTransaction(order.transactionId);
          if (voidResult.success) refundResult = { success: true };
        }
      }

      if (!refundResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Refund failed: ${refundResult.message ?? "Unknown error"}. Please call us at ${RESTAURANT_PHONE}.`,
        });
      }

      // Mark item cancelled
      await db
        .update(orderItems)
        .set({ status: "cancelled", refundedAmount: String(refundAmount) })
        .where(eq(orderItems.id, item.id));

      // Update order refunded total
      const newRefunded = parseFloat(String(order.refundedAmount)) + refundAmount;
      await db
        .update(scheduledOrders)
        .set({ refundedAmount: String(newRefunded) })
        .where(eq(scheduledOrders.id, order.id));

      // Notify owner
      await notifyOwner({
        title: `↩️ Partial Refund — $${refundAmount.toFixed(2)} for Order ${order.orderRef}`,
        content: `Customer: ${order.customerName}
Item cancelled: ${item.name} (${item.quantity}x) — $${refundAmount.toFixed(2)} refunded
Order total: $${order.total} | Total refunded so far: $${newRefunded.toFixed(2)}`,
      }).catch(() => {});

      return { success: true, refundAmount, newRefundedTotal: newRefunded };
    }),

  /**
   * Cancel the entire order and issue a full refund for all active items.
   * Blocked if < 1 hour before scheduled time.
   */
  cancelOrder: publicProcedure
    .input(z.object({ orderRef: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [order] = await db
        .select()
        .from(scheduledOrders)
        .where(eq(scheduledOrders.orderRef, input.orderRef))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      if (order.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is already cancelled" });
      }
      if (order.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a completed order" });
      }

      // ── 1-hour cutoff check ──────────────────────────────────────────────────
      assertCancellationAllowed(order.scheduledAt, order.isAsap);

      // Calculate remaining refundable amount
      const alreadyRefunded = parseFloat(String(order.refundedAmount));
      const totalCharged = parseFloat(String(order.total));
      const refundAmount = Math.max(0, totalCharged - alreadyRefunded);

      // Issue full refund
      let refundResult: { success: boolean; message?: string } = {
        success: false,
        message: "No transaction ID on file",
      };

      if (order.transactionId && refundAmount > 0) {
        refundResult = await refundTransaction(order.transactionId, refundAmount);
        if (!refundResult.success) {
          const voidResult = await voidTransaction(order.transactionId);
          if (voidResult.success) refundResult = { success: true };
        }
      } else {
        // Nothing left to refund (already fully refunded via item cancellations)
        refundResult = { success: true };
      }

      if (!refundResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Refund failed: ${refundResult.message ?? "Unknown error"}. Please call us at ${RESTAURANT_PHONE}.`,
        });
      }

      // Mark all active items cancelled
      await db
        .update(orderItems)
        .set({ status: "cancelled" })
        .where(and(eq(orderItems.orderId, order.id), eq(orderItems.status, "active")));

      // Mark order cancelled
      const newRefunded = alreadyRefunded + refundAmount;
      await db
        .update(scheduledOrders)
        .set({ status: "cancelled", refundedAmount: String(newRefunded) })
        .where(eq(scheduledOrders.id, order.id));

      // Notify owner
      await notifyOwner({
        title: `❌ Order Cancelled — $${refundAmount.toFixed(2)} refunded for ${order.orderRef}`,
        content: `Customer: ${order.customerName} | Phone: ${order.customerPhone}
Order total: $${order.total} | Refunded: $${refundAmount.toFixed(2)}
Transaction ID: ${order.transactionId ?? "N/A"}`,
      }).catch(() => {});

      return { success: true, refundAmount };
    }),
});
