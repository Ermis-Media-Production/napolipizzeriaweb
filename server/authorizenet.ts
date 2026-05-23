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
import { TRPCError } from "@trpc/server";

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

/**
 * Charge a credit card using an Authorize.net opaque data token.
 * The `sdk` parameter allows test injection of a mock SDK.
 */
export async function chargeOpaqueData(
  params: ChargeParams,
  sdk?: {
    APIContracts: Record<string, unknown>;
    APIControllers: Record<string, unknown>;
    Constants: Record<string, unknown>;
  }
): Promise<ChargeResult> {
  // Use injected SDK in tests, otherwise load the real one
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authorizenet = sdk ?? require("authorizenet");
  const { APIContracts, APIControllers, Constants } = authorizenet as {
    APIContracts: Record<string, new (...args: unknown[]) => Record<string, (...args: unknown[]) => void>>;
    APIControllers: Record<string, new (...args: unknown[]) => { setEnvironment: (e: unknown) => void; execute: (cb: () => void) => void; getResponse: () => unknown }>;
    Constants: { endpoint: { sandbox: string; production: string } };
  };

  return new Promise((resolve, reject) => {
    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(AUTHNET_ENV.apiLoginId);
    merchantAuth.setTransactionKey(AUTHNET_ENV.transactionKey);

    const opaqueData = new APIContracts.OpaqueDataType();
    opaqueData.setDataDescriptor(params.opaqueDataDescriptor);
    opaqueData.setDataValue(params.opaqueDataValue);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    const orderDetails = new APIContracts.OrderType();
    orderDetails.setInvoiceNumber(`NAPOLI-${Date.now()}`);
    orderDetails.setDescription(params.orderDescription.substring(0, 255));

    const customer = new APIContracts.CustomerDataType();
    if (params.customerEmail) customer.setEmail(params.customerEmail);

    const billTo = new APIContracts.CustomerAddressType();
    const nameParts = params.customerName.trim().split(" ");
    billTo.setFirstName(nameParts[0] ?? "Customer");
    billTo.setLastName(nameParts.slice(1).join(" ") || "Guest");
    if (params.customerPhone) billTo.setPhoneNumber(params.customerPhone);

    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(
      (APIContracts as unknown as { TransactionTypeEnum: { AUTHCAPTURETRANSACTION: string } })
        .TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequest.setPayment(paymentType);
    transactionRequest.setAmount(params.amount.toFixed(2));
    transactionRequest.setOrder(orderDetails);
    transactionRequest.setCustomer(customer);
    transactionRequest.setBillTo(billTo);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuth);
    createRequest.setTransactionRequest(transactionRequest);

    const ctrl = new APIControllers.CreateTransactionController(
      (createRequest as unknown as { getJSON: () => unknown }).getJSON()
    );

    ctrl.setEnvironment(
      AUTHNET_ENV.isSandbox
        ? Constants.endpoint.sandbox
        : Constants.endpoint.production
    );

    ctrl.execute(() => {
      try {
        const apiResponse = ctrl.getResponse();
        const response = new (APIContracts as unknown as { CreateTransactionResponse: new (r: unknown) => {
          getMessages: () => { getResultCode: () => string; getMessage: () => Array<{ getText: () => string }> } | null;
          getTransactionResponse: () => {
            getResponseCode: () => string;
            getTransId: () => string;
            getAuthCode: () => string;
            getErrors?: () => Array<{ getErrorText: () => string }> | null;
          } | null;
        } }).CreateTransactionResponse(apiResponse);

        if (!response) return reject(new Error("No response from Authorize.net"));

        const messages = response.getMessages();
        if (!messages) return reject(new Error("No messages in Authorize.net response"));

        const MessageTypeEnum = (APIContracts as unknown as { MessageTypeEnum: { OK: string } }).MessageTypeEnum;
        if (messages.getResultCode() !== MessageTypeEnum.OK) {
          const errMsg = messages.getMessage()?.[0]?.getText() ?? "Transaction failed";
          return reject(new Error(errMsg));
        }

        const transResponse = response.getTransactionResponse();
        if (!transResponse) return reject(new Error("No transaction response"));

        const responseCode = transResponse.getResponseCode();
        if (responseCode !== "1") {
          const errMessages = transResponse.getErrors?.();
          const errText = errMessages?.[0]?.getErrorText?.() ?? "Card declined";
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
      isSandbox: AUTHNET_ENV.isSandbox,
      configured: Boolean(AUTHNET_ENV.apiLoginId && AUTHNET_ENV.transactionKey),
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
      })
    )
    .mutation(async ({ input }) => {
      if (!AUTHNET_ENV.apiLoginId || !AUTHNET_ENV.transactionKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Authorize.net is not configured. Please add API credentials.",
        });
      }

      const amount = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

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

        return {
          success: true,
          transactionId: result.transactionId,
          authCode: result.authCode,
          amount,
          orderType: input.orderType,
          customerName: input.customerName,
          itemCount: input.items.reduce((s, i) => s + i.quantity, 0),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Payment failed";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});
