/**
 * Tests for the Uber Direct delivery integration.
 *
 * Strategy:
 *  - The module caches the OAuth2 token in module-level variables.
 *  - We export a helper `_resetTokenCache` (test-only) to force a fresh token
 *    fetch in each test, so every procedure call consumes exactly TWO axios.post
 *    calls: one for the token, one for the actual API.
 *  - axios is fully mocked — no real HTTP calls are made.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock env ──────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-123",
    jwtSecret: "test-secret",
    oauthServerUrl: "https://oauth.test",
    builtInForgeApiUrl: "https://forge.test",
    builtInForgeApiKey: "forge-key",
  },
  UBER_ENV: {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    customerId: "test-customer-id",
  },
  AUTHNET_ENV: {
    apiLoginId: "",
    transactionKey: "",
    isSandbox: true,
  },
}));

// ── Mock axios ────────────────────────────────────────────────────────────────
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import axios from "axios";
const mockPost = vi.mocked(axios.post);
const mockGet = vi.mocked(axios.get);

// ── Token cache reset ─────────────────────────────────────────────────────────
// Import the cache-reset helper exported from uberdirect.ts for testing
import { uberDirectRouter, _resetTokenCache } from "./uberdirect";

const TOKEN_RESPONSE = {
  data: { access_token: "test-uber-token", expires_in: 2592000 },
};

beforeEach(() => {
  vi.clearAllMocks();
  _resetTokenCache(); // force fresh token fetch in every test
});

// ── Helpers ───────────────────────────────────────────────────────────────────
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── uber.getQuote ─────────────────────────────────────────────────────────────

describe("uber.getQuote", () => {
  it("returns quoteId, fee, and dropoffEta on success", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockResolvedValueOnce({
        data: {
          id: "quote-abc-123",
          fee: 599,
          currency: "usd",
          dropoff_eta: "2026-05-23T20:30:00Z",
          duration: 25,
          pickup_duration: 10,
          expires: "2026-05-23T19:30:00Z",
        },
      });

    const caller = uberDirectRouter.createCaller(createCtx());
    const result = await caller.getQuote({
      dropoffAddress: "1234 Main St",
      dropoffCity: "North Las Vegas",
      dropoffState: "NV",
      dropoffZip: "89032",
    });

    expect(result.quoteId).toBe("quote-abc-123");
    expect(result.fee).toBe(599);
    expect(result.currency).toBe("usd");
    expect(result.duration).toBe(25);
    expect(result.dropoffEta).toBe("2026-05-23T20:30:00Z");
  });

  it("throws when address is too short (input validation)", async () => {
    const caller = uberDirectRouter.createCaller(createCtx());

    await expect(
      caller.getQuote({
        dropoffAddress: "AB", // too short — min 5 chars
        dropoffCity: "NLV",
        dropoffState: "NV",
        dropoffZip: "89032",
      })
    ).rejects.toThrow();
  });

  it("propagates axios errors from Uber API", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockRejectedValueOnce(new Error("Network error"));

    const caller = uberDirectRouter.createCaller(createCtx());

    await expect(
      caller.getQuote({
        dropoffAddress: "5678 Desert Blvd",
        dropoffCity: "Las Vegas",
        dropoffState: "NV",
        dropoffZip: "89101",
      })
    ).rejects.toThrow("Network error");
  });

  it("sends pickup address in the request body", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockResolvedValueOnce({
        data: {
          id: "quote-pickup-test",
          fee: 399,
          currency: "usd",
          dropoff_eta: "2026-05-23T21:00:00Z",
          duration: 20,
          pickup_duration: 8,
          expires: "2026-05-23T20:00:00Z",
        },
      });

    const caller = uberDirectRouter.createCaller(createCtx());
    await caller.getQuote({
      dropoffAddress: "999 Test Ave",
      dropoffCity: "Las Vegas",
      dropoffState: "NV",
      dropoffZip: "89101",
    });

    const quoteCalls = mockPost.mock.calls.filter((c) =>
      String(c[0]).includes("delivery_quotes")
    );
    expect(quoteCalls.length).toBeGreaterThan(0);
    const body = quoteCalls[0][1] as Record<string, unknown>;
    expect(body.pickup_address).toBeDefined();
    expect(String(body.pickup_address)).toContain("Craig Rd");
  });
});

// ── uber.createDelivery ───────────────────────────────────────────────────────

describe("uber.createDelivery", () => {
  it("returns deliveryId, status, and trackingUrl on success", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockResolvedValueOnce({
        data: {
          id: "del-xyz-789",
          status: "pending",
          tracking_url: "https://track.uber.com/del-xyz-789",
          fee: 599,
          currency: "usd",
          pickup_eta: "2026-05-23T20:10:00Z",
          dropoff_eta: "2026-05-23T20:35:00Z",
          live_mode: false,
        },
      });

    const caller = uberDirectRouter.createCaller(createCtx());
    const result = await caller.createDelivery({
      quoteId: "quote-abc-123",
      dropoffAddress: "1234 Main St",
      dropoffCity: "North Las Vegas",
      dropoffState: "NV",
      dropoffZip: "89032",
      dropoffName: "Maria Rossi",
      dropoffPhone: "+17025551234",
      orderItems: [
        { name: "Pepperoni Pizza 16\"", quantity: 2 },
        { name: "Garlic Bread", quantity: 1 },
      ],
      externalId: "txn-order-001",
    });

    expect(result.deliveryId).toBe("del-xyz-789");
    expect(result.status).toBe("pending");
    expect(result.trackingUrl).toBe("https://track.uber.com/del-xyz-789");
    expect(result.fee).toBe(599);
    expect(result.liveMode).toBe(false);
  });

  it("includes manifest items in the request body", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockResolvedValueOnce({
        data: {
          id: "del-manifest-test",
          status: "pending",
          tracking_url: "https://track.uber.com/del-manifest-test",
          fee: 499,
          currency: "usd",
          pickup_eta: null,
          dropoff_eta: null,
          live_mode: false,
        },
      });

    const caller = uberDirectRouter.createCaller(createCtx());
    await caller.createDelivery({
      quoteId: "quote-manifest",
      dropoffAddress: "999 Test Ave",
      dropoffCity: "Las Vegas",
      dropoffState: "NV",
      dropoffZip: "89101",
      dropoffName: "John Doe",
      dropoffPhone: "+17025559999",
      orderItems: [
        { name: "BBQ Chicken Pizza", quantity: 1 },
        { name: "Wings", quantity: 2 },
      ],
    });

    const deliveryCalls = mockPost.mock.calls.filter((c) =>
      String(c[0]).includes("/deliveries") && !String(c[0]).includes("/cancel")
    );
    expect(deliveryCalls.length).toBeGreaterThan(0);
    const body = deliveryCalls[0][1] as Record<string, unknown>;
    const items = body.manifest_items as Array<{ name: string; quantity: number; size: string }>;
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("BBQ Chicken Pizza");
    expect(items[1].quantity).toBe(2);
    expect(items[0].size).toBe("small");
  });

  it("uses the quoteId in the request body", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockResolvedValueOnce({
        data: {
          id: "del-quote-test",
          status: "pending",
          tracking_url: "https://track.uber.com/del-quote-test",
          fee: 350,
          currency: "usd",
          pickup_eta: null,
          dropoff_eta: null,
          live_mode: false,
        },
      });

    const caller = uberDirectRouter.createCaller(createCtx());
    await caller.createDelivery({
      quoteId: "my-special-quote-id",
      dropoffAddress: "100 Elm St",
      dropoffCity: "Henderson",
      dropoffState: "NV",
      dropoffZip: "89002",
      dropoffName: "Test Customer",
      dropoffPhone: "+17025550000",
      orderItems: [{ name: "Cheese Pizza", quantity: 1 }],
    });

    const deliveryCalls = mockPost.mock.calls.filter((c) =>
      String(c[0]).includes("/deliveries") && !String(c[0]).includes("/cancel")
    );
    const body = deliveryCalls[0][1] as Record<string, unknown>;
    expect(body.quote_id).toBe("my-special-quote-id");
  });
});

// ── uber.getDelivery ──────────────────────────────────────────────────────────

describe("uber.getDelivery", () => {
  it("returns delivery status and courier info", async () => {
    mockPost.mockResolvedValueOnce(TOKEN_RESPONSE);
    mockGet.mockResolvedValueOnce({
      data: {
        id: "del-xyz-789",
        status: "en_route_to_dropoff",
        complete: false,
        tracking_url: "https://track.uber.com/del-xyz-789",
        fee: 599,
        pickup_eta: null,
        dropoff_eta: "2026-05-23T20:35:00Z",
        live_mode: false,
        courier: {
          name: "Carlos M.",
          rating: 4.9,
          vehicle_type: "car",
          img_href: "https://cdn.uber.com/courier.jpg",
          phone_number: "+17025550001",
        },
      },
    });

    const caller = uberDirectRouter.createCaller(createCtx());
    const result = await caller.getDelivery({ deliveryId: "del-xyz-789" });

    expect(result.deliveryId).toBe("del-xyz-789");
    expect(result.status).toBe("en_route_to_dropoff");
    expect(result.complete).toBe(false);
    expect(result.trackingUrl).toBe("https://track.uber.com/del-xyz-789");
    expect(result.courier?.name).toBe("Carlos M.");
    expect(result.courier?.rating).toBe(4.9);
    expect(result.courier?.vehicleType).toBe("car");
  });

  it("returns null courier when no courier assigned yet", async () => {
    mockPost.mockResolvedValueOnce(TOKEN_RESPONSE);
    mockGet.mockResolvedValueOnce({
      data: {
        id: "del-pending-001",
        status: "pending",
        complete: false,
        tracking_url: "https://track.uber.com/del-pending-001",
        fee: 499,
        pickup_eta: null,
        dropoff_eta: null,
        live_mode: false,
        courier: null,
      },
    });

    const caller = uberDirectRouter.createCaller(createCtx());
    const result = await caller.getDelivery({ deliveryId: "del-pending-001" });

    expect(result.courier).toBeNull();
    expect(result.status).toBe("pending");
  });
});

// ── uber.cancelDelivery ───────────────────────────────────────────────────────

describe("uber.cancelDelivery", () => {
  it("returns success=true and deliveryId on successful cancel", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockResolvedValueOnce({ data: {} });

    const caller = uberDirectRouter.createCaller(createCtx());
    const result = await caller.cancelDelivery({ deliveryId: "del-xyz-789" });

    expect(result.success).toBe(true);
    expect(result.deliveryId).toBe("del-xyz-789");
  });

  it("propagates error when cancel fails (e.g., courier already picked up)", async () => {
    mockPost
      .mockResolvedValueOnce(TOKEN_RESPONSE)
      .mockRejectedValueOnce(new Error("Cannot cancel: courier already picked up"));

    const caller = uberDirectRouter.createCaller(createCtx());

    await expect(
      caller.cancelDelivery({ deliveryId: "del-active-999" })
    ).rejects.toThrow("Cannot cancel: courier already picked up");
  });
});
