/**
 * Authorize.net payment router for Napoli Pizzeria
 * Handles credit card charges using the Accept.js hosted payment form approach
 * and direct charge via the Authorize.net API for server-side processing.
 *
 * Card data never touches our server — Accept.js tokenizes it on the frontend
 * and returns an opaque data token that we pass to the Authorize.net API.
 */
import { createRequire } from "module";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { AUTHNET_ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { pushOrderToClover } from "./cloverSync";
import { sendSms } from "./_core/sms";
import { ADMIN_PHONE } from "../shared/const";
import { buildAdminReceiptHtml, buildCustomerReceiptHtml, sendReceiptEmail } from "./receiptTemplates";

// authorizenet is a CommonJS package — use createRequire to load it in ESM context
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _authorizenet: any = _require("authorizenet");

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
  // Use injected SDK in tests, otherwise load the real one via createRequire (ESM-safe)
  const { APIContracts, APIControllers, Constants }: ANetSDK = sdk ?? _authorizenet;

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

// ── Accept Hosted (Pay by Link) ──────────────────────────────────────────────

export type PayByLinkParams = {
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderDescription: string;
  orderType: string;
  returnUrl: string;  // where to send customer after payment
  cancelUrl: string;
};

export type PayByLinkResult = {
  token: string;
  paymentUrl: string; // full URL to redirect/send to customer
};

/**
 * Generate an Authorize.net Accept Hosted payment page token.
 * Returns a URL the customer can open to pay securely on Authorize.net's hosted form.
 * The token is valid for 15 minutes.
 */
export async function getHostedPaymentPageToken(
  params: PayByLinkParams,
  sdk?: ANetSDK
): Promise<PayByLinkResult> {
  const { APIContracts, APIControllers, Constants }: ANetSDK = sdk ?? _authorizenet;

  return new Promise((resolve, reject) => {
    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(AUTHNET_ENV.apiLoginId);
    merchantAuth.setTransactionKey(AUTHNET_ENV.transactionKey);

    // Transaction request (auth+capture)
    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(params.amount.toFixed(2));

    const orderDetails = new APIContracts.OrderType();
    orderDetails.setInvoiceNumber(`NAPOLI-${Date.now()}`);
    orderDetails.setDescription(params.orderDescription.substring(0, 255));
    transactionRequest.setOrder(orderDetails);

    // Pre-fill customer info on the hosted form
    const nameParts = params.customerName.trim().split(" ");
    const billTo = new APIContracts.CustomerAddressType();
    billTo.setFirstName(nameParts[0] ?? "Customer");
    billTo.setLastName(nameParts.slice(1).join(" ") || "Guest");
    if (params.customerPhone) billTo.setPhoneNumber(params.customerPhone);
    if (params.customerEmail) billTo.setEmail(params.customerEmail);
    transactionRequest.setBillTo(billTo);

    // Hosted form settings
    const settingList: unknown[] = [];

    const returnOptions = new APIContracts.SettingType();
    returnOptions.setSettingName("hostedPaymentReturnOptions");
    returnOptions.setSettingValue(
      JSON.stringify({
        showReceipt: true,
        url: params.returnUrl,
        urlText: "Back to Order",
        cancelUrl: params.cancelUrl,
        cancelUrlText: "Cancel",
      })
    );
    settingList.push(returnOptions);

    const buttonOptions = new APIContracts.SettingType();
    buttonOptions.setSettingName("hostedPaymentButtonOptions");
    buttonOptions.setSettingValue(JSON.stringify({ text: "Pay Now" }));
    settingList.push(buttonOptions);

    const styleOptions = new APIContracts.SettingType();
    styleOptions.setSettingName("hostedPaymentStyleOptions");
    styleOptions.setSettingValue(JSON.stringify({ bgColor: "#c0392b" })); // Napoli red
    settingList.push(styleOptions);

    const paymentOptions = new APIContracts.SettingType();
    paymentOptions.setSettingName("hostedPaymentPaymentOptions");
    paymentOptions.setSettingValue(
      JSON.stringify({ cardCodeRequired: true, showCreditCard: true, showBankAccount: false })
    );
    settingList.push(paymentOptions);

    const orderOptions = new APIContracts.SettingType();
    orderOptions.setSettingName("hostedPaymentOrderOptions");
    orderOptions.setSettingValue(
      JSON.stringify({ show: true, merchantName: "Napoli Pizzeria" })
    );
    settingList.push(orderOptions);

    const iframeOptions = new APIContracts.SettingType();
    iframeOptions.setSettingName("hostedPaymentIFrameCommunicatorUrl");
    iframeOptions.setSettingValue(JSON.stringify({ url: params.returnUrl }));
    settingList.push(iframeOptions);

    const settings = new APIContracts.ArrayOfSetting();
    settings.setSetting(settingList);

    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuth);
    request.setTransactionRequest(transactionRequest);
    request.setHostedPaymentSettings(settings);

    const ctrl = new APIControllers.GetHostedPaymentPageController(request.getJSON());
    ctrl.setEnvironment(
      AUTHNET_ENV.isSandbox ? Constants.endpoint.sandbox : Constants.endpoint.production
    );

    ctrl.execute(() => {
      try {
        const apiResponse = ctrl.getResponse();
        if (!apiResponse) return reject(new Error("No response from Authorize.net"));

        const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);
        const messages = response.getMessages();

        if (!messages || messages.getResultCode() !== APIContracts.MessageTypeEnum.OK) {
          const errMsg = messages?.getMessage?.()?.length
            ? messages.getMessage()[0].getText()
            : "Failed to generate payment page token";
          return reject(new Error(errMsg));
        }

        const token = response.getToken();
        if (!token) return reject(new Error("Empty token from Authorize.net"));

        const baseUrl = AUTHNET_ENV.isSandbox
          ? "https://test.authorize.net/payment/payment"
          : "https://accept.authorize.net/payment/payment";

        resolve({
          token,
          paymentUrl: `${baseUrl}?token=${encodeURIComponent(token)}`,
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
  description: z.string().optional(), // modifier/customization details
  cloverItemId: z.string().optional(), // Clover catalog item ID — enables kitchen printer routing
  modifications: z.array(z.object({
    name: z.string(),
    amount: z.number().default(0),
    cloverModifierId: z.string().optional(),
  })).optional(),
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
        customerEmail: z.string().email(),
        customerPhone: z.string().optional(),
        // Coupon / discount fields
        couponCode: z.string().optional(),
        discountPercent: z.number().int().min(1).max(100).optional(),
        // Convenience fee (3%) and Nevada sales tax (8.375%) in cents
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
        specialInstructions: z.string().optional(),
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
          items: input.items.map((i) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            description: i.description,
            cloverItemId: i.cloverItemId,
          })),
          orderType: input.orderType,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          externalId: result.transactionId,
          totalCents: Math.round(amount * 100), // discounted total
          specialInstructions: input.specialInstructions,
        }).catch((err) =>
          console.error("[Clover] Failed to push Authorize.net order:", err)
        );

        // Fire-and-forget: send SMS confirmation to customer
        if (input.customerPhone) {
          const firstName = input.customerName.trim().split(/\s+/)[0] ?? input.customerName;
          const smsBody = [
            `Hi ${firstName}! 🍕 Your Napoli Pizzeria order is confirmed.`,
            `Total charged: $${amount.toFixed(2)}`,
            `Order type: ${input.orderType}`,
            `Transaction: ${result.transactionId}`,
            `Questions? Call us: (702) 544-8930`,
          ].join("\n");
          sendSms(input.customerPhone, smsBody).catch((err) =>
            console.error("[SMS] Failed to send order confirmation:", err)
          );
        }

        // Fire-and-forget: notify admin/restaurant manager of new paid order
        {
          const itemsSummary = input.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
          const adminSms = [
            `💳 NEW PAID ORDER — Napoli Pizzeria`,
            `Customer: ${input.customerName}${input.customerPhone ? ` | ${input.customerPhone}` : ""}`,
            `Type: ${input.orderType} | Total: $${amount.toFixed(2)}`,
            `Transaction: ${result.transactionId}`,
            `Items: ${itemsSummary}`,
          ].join("\n");
          sendSms(ADMIN_PHONE, adminSms).catch((err) =>
            console.error("[SMS] Failed to send admin notification:", err)
          );
        }

        // Fire-and-forget: HTML email receipt to restaurant owner
        {
          const receiptData = {
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            customerEmail: input.customerEmail,
            orderType: input.orderType,
            items: input.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, description: i.description })),
            subtotal: rawAmount,
            convenienceFee,
            salesTax,
            discount: rawAmount - discountedSubtotal,
            couponCode: input.couponCode,
            discountPercent: input.discountPercent,
            grandTotal: amount,
            transactionId: result.transactionId,
            authCode: result.authCode,
            date: new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
          };
          // Admin receipt
          sendReceiptEmail({
            to: "henys2325@gmail.com",
            subject: `🔔 New Order — $${amount.toFixed(2)} (${input.orderType}) — ${input.customerName}`,
            html: buildAdminReceiptHtml(receiptData),
          }).catch((err) => console.error("[Email] Failed to send admin receipt:", err));
          // Customer receipt (if email provided)
          if (input.customerEmail) {
            sendReceiptEmail({
              to: input.customerEmail,
              subject: `🍕 Your Napoli Pizzeria Order Confirmation — $${amount.toFixed(2)}`,
              html: buildCustomerReceiptHtml(receiptData),
            }).catch((err) => console.error("[Email] Failed to send customer receipt:", err));
          }
        }

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

  /**
   * Generate an Authorize.net Accept Hosted payment link and send it via SMS.
   * The customer receives a secure URL they can open on any device to pay.
   * Token is valid for 15 minutes.
   */
  sendPayByLink: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemSchema).min(1),
        orderType: z.enum(["pickup", "delivery", "dine-in"]),
        customerName: z.string().min(1).max(100),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().min(10),
        couponCode: z.string().optional(),
        discountPercent: z.number().int().min(1).max(100).optional(),
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
        specialInstructions: z.string().optional(),
        origin: z.string().url(), // e.g. https://napolipizzerianorthlasvegas.com
      })
    )
    .mutation(async ({ input }) => {
      if (!AUTHNET_ENV.apiLoginId || !AUTHNET_ENV.transactionKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Authorize.net is not configured.",
        });
      }

      const rawAmount = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const discountMultiplier = input.discountPercent ? (100 - input.discountPercent) / 100 : 1;
      const discountedSubtotal = rawAmount * discountMultiplier;
      const convenienceFee = (input.convenienceFeeCents ?? 0) / 100;
      const salesTax = (input.salesTaxCents ?? 0) / 100;
      const amount = discountedSubtotal + convenienceFee + salesTax;

      if (amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order total must be greater than zero." });
      }

      const orderDescription = input.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

      try {
        const { paymentUrl } = await getHostedPaymentPageToken({
          amount,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          orderDescription,
          orderType: input.orderType,
          returnUrl: `${input.origin}/order-success?payment=authnet&order_type=${input.orderType}&customer=${encodeURIComponent(input.customerName)}`,
          cancelUrl: `${input.origin}/menu`,
        });

        // Send payment link via SMS
        const firstName = input.customerName.trim().split(/\s+/)[0] ?? input.customerName;
        const smsBody = [
          `Hi ${firstName}! 🍕 Your Napoli Pizzeria order is ready to pay.`,
          `Order: ${orderDescription.substring(0, 80)}${orderDescription.length > 80 ? "..." : ""}`,
          `Total: $${amount.toFixed(2)} (${input.orderType})`,
          `Pay securely here (link valid 15 min):`,
          paymentUrl,
          `Questions? Call: (702) 544-8930`,
        ].join("\n");

        const smsSent = await sendSms(input.customerPhone, smsBody);


        // Fire-and-forget: notify admin/restaurant manager of new pay-by-link order
        {
          const itemsSummary = input.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
          const adminSms = [
            `📱 PAY BY LINK SENT — Napoli Pizzeria`,
            `Customer: ${input.customerName} | ${input.customerPhone}`,
            `Type: ${input.orderType} | Total: $${amount.toFixed(2)}`,
            `Items: ${itemsSummary}`,
            `Link: ${paymentUrl}`,
          ].join("\n");
          sendSms(ADMIN_PHONE, adminSms).catch((err) =>
            console.error("[SMS] Failed to send admin pay-by-link notification:", err)
          );
        }
        // Notify owner
        notifyOwner({
          title: `📱 Pay by Link Sent — $${amount.toFixed(2)} (${input.orderType})`,
          content: [
            `Customer: ${input.customerName}`,
            `Phone: ${input.customerPhone}`,
            input.customerEmail ? `Email: ${input.customerEmail}` : null,
            `Order Type: ${input.orderType}`,
            `Total: $${amount.toFixed(2)}`,
            `SMS sent: ${smsSent ? "Yes" : "No (check Twilio config)"}`,
            ``,
            `Items:`,
            ...input.items.map((i) => `  • ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}`),
            ``,
            `Payment link: ${paymentUrl}`,
          ].filter(Boolean).join("\n"),
        }).catch(console.error);

        return {
          success: true,
          smsSent,
          amount,
          paymentUrl,
          orderType: input.orderType,
          customerName: input.customerName,
          itemCount: input.items.reduce((s, i) => s + i.quantity, 0),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to generate payment link";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});
