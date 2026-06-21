import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, isNotNull } from "drizzle-orm";
import { InsertUser, users, processedWebhookEvents, scheduledOrders } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Check if a webhook event has already been processed (idempotency guard).
 * Returns true if the event was newly recorded (first time seen),
 * false if it was already processed (duplicate/replay).
 */
export async function markWebhookEventProcessed(eventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    // If DB is unavailable, allow processing (fail-open) to avoid blocking payments
    console.warn("[Database] Cannot check webhook idempotency: database not available");
    return true;
  }

  try {
    await db.insert(processedWebhookEvents).values({ eventId });
    return true; // newly inserted → first time seen
  } catch {
    // Duplicate key error → event already processed
    return false;
  }
}

// TODO: add feature queries here as your schema grows.

/** Persist delivery provider info after dispatching a courier. */
export async function updateDeliveryInfo(
  orderRef: string,
  info: {
    deliveryProvider: "doordash" | "uber";
    deliveryExternalId: string;
    deliveryTrackingUrl: string;
    deliveryStatus: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update delivery info: database not available");
    return;
  }
  await db
    .update(scheduledOrders)
    .set({
      deliveryProvider: info.deliveryProvider,
      deliveryExternalId: info.deliveryExternalId,
      deliveryTrackingUrl: info.deliveryTrackingUrl,
      deliveryStatus: info.deliveryStatus,
    })
    .where(eq(scheduledOrders.orderRef, orderRef));
}

/** Update delivery status for a single order. */
export async function updateDeliveryStatus(
  orderRef: string,
  status: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(scheduledOrders)
    .set({ deliveryStatus: status })
    .where(eq(scheduledOrders.orderRef, orderRef));
}

/** Get all active delivery orders (have a deliveryExternalId and not completed/cancelled). */
export async function getActiveDeliveries() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: scheduledOrders.id,
      orderRef: scheduledOrders.orderRef,
      customerName: scheduledOrders.customerName,
      customerPhone: scheduledOrders.customerPhone,
      deliveryAddress: scheduledOrders.deliveryAddress,
      deliveryProvider: scheduledOrders.deliveryProvider,
      deliveryExternalId: scheduledOrders.deliveryExternalId,
      deliveryTrackingUrl: scheduledOrders.deliveryTrackingUrl,
      deliveryStatus: scheduledOrders.deliveryStatus,
      total: scheduledOrders.total,
      createdAt: scheduledOrders.createdAt,
    })
    .from(scheduledOrders)
    .where(
      and(
        isNotNull(scheduledOrders.deliveryExternalId),
        eq(scheduledOrders.orderType, "delivery")
      )
    )
    .orderBy(scheduledOrders.createdAt);
  return rows;
}


