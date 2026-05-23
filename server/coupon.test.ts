/**
 * Vitest tests for the coupon router
 * Tests: validate, redeem, create, list, toggle
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock Drizzle DB ────────────────────────────────────────────────────────────
// vi.mock is hoisted, so we cannot reference top-level variables inside the factory.
// Instead we use vi.hoisted to create the mock objects before the factory runs.

const { mockDb, mockCoupon } = vi.hoisted(() => {
  const mockCoupon = {
    id: 1,
    code: "NAPOLI98",
    discountPercent: 98,
    description: "98% off your order",
    isActive: true,
    usageLimit: null as number | null,
    usageCount: 0,
    createdAt: new Date(),
  };

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([mockCoupon]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([mockCoupon]),
  };

  return { mockDb, mockCoupon };
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
  };
});

vi.mock("../drizzle/schema", () => ({
  coupons: {
    code: "code",
    isActive: "isActive",
    usageCount: "usageCount",
    createdAt: "createdAt",
  },
}));

// ── Import router after mocks ──────────────────────────────────────────────────

import { couponRouter } from "./coupon";

// ── Helpers ───────────────────────────────────────────────────────────────────

type RouterCaller = ReturnType<typeof couponRouter.createCaller>;

function makePublicCaller(): RouterCaller {
  return couponRouter.createCaller({ user: null } as unknown as Parameters<typeof couponRouter.createCaller>[0]);
}

function makeAdminCaller(): RouterCaller {
  return couponRouter.createCaller({
    user: { id: "admin-1", role: "admin", name: "Admin" },
  } as unknown as Parameters<typeof couponRouter.createCaller>[0]);
}

function makeUserCaller(): RouterCaller {
  return couponRouter.createCaller({
    user: { id: "user-1", role: "user", name: "User" },
  } as unknown as Parameters<typeof couponRouter.createCaller>[0]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("couponRouter.validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([mockCoupon]);
  });

  it("returns discount info for a valid active coupon", async () => {
    const caller = makePublicCaller();
    const result = await caller.validate({ code: "NAPOLI98" });
    expect(result.code).toBe("NAPOLI98");
    expect(result.discountPercent).toBe(98);
    expect(result.description).toBe("98% off your order");
  });

  it("throws NOT_FOUND for an unknown coupon code", async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const caller = makePublicCaller();
    await expect(caller.validate({ code: "INVALID" })).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST for an inactive coupon", async () => {
    mockDb.limit.mockResolvedValueOnce([{ ...mockCoupon, isActive: false }]);
    const caller = makePublicCaller();
    await expect(caller.validate({ code: "NAPOLI98" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws BAD_REQUEST when usage limit is exhausted", async () => {
    mockDb.limit.mockResolvedValueOnce([{ ...mockCoupon, usageLimit: 5, usageCount: 5 }]);
    const caller = makePublicCaller();
    await expect(caller.validate({ code: "NAPOLI98" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("normalises code to uppercase before lookup", async () => {
    const caller = makePublicCaller();
    const result = await caller.validate({ code: "napoli98" });
    expect(result.code).toBe("NAPOLI98");
  });
});

describe("couponRouter.redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([mockCoupon]);
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
  });

  it("returns success:true for a valid active coupon", async () => {
    const caller = makePublicCaller();
    const result = await caller.redeem({ code: "NAPOLI98" });
    expect(result.success).toBe(true);
  });

  it("returns success:false for an unknown coupon", async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const caller = makePublicCaller();
    const result = await caller.redeem({ code: "UNKNOWN" });
    expect(result.success).toBe(false);
  });

  it("returns success:false for an inactive coupon", async () => {
    mockDb.limit.mockResolvedValueOnce([{ ...mockCoupon, isActive: false }]);
    const caller = makePublicCaller();
    const result = await caller.redeem({ code: "NAPOLI98" });
    expect(result.success).toBe(false);
  });
});

describe("couponRouter.create (admin only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);
    mockDb.insert.mockReturnThis();
    mockDb.values.mockResolvedValue(undefined);
  });

  it("creates a coupon when called by admin", async () => {
    const caller = makeAdminCaller();
    const result = await caller.create({ code: "SUMMER20", discountPercent: 20 });
    expect(result.code).toBe("SUMMER20");
    expect(result.discountPercent).toBe(20);
  });

  it("throws FORBIDDEN when called by a non-admin user", async () => {
    const caller = makeUserCaller();
    await expect(
      caller.create({ code: "SUMMER20", discountPercent: 20 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws CONFLICT when coupon code already exists", async () => {
    mockDb.limit.mockResolvedValueOnce([mockCoupon]);
    const caller = makeAdminCaller();
    await expect(
      caller.create({ code: "NAPOLI98", discountPercent: 98 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("couponRouter.list (admin only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([mockCoupon]);
  });

  it("returns list of coupons for admin", async () => {
    const caller = makeAdminCaller();
    const result = await caller.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].code).toBe("NAPOLI98");
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = makeUserCaller();
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("couponRouter.toggle (admin only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);
  });

  it("toggles a coupon's active state for admin", async () => {
    const caller = makeAdminCaller();
    const result = await caller.toggle({ code: "NAPOLI98", isActive: false });
    expect(result.code).toBe("NAPOLI98");
    expect(result.isActive).toBe(false);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = makeUserCaller();
    await expect(
      caller.toggle({ code: "NAPOLI98", isActive: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
