import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
