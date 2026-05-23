import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock Stripe before importing the router
vi.mock("stripe", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    url: "https://checkout.stripe.com/pay/test_session",
    id: "cs_test_123",
  });
  const mockRetrieve = vi.fn().mockResolvedValue({
    payment_status: "paid",
    customer_details: { email: "test@example.com", name: "John Doe", phone: "7025551234" },
    amount_total: 2499,
    metadata: { orderType: "pickup" },
    line_items: { data: [] },
  });
  const MockStripe = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreate, retrieve: mockRetrieve } },
    webhooks: { constructEvent: vi.fn() },
  }));
  return { default: MockStripe };
});

// Mock env so Stripe key is "set"
vi.mock("./_core/env", () => ({
  ENV: {
    appId: "",
    cookieSecret: "test-secret",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
    forgeApiUrl: "",
    forgeApiKey: "",
  },
  STRIPE_ENV: {
    secretKey: "sk_test_mock",
    webhookSecret: "whsec_mock",
    publishableKey: "pk_test_mock",
  },
}));

import { appRouter } from "./routers";

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("stripe.createCheckoutSession", () => {
  it("returns a checkout URL and session ID", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.stripe.createCheckoutSession({
      items: [{ id: "pizza-1", name: "Pepperoni Pizza 16\"", price: 12.99, quantity: 2, category: "pizza" }],
      successUrl: "https://example.com/order-success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://example.com/menu",
      orderType: "pickup",
      customerName: "Jane Smith",
      customerPhone: "7025551234",
    });

    expect(result.url).toBe("https://checkout.stripe.com/pay/test_session");
    expect(result.sessionId).toBe("cs_test_123");
  });

  it("throws when items array is empty", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.stripe.createCheckoutSession({
        items: [],
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        orderType: "delivery",
      })
    ).rejects.toThrow();
  });
});

describe("stripe.getSession", () => {
  it("returns session details with payment status", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.stripe.getSession({ sessionId: "cs_test_123" });

    expect(result.status).toBe("paid");
    expect(result.customerName).toBe("John Doe");
    expect(result.amountTotal).toBe(24.99);
    expect(result.orderType).toBe("pickup");
  });
});
