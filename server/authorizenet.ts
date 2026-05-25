/**
 * Authorize.net payment router for Napoli Pizzeria
 * Handles credit card charges using the Accept.js hosted payment form approach
 * and direct charge via the Authorize.net API for server-side processing.
 *
 * Card data never touches our server — Accept.js tokenizes it on the frontend
 * and returns an opaque data token that we pass to the Authorize.net API.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { AUTHNET_ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { pushOrderToClover } from "./cloverSync";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChargeParams = {
  opaqueDataDescriptor: string;
  opaqueDataValue: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderDescription: string;
  orderType: string;
};

export type ChargeResult = {
  transactionId: string;
  authCode: string;
  responseCode: string;
};

// ── Core charge function (injectable for testing) ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANetSDK = { APIContracts: any; APIControllers: any; Constants: any };

/**
 * Charge a credit card using an Authorize.net opaque data token.
 * The `sdk` parameter allows test injection of a mock SDK.
 * Uses the exact pattern from the official Authorize.net sample-code-node repo.
 */
export async function chargeOpaqueData(
  params: ChargeParams,
  sdk?: ANetSDK
): Promise<ChargeResult> {
  // Use injected SDK in tests, otherwise load the real one
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { APIContracts, APIControllers, Constants }: ANetSDK = sdk ?? require("authorizenet");

  return new Promise((resolve, reject) => {
    // ── Merchant authentication ──────────────────────────────────────────────
    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(AUTHNET_ENV.apiLoginId);
    merchantAuth.setTransactionKey(AUTHNET_ENV.transactionKey);

    // ── Opaque data from Accept.js ───────────────────────────────────────────
    const opaqueData = new APIContracts.OpaqueDataType();
    opaqueData.setDataDescriptor(params.opaqueDataDescriptor);
    opaqueData.setDataValue(params.opaqueDataValue);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    // ── Order details ────────────────────────────────────────────────────────
    const orderDetails = new APIContracts.OrderType();
    orderDetails.setInvoiceNumber(`NAPOLI-${Date.now()}`);
    orderDetails.setDescription(params.orderDescription.substring(0, 255));

    // ── Customer / billing info ──────────────────────────────────────────────
    const nameParts = params.customerName.trim().split(" ");
    const billTo = new APIContracts.CustomerAddressType();
    billTo.setFirstName(nameParts[0] ?? "Customer");
    billTo.setLastName(nameParts.slice(1).join(" ") || "Guest");
    if (params.customerPhone) billTo.setPhoneNumber(params.customerPhone);
    if (params.customerEmail) billTo.setEmail(params.customerEmail);

    // ── Transaction request ──────────────────────────────────────────────────
    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setPayment(paymentType);
    transactionRequest.setAmount(params.amount.toFixed(2));
    transactionRequest.setOrder(orderDetails);
    transactionRequest.setBillTo(billTo);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuth);
    createRequest.setTransactionRequest(transactionRequest);

    // ── Controller ───────────────────────────────────────────────────────────
    const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
    ctrl.setEnvironment(
      AUTHNET_ENV.isSandbox
        ? Constants.endpoint.sandbox
        : Constants.endpoint.production
    );

    ctrl.execute(() => {
      try {
        const apiResponse = ctrl.getResponse();

        if (apiResponse == null) {
          const apiError = ctrl.getError?.();
          return reject(new Error(apiError ? String(apiError) : "No response from Authorize.net"));
        }

        // Build typed response object from raw JSON — matches official SDK pattern
        const response = new APIContracts.CreateTransactionResponse(apiResponse);

        const messages = response.getMessages();
        if (!messages) return reject(new Error("No messages in Authorize.net response"));

        if (messages.getResultCode() !== APIContracts.MessageTypeEnum.OK) {
          // Top-level failure (auth error, config error, etc.)
          const transResp = response.getTransactionResponse();
          if (transResp?.getErrors?.()?.getError?.()?.length) {
            const errText = transResp.getErrors().getError()[0].getErrorText();
            return reject(new Error(errText));
          }
          const errMsg = messages.getMessage()?.length
            ? messages.getMessage()[0].getText()
            : "Transaction failed";
          return reject(new Error(errMsg));
        }

        const transResponse = response.getTransactionResponse();
        if (!transResponse) return reject(new Error("No transaction response"));

        const responseCode = transResponse.getResponseCode();
        if (responseCode !== "1") {
          // Card-level decline
          const errors = transResponse.getErrors?.()?.getError?.();
          const errText = errors?.length ? errors[0].getErrorText() : "Card declined";
          return reject(new Error(errText));
        }

        resolve({
          transactionId: transResponse.getTransId() ?? "",
          authCode: transResponse.getAuthCode() ?? "",
          responseCode,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const authorizeNetRouter = router({
  /**
   * Return the Authorize.net API Login ID (public) for Accept.js tokenization.
   * This is safe to expose — it is NOT the transaction key.
   */
  getClientKey: publicProcedure.query(() => {
    return {
      apiLoginId: AUTHNET_ENV.apiLoginId,
      clientKey: AUTHNET_ENV.clientKey,
      isSandbox: AUTHNET_ENV.isSandbox,
      configured: Boolean(AUTHNET_ENV.apiLoginId && AUTHNET_ENV.transactionKey && AUTHNET_ENV.clientKey),
    };
  }),

  /**
   * Charge a card using an Accept.js opaque data token.
   * Raw card data never reaches our server — PCI scope stays minimal.
   */
  chargeCard: publicProcedure
    .input(
      z.object({
        opaqueDataDescriptor: z.string().min(1),
        opaqueDataValue: z.string().min(1),
        items: z.array(CartItemSchema).min(1),
        orderType: z.enum(["pickup", "delivery", "dine-in"]),
        customerName: z.string().min(1).max(100),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().optional(),
        // Coupon / discount fields
        couponCode: z.string().optional(),
        discountPercent: z.number().int().min(1).max(100).optional(),
        // Convenience fee (3%) and Nevada sales tax (8.375%) in cents
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!AUTHNET_ENV.apiLoginId || !AUTHNET_ENV.transactionKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Authorize.net is not configured. Please add API credentials.",
        });
      }

      const rawAmount = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      // Apply coupon discount if provided
      const discountMultiplier = input.discountPercent ? (100 - input.discountPercent) / 100 : 1;
      const discountedSubtotal = rawAmount * discountMultiplier;
      // Add convenience fee and sales tax
      const convenienceFee = (input.convenienceFeeCents ?? 0) / 100;
      const salesTax = (input.salesTaxCents ?? 0) / 100;
      const amount = discountedSubtotal + convenienceFee + salesTax;

      if (amount <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order total must be greater than zero.",
        });
      }

      const orderDescription = input.items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(", ");

      try {
        const result = await chargeOpaqueData({
          opaqueDataDescriptor: input.opaqueDataDescriptor,
          opaqueDataValue: input.opaqueDataValue,
          amount,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          orderDescription,
          orderType: input.orderType,
        });

        // Fire-and-forget: notify owner of successful payment
        notifyOwner({
          title: `💳 New Order — $${amount.toFixed(2)} (${input.orderType})`,
          content: [
            `Customer: ${input.customerName}`,
            input.customerPhone ? `Phone: ${input.customerPhone}` : null,
            input.customerEmail ? `Email: ${input.customerEmail}` : null,
            `Order Type: ${input.orderType}`,
            `Total Charged: $${amount.toFixed(2)}`,
            input.discountPercent ? `Coupon: ${input.couponCode} (${input.discountPercent}% off)` : null,
            ``,
            `Items:`,
            ...input.items.map((i) => `  • ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}`),
            ``,
            `Transaction ID: ${result.transactionId}`,
            `Auth Code: ${result.authCode}`,
          ].filter(Boolean).join("\n"),
        }).catch((err) =>
          console.error("[Notification] Failed to send payment notification:", err)
        );

        // Fire-and-forget: push order to Clover POS (non-blocking)
        pushOrderToClover({
          items: input.items,
          orderType: input.orderType,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          externalId: result.transactionId,
          totalCents: Math.round(amount * 100), // discounted total
        }).catch((err) =>
          console.error("[Clover] Failed to push Authorize.net order:", err)
        );

        return {
          success: true,
          transactionId: result.transactionId,
          authCode: result.authCode,
          amount,
          orderType: input.orderType,
          customerName: input.customerName,
          itemCount: input.items.reduce((s, i) => s + i.quantity, 0),
          couponCode: input.couponCode,
          discountPercent: input.discountPercent,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Payment failed";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});
