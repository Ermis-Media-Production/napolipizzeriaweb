/**
 * Tests for the Clover POS integration.
 *
 * Strategy:
 *  - axios is fully mocked — no real HTTP calls are made.
 *  - We test the tRPC router procedures (createOrder, getOrder, listOrders)
 *    and the shared pushOrderToClover helper directly.
 *  - CLOVER_ENV is mocked to provide test credentials.
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
  CLOVER_ENV: {
    apiToken: "test-clover-token",
    merchantId: "test-merchant-id",
    baseUrl: "https://api.clover.com",
  },
  UBER_ENV: {
    clientId: "",
    clientSecret: "",
    customerId: "",
    isSandbox: true,
  },
  AUTHNET_ENV: {
    apiLoginId: "",
    transactionKey: "",
    isSandbox: true,
  },
  STRIPE_ENV: {
    secretKey: "",
    webhookSecret: "",
    publishableKey: "",
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

import { cloverRouter } from "./clover";
import { pushOrderToClover } from "./cloverSync";

// ── Context helper ────────────────────────────────────────────────────────────
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_ITEMS = [
  { name: "Pepperoni Pizza 16\"", price: 18.99, quantity: 2 },
  { name: "Garlic Bread", price: 5.99, quantity: 1 },
];

const ORDER_CREATE_RESPONSE = {
  data: {
    id: "clover-order-abc123",
    state: "open",
    total: 4397,
    currency: "USD",
    title: "Online Pick-Up — Napoli Pizzeria",
    createdTime: 1716500000000,
  },
};

const BULK_LINE_ITEMS_RESPONSE = {
  data: {
    elements: [
      { id: "li-001", name: "Pepperoni Pizza 16\"", price: 1899, unitQty: 2 },
      { id: "li-002", name: "Garlic Bread", price: 599, unitQty: 1 },
    ],
  },
};

// ── clover.createOrder ────────────────────────────────────────────────────────

describe("clover.createOrder", () => {
  it("returns cloverOrderId and dashboardUrl on success", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    const caller = cloverRouter.createCaller(createCtx());
    const result = await caller.createOrder({
      items: SAMPLE_ITEMS,
      orderType: "pickup",
      customerName: "Maria Rossi",
      customerPhone: "+17025551234",
      externalId: "txn-001",
      totalCents: 4397,
    });

    expect(result.cloverOrderId).toBe("clover-order-abc123");
    expect(result.dashboardUrl).toContain("clover-order-abc123");
    expect(result.dashboardUrl).toContain("test-merchant-id");
    expect(result.orderType).toBe("pickup");
    expect(result.totalCents).toBe(4397);
  });

  it("makes two POST requests: one for order, one for line items", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    const caller = cloverRouter.createCaller(createCtx());
    await caller.createOrder({
      items: SAMPLE_ITEMS,
      orderType: "delivery",
      customerName: "John Doe",
      totalCents: 4397,
    });

    expect(mockPost).toHaveBeenCalledTimes(2);

    // First call: create order
    const firstCallUrl = String(mockPost.mock.calls[0][0]);
    expect(firstCallUrl).toContain("/orders");
    expect(firstCallUrl).not.toContain("/bulk_line_items");

    // Second call: bulk line items
    const secondCallUrl = String(mockPost.mock.calls[1][0]);
    expect(secondCallUrl).toContain("/bulk_line_items");
  });

  it("includes customer info in the order note", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    const caller = cloverRouter.createCaller(createCtx());
    await caller.createOrder({
      items: SAMPLE_ITEMS,
      orderType: "pickup",
      customerName: "Tony Soprano",
      customerPhone: "+17025559999",
      externalId: "txn-soprano-001",
      totalCents: 4397,
    });

    const orderBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(String(orderBody.note)).toContain("Tony Soprano");
    expect(String(orderBody.note)).toContain("+17025559999");
    expect(String(orderBody.note)).toContain("txn-soprano-001");
  });

  it("sends correct Authorization header", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    const caller = cloverRouter.createCaller(createCtx());
    await caller.createOrder({
      items: SAMPLE_ITEMS,
      orderType: "pickup",
      totalCents: 4397,
    });

    const headers = mockPost.mock.calls[0][2]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-clover-token");
  });

  it("converts item prices from dollars to cents in line items", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    const caller = cloverRouter.createCaller(createCtx());
    await caller.createOrder({
      items: [{ name: "Cheese Pizza", price: 12.99, quantity: 1 }],
      orderType: "dine-in",
      totalCents: 1299,
    });

    const lineItemsBody = mockPost.mock.calls[1][1] as { items: Array<{ name: string; price: number; unitQty: number }> };
    expect(lineItemsBody.items[0].price).toBe(1299); // $12.99 → 1299 cents
    expect(lineItemsBody.items[0].unitQty).toBe(1);
  });

  it("throws when items array is empty (input validation)", async () => {
    const caller = cloverRouter.createCaller(createCtx());

    await expect(
      caller.createOrder({
        items: [],
        orderType: "pickup",
        totalCents: 0,
      } as Parameters<typeof caller.createOrder>[0])
    ).rejects.toThrow();
  });
});

// ── clover.getOrder ───────────────────────────────────────────────────────────

describe("clover.getOrder", () => {
  it("returns order details with line items", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: "clover-order-abc123",
        state: "open",
        total: 4397,
        currency: "USD",
        note: "Customer: Maria Rossi",
        createdTime: 1716500000000,
        lineItems: {
          elements: [
            { id: "li-001", name: "Pepperoni Pizza 16\"", price: 1899, unitQty: 2 },
            { id: "li-002", name: "Garlic Bread", price: 599, unitQty: 1 },
          ],
        },
      },
    });

    const caller = cloverRouter.createCaller(createCtx());
    const result = await caller.getOrder({ orderId: "clover-order-abc123" });

    expect(result.cloverOrderId).toBe("clover-order-abc123");
    expect(result.state).toBe("open");
    expect(result.total).toBe(4397);
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0].name).toBe("Pepperoni Pizza 16\"");
    expect(result.note).toContain("Maria Rossi");
  });

  it("returns empty lineItems array when order has no items", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: "clover-empty-order",
        state: "open",
        total: 0,
        currency: "USD",
        createdTime: 1716500000000,
        lineItems: { elements: [] },
      },
    });

    const caller = cloverRouter.createCaller(createCtx());
    const result = await caller.getOrder({ orderId: "clover-empty-order" });

    expect(result.lineItems).toHaveLength(0);
  });

  it("uses correct URL with expand=lineItems", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: "clover-order-url-test",
        state: "open",
        total: 1000,
        currency: "USD",
        createdTime: 1716500000000,
        lineItems: { elements: [] },
      },
    });

    const caller = cloverRouter.createCaller(createCtx());
    await caller.getOrder({ orderId: "clover-order-url-test" });

    const url = String(mockGet.mock.calls[0][0]);
    expect(url).toContain("clover-order-url-test");
    expect(url).toContain("expand=lineItems");
  });
});

// ── clover.listOrders ─────────────────────────────────────────────────────────

describe("clover.listOrders", () => {
  it("returns a list of recent orders", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        elements: [
          {
            id: "order-001",
            state: "paid",
            total: 3500,
            currency: "USD",
            note: "Customer: Alice",
            createdTime: 1716500000000,
            lineItems: { elements: [{ id: "li-1", name: "Pizza" }] },
          },
          {
            id: "order-002",
            state: "open",
            total: 1200,
            currency: "USD",
            createdTime: 1716499000000,
            lineItems: { elements: [] },
          },
        ],
      },
    });

    const caller = cloverRouter.createCaller(createCtx());
    const result = await caller.listOrders({ limit: 20 });

    expect(result).toHaveLength(2);
    expect(result[0].cloverOrderId).toBe("order-001");
    expect(result[0].state).toBe("paid");
    expect(result[0].itemCount).toBe(1);
    expect(result[1].cloverOrderId).toBe("order-002");
    expect(result[1].itemCount).toBe(0);
  });

  it("returns empty array when no orders exist", async () => {
    mockGet.mockResolvedValueOnce({ data: { elements: [] } });

    const caller = cloverRouter.createCaller(createCtx());
    const result = await caller.listOrders({ limit: 20 });

    expect(result).toHaveLength(0);
  });

  it("passes limit parameter in the URL", async () => {
    mockGet.mockResolvedValueOnce({ data: { elements: [] } });

    const caller = cloverRouter.createCaller(createCtx());
    await caller.listOrders({ limit: 5 });

    const url = String(mockGet.mock.calls[0][0]);
    expect(url).toContain("limit=5");
  });
});

// ── pushOrderToClover helper ──────────────────────────────────────────────────

describe("pushOrderToClover", () => {
  it("returns cloverOrderId and dashboardUrl", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    const result = await pushOrderToClover({
      items: SAMPLE_ITEMS,
      orderType: "pickup",
      customerName: "Test Customer",
      externalId: "ext-ref-001",
      totalCents: 4397,
    });

    expect(result.cloverOrderId).toBe("clover-order-abc123");
    expect(result.dashboardUrl).toContain("clover-order-abc123");
  });

  it("uses 'Online Delivery' label for delivery orders", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    await pushOrderToClover({
      items: SAMPLE_ITEMS,
      orderType: "delivery",
      totalCents: 4397,
    });

    const orderBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(String(orderBody.title)).toContain("Online Delivery");
  });

  it("uses 'Dine-In' label for dine-in orders", async () => {
    mockPost
      .mockResolvedValueOnce(ORDER_CREATE_RESPONSE)
      .mockResolvedValueOnce(BULK_LINE_ITEMS_RESPONSE);

    await pushOrderToClover({
      items: SAMPLE_ITEMS,
      orderType: "dine-in",
      totalCents: 4397,
    });

    const orderBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(String(orderBody.title)).toContain("Dine-In");
  });
});
