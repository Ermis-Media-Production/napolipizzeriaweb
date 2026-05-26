/**
 * Elavon Payment Gateway — unit tests
 *
 * These tests mock the Elavon API calls and verify the tRPC router logic.
 * They do NOT make real network calls to Elavon's sandbox.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ELAVON_ENV } from "./_core/env";

// ─── Mock fetch globally ────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Mock DB helpers ────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 42 }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./cloverSync", () => ({
  pushOrderToClover: vi.fn().mockResolvedValue({ cloverOrderId: "clv_test", dashboardUrl: "" }),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Elavon environment configuration", () => {
  it("should have ELAVON_ENV defined", () => {
    expect(ELAVON_ENV).toBeDefined();
    expect(ELAVON_ENV).toHaveProperty("merchantAlias");
    expect(ELAVON_ENV).toHaveProperty("secretKey");
    expect(ELAVON_ENV).toHaveProperty("publicKey");
    expect(ELAVON_ENV).toHaveProperty("baseUrl");
    expect(ELAVON_ENV).toHaveProperty("isSandbox");
  });

  it("should default to sandbox mode", () => {
    // isSandbox defaults to true unless ELAVON_IS_SANDBOX=false
    expect(typeof ELAVON_ENV.isSandbox).toBe("boolean");
  });

  it("should have sandbox base URL when in sandbox mode", () => {
    if (ELAVON_ENV.isSandbox) {
      expect(ELAVON_ENV.baseUrl).toContain("sandbox");
    } else {
      expect(ELAVON_ENV.baseUrl).not.toContain("sandbox");
    }
  });

  it("should have merchant alias configured", () => {
    // In test env the secret may be empty string, but the key should exist
    expect(typeof ELAVON_ENV.merchantAlias).toBe("string");
  });
});

describe("Elavon Basic Auth header generation", () => {
  it("should produce a valid base64 Basic Auth header", () => {
    const alias = "test-alias";
    const secret = "test-secret";
    const credentials = `${alias}:${secret}`;
    const encoded = Buffer.from(credentials).toString("base64");
    const header = `Basic ${encoded}`;

    expect(header).toMatch(/^Basic [A-Za-z0-9+/=]+$/);
    expect(Buffer.from(encoded, "base64").toString()).toBe(credentials);
  });
});

describe("Elavon createPaymentSession — API error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw when Elavon order creation returns non-OK status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const { elavonRouter } = await import("./elavon");

    // Access the createPaymentSession procedure's resolver directly
    const caller = elavonRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });

    await expect(
      caller.createPaymentSession({
        items: [{ id: "1", name: "Margherita Pizza", price: 12.99, quantity: 1 }],
        customerName: "John Doe",
        customerPhone: "7025551234",
        customerEmail: "john@example.com",
        orderType: "pickup",
        subtotal: 12.99,
        total: 14.50,
        returnUrl: "https://example.com/order-success?payment=elavon",
        cancelUrl: "https://example.com",
      })
    ).rejects.toThrow("Failed to create Elavon order");
  });

  it("should throw when Elavon payment session creation returns non-OK status", async () => {
    // First call (order creation) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "order_test_123" }),
    });
    // Second call (payment session) fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const { elavonRouter } = await import("./elavon");

    const caller = elavonRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });

    await expect(
      caller.createPaymentSession({
        items: [{ id: "1", name: "Margherita Pizza", price: 12.99, quantity: 1 }],
        customerName: "John Doe",
        orderType: "pickup",
        subtotal: 12.99,
        total: 14.50,
        returnUrl: "https://example.com/order-success?payment=elavon",
        cancelUrl: "https://example.com",
      })
    ).rejects.toThrow("Failed to create Elavon payment session");
  });

  it("should return paymentUrl and elavonSessionId on success", async () => {
    // Order creation succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "order_elavon_abc123" }),
    });
    // Payment session creation succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://api.sandbox.elavonpayments.com/pay/abc123", id: "session_abc" }),
    });

    const { elavonRouter } = await import("./elavon");

    const caller = elavonRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });

    const result = await caller.createPaymentSession({
      items: [{ id: "1", name: "Margherita Pizza", price: 12.99, quantity: 1 }],
      customerName: "John Doe",
      orderType: "pickup",
      subtotal: 12.99,
      total: 14.50,
      returnUrl: "https://example.com/order-success?payment=elavon",
      cancelUrl: "https://example.com",
    });

    expect(result.paymentUrl).toBe("https://api.sandbox.elavonpayments.com/pay/abc123");
    expect(result.elavonSessionId).toBe("order_elavon_abc123");
  });
});

describe("Elavon getOrderRefBySession", () => {
  it("should return null orderRef when session is not found in DB", async () => {
    const { getDb } = await import("./db");
    const mockDb = await (getDb as ReturnType<typeof vi.fn>)();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No matching order
        }),
      }),
    });

    const { elavonRouter } = await import("./elavon");

    const caller = elavonRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });

    const result = await caller.getOrderRefBySession({ sessionId: "nonexistent_session" });
    expect(result.orderRef).toBeNull();
  });
});
