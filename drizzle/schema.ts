import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tracks processed Stripe webhook event IDs to prevent duplicate Clover orders
 * when Stripe retries or replays events.
 */
export const processedWebhookEvents = mysqlTable("processedWebhookEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 128 }).notNull().unique(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
});
export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;

/**
 * Discount coupons table.
 * Each coupon has a unique code, a discount percentage (0-100), and optional usage limits.
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  /** The coupon code customers enter at checkout (case-insensitive, stored uppercase). */
  code: varchar("code", { length: 64 }).notNull().unique(),
  /** Discount percentage, e.g. 98 means 98% off. */
  discountPercent: int("discountPercent").notNull(),
  /** Human-readable description shown to the customer. */
  description: text("description"),
  /** Whether the coupon is currently active. */
  isActive: boolean("isActive").default(true).notNull(),
  /** Maximum number of times this coupon can be used. NULL = unlimited. */
  usageLimit: int("usageLimit"),
  /** How many times this coupon has been used so far. */
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Key-value store for runtime-configurable store settings.
 * Examples: convenience_fee_enabled, convenience_fee_percent.
 * Values are stored as text and parsed by the application layer.
 */
export const storeSettings = mysqlTable("storeSettings", {
  id: int("id").autoincrement().primaryKey(),
  /** Setting identifier, e.g. "convenience_fee_enabled" */
  key: varchar("key", { length: 128 }).notNull().unique(),
  /** Setting value stored as text (parse as needed: "true"/"false" or numeric string) */
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreSetting = typeof storeSettings.$inferSelect;
export type InsertStoreSetting = typeof storeSettings.$inferInsert;

/**
 * Scheduled orders — one row per customer order.
 * Stores the full order snapshot (items, totals, customer info) plus scheduling info.
 */
export const scheduledOrders = mysqlTable("scheduledOrders", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique public-facing order reference (e.g. "NPZ-20260525-0042") */
  orderRef: varchar("orderRef", { length: 32 }).notNull().unique(),
  /** Order status lifecycle */
  status: mysqlEnum("status", ["pending_payment", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"])
    .default("confirmed")
    .notNull(),
  /** Order type */
  orderType: mysqlEnum("orderType", ["pickup", "delivery", "dine-in"]).notNull(),
  /** Scheduled pickup/delivery time as UTC Unix timestamp (ms) */
  scheduledAt: int("scheduledAt").notNull(),
  /** Whether this is ASAP (true) or a future scheduled time (false) */
  isAsap: boolean("isAsap").default(false).notNull(),
  /** Customer info */
  customerName: varchar("customerName", { length: 128 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  /** Delivery address (only for delivery orders) */
  deliveryAddress: text("deliveryAddress"),
  /** Full cart snapshot as JSON array of CartItem */
  items: json("items").notNull(),
  /** Number of pizzas in this order (for capacity tracking) */
  pizzaCount: int("pizzaCount").default(0).notNull(),
  /** Pricing */
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  convenienceFee: decimal("convenienceFee", { precision: 10, scale: 2 }).default("0").notNull(),
  salesTax: decimal("salesTax", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  /** Coupon used (if any) */
  couponCode: varchar("couponCode", { length: 64 }),
  /** Payment method used */
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "authorizenet", "clover", "cash", "elavon"]).default("stripe"),
  /** Payment status */
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded", "failed"]).default("paid"),
  /** Authorize.net transaction reference (for refunds) */
  transactionId: varchar("transactionId", { length: 64 }),
  authCode: varchar("authCode", { length: 16 }),
  /** Clover Hosted Checkout session ID */
  cloverSessionId: varchar("cloverSessionId", { length: 128 }),
  /** Clover payment/charge ID after successful payment */
  cloverPaymentId: varchar("cloverPaymentId", { length: 128 }),
  /** Clover POS order ID (for linking to Clover Dashboard) */
  cloverOrderId: varchar("cloverOrderId", { length: 128 }),
  /** Elavon EPG payment session ID */
  elavonSessionId: varchar("elavonSessionId", { length: 256 }),
  /** Elavon transaction/order ID after successful payment */
  elavonTransactionId: varchar("elavonTransactionId", { length: 128 }),
  /** Total amount already refunded */
  refundedAmount: decimal("refundedAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  /** Special instructions from customer */
  specialInstructions: text("specialInstructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledOrder = typeof scheduledOrders.$inferSelect;
export type InsertScheduledOrder = typeof scheduledOrders.$inferInsert;

/**
 * Individual line items within a scheduled order.
 * Allows per-item cancellation and partial refunds.
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  /** Item name as shown on the receipt */
  name: varchar("name", { length: 256 }).notNull(),
  /** Full description including customizations */
  description: text("description"),
  /** Unit price at time of order */
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  /** Line total = unitPrice * quantity */
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  /** Whether this item is a pizza (for capacity tracking) */
  isPizza: boolean("isPizza").default(false).notNull(),
  /** Item status */
  status: mysqlEnum("status", ["active", "cancelled"]).default("active").notNull(),
  /** Refund amount issued for this item (0 if not refunded) */
  refundedAmount: decimal("refundedAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Menu items managed by admin.
 * Mirrors the static napoliData.ts but stored in DB for live editing.
 */
export const menuItems = mysqlTable("menuItems", {
  id: int("id").autoincrement().primaryKey(),
  /** Display name, e.g. "Margherita Pizza" */
  name: varchar("name", { length: 256 }).notNull(),
  /** Category slug matching napoliData categories, e.g. "pizza", "burger", "beverage" */
  category: varchar("category", { length: 64 }).notNull(),
  /** Short description shown on menu */
  description: text("description"),
  /** Base price in dollars */
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  /** Second price tier (e.g. large size) — optional */
  price2: decimal("price2", { precision: 10, scale: 2 }),
  /** Label for price2 tier, e.g. "1 lb" or "Large" */
  price2Label: varchar("price2Label", { length: 64 }),
  /** S3 storage URL for the item image */
  imageUrl: text("imageUrl"),
  /** S3 storage key for deletion */
  imageKey: varchar("imageKey", { length: 256 }),
  /** Clover item ID for sync tracking — null for manually created items */
  cloverItemId: varchar("cloverItemId", { length: 64 }),
  /** Clover printer label: Food | Pizza | Pizzeria | Bar/Drinks */
  printLabel: mysqlEnum("printLabel", ["Food", "Pizza", "Pizzeria", "Bar/Drinks"]).default("Food").notNull(),
  /** Whether this item is currently available for ordering */
  isAvailable: boolean("isAvailable").default(true).notNull(),
  /** Display sort order within category */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

/**
 * Modifier groups (e.g. "Choose your crust", "Add toppings").
 * A group can be required or optional, with min/max selection limits.
 */
export const modifierGroups = mysqlTable("modifierGroups", {
  id: int("id").autoincrement().primaryKey(),
  /** Group name shown to customer, e.g. "Choose Crust" */
  name: varchar("name", { length: 128 }).notNull(),
  /** Whether customer must select at least one option */
  required: boolean("required").default(false).notNull(),
  /** Minimum number of options to select (0 = optional) */
  minSelect: int("minSelect").default(0).notNull(),
  /** Maximum number of options to select (0 = unlimited) */
  maxSelect: int("maxSelect").default(1).notNull(),
  /** Display sort order */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type InsertModifierGroup = typeof modifierGroups.$inferInsert;

/**
 * Individual options within a modifier group.
 * e.g. "Thin Crust (+$0.00)", "Stuffed Crust (+$2.00)"
 */
export const modifierOptions = mysqlTable("modifierOptions", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent modifier group */
  groupId: int("groupId").notNull(),
  /** Option name shown to customer */
  name: varchar("name", { length: 128 }).notNull(),
  /** Price adjustment in dollars (positive = upcharge, negative = discount, 0 = no change) */
  priceAdjustment: decimal("priceAdjustment", { precision: 10, scale: 2 }).default("0").notNull(),
  /** Whether this option is pre-selected by default */
  isDefault: boolean("isDefault").default(false).notNull(),
  /** Display sort order within group */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModifierOption = typeof modifierOptions.$inferSelect;
export type InsertModifierOption = typeof modifierOptions.$inferInsert;

/**
 * Join table: which modifier groups apply to which menu items.
 */
export const itemModifierGroups = mysqlTable("itemModifierGroups", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  groupId: int("groupId").notNull(),
  /** Display sort order for this group on this item */
  sortOrder: int("sortOrder").default(0).notNull(),
});

export type ItemModifierGroup = typeof itemModifierGroups.$inferSelect;
export type InsertItemModifierGroup = typeof itemModifierGroups.$inferInsert;

/**
 * Reservations table — covers both same-day scheduled orders and future reservations.
 * Same-day orders: type = "order", scheduledDate = today (Las Vegas time), cutoff 9:30 PM.
 * Future reservations: type = "reservation", scheduledDate = future date.
 */
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  /** "order" = same-day order, "reservation" = future reservation */
  type: mysqlEnum("type", ["order", "reservation"]).notNull(),
  /** Service type */
  serviceType: mysqlEnum("serviceType", ["dine-in", "pickup", "delivery"]).notNull(),
  /** Scheduled date as YYYY-MM-DD string (Las Vegas local date) */
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(),
  /** Scheduled time as HH:MM string (Las Vegas local time, 24h) */
  scheduledTime: varchar("scheduledTime", { length: 5 }).notNull(),
  /** Number of guests (for dine-in reservations) */
  partySize: int("partySize"),
  /** Customer contact info */
  customerName: varchar("customerName", { length: 128 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  /** Delivery address (only for delivery) */
  deliveryAddress: text("deliveryAddress"),
  /** Any special requests or notes from the customer */
  notes: text("notes"),
  /** Reservation/order status */
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;


/**
 * Tracks questions asked to Eva AI to power self-learning quick questions.
 * Each row represents a unique normalized question (similar questions are grouped).
 * The `count` field increments each time the same question is asked.
 */
/**
 * Tracks LLM (AI) usage for cost monitoring in the admin dashboard.
 * One row per AI invocation — records tokens used and estimated cost.
 */
export const aiUsageLogs = mysqlTable("aiUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  /** Which feature triggered the AI call: 'eva_chat' | 'eva_normalize' | 'other' */
  feature: varchar("feature", { length: 64 }).notNull(),
  /** Model used (e.g. 'gpt-4o-mini') */
  model: varchar("model", { length: 64 }).default("gpt-4o-mini").notNull(),
  /** Prompt tokens consumed */
  promptTokens: int("promptTokens").default(0).notNull(),
  /** Completion tokens consumed */
  completionTokens: int("completionTokens").default(0).notNull(),
  /** Total tokens (prompt + completion) */
  totalTokens: int("totalTokens").default(0).notNull(),
  /** Estimated cost in USD (based on model pricing) */
  estimatedCostUsd: decimal("estimatedCostUsd", { precision: 10, scale: 6 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = typeof aiUsageLogs.$inferInsert;

export const evaQuestions = mysqlTable("evaQuestions", {
  id: int("id").autoincrement().primaryKey(),
  /** The most recent raw question text from a customer */
  questionText: text("questionText").notNull(),
  /** LLM-normalized version used for deduplication (lowercase, trimmed, canonical form) */
  normalizedText: varchar("normalizedText", { length: 512 }).notNull().unique(),
  /** How many times this question (or a similar one) has been asked */
  count: int("count").default(1).notNull(),
  /** Timestamp of the most recent time this question was asked */
  lastAskedAt: timestamp("lastAskedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EvaQuestion = typeof evaQuestions.$inferSelect;
export type InsertEvaQuestion = typeof evaQuestions.$inferInsert;

/**
 * Item categories for the Items Dashboard.
 * Allows admin to create, rename, and color-code categories.
 * The `slug` matches the category field in menuItems.
 */
export const itemCategories = mysqlTable("itemCategories", {
  id: int("id").autoincrement().primaryKey(),
  /** Display name, e.g. "Pizza" */
  name: varchar("name", { length: 128 }).notNull(),
  /** URL-safe slug matching menuItems.category, e.g. "pizza" */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  /** Optional hex color for UI badges, e.g. "#e53e3e" */
  color: varchar("color", { length: 16 }).default("#6b7280").notNull(),
  /** Display sort order */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ItemCategory = typeof itemCategories.$inferSelect;
export type InsertItemCategory = typeof itemCategories.$inferInsert;
