/**
 * Menu Items Router
 * Full CRUD for admin-managed menu items with S3 photo upload.
 * Public: listMenuItems, getMenuItemsByCategory
 * Admin: createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuItemPhoto
 */

import { and, asc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { menuItems } from "../drizzle/schema";
import { storagePut } from "./storage";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireDb() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// Valid print labels
const PRINT_LABELS = ["Food", "Pizza", "Pizzeria", "Bar/Drinks"] as const;

// Valid categories
const CATEGORIES = [
  "pizza",
  "burger",
  "pasta",
  "salad",
  "soup",
  "sandwich",
  "wrap",
  "wings",
  "appetizer",
  "kids",
  "beverage",
  "dessert",
  "special",
  "catering",
] as const;

// ── Router ───────────────────────────────────────────────────────────────────

export const menuItemsRouter = router({
  /**
   * List all menu items, optionally filtered by category.
   * Public — used by the menu page.
   */
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        includeUnavailable: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input.category) {
        conditions.push(eq(menuItems.category, input.category));
      }
      if (!input.includeUnavailable) {
        conditions.push(eq(menuItems.isAvailable, true));
      }

      const rows =
        conditions.length > 0
          ? await db
              .select()
              .from(menuItems)
              .where(and(...conditions))
              .orderBy(asc(menuItems.sortOrder), asc(menuItems.name))
          : await db
              .select()
              .from(menuItems)
              .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));

      return rows;
    }),

  /**
   * Get a single menu item by ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, input.id))
        .limit(1);

      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });
      return item;
    }),

  /**
   * Resolve Clover catalog IDs for a batch of items by fuzzy name + category match.
   * Used by wizard modals (Pizza, Wings, Burgers, etc.) to attach the correct
   * cloverItemId to cart items so kitchen printer routing works correctly.
   *
   * Strategy: for each requested item, find the DB row whose name CONTAINS the
   * requested name (or vice-versa) in the given category, and return its cloverItemId.
   */
  resolveCloverIds: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            name: z.string(),
            category: z.string().optional(),
          })
        ),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const results: Record<string, string | null> = {};

      for (const req of input.items) {
        const nameLower = req.name.toLowerCase();
        const conditions = [
          or(
            like(menuItems.name, `%${req.name}%`),
            like(menuItems.name, `${req.name}%`)
          ),
        ];
        if (req.category) {
          conditions.push(eq(menuItems.category, req.category));
        }

        const rows = await db
          .select({ name: menuItems.name, cloverItemId: menuItems.cloverItemId, category: menuItems.category })
          .from(menuItems)
          .where(and(...conditions))
          .orderBy(asc(menuItems.sortOrder), asc(menuItems.name))
          .limit(10);

        // Pick the best match: prefer exact name match, then shortest name (most specific)
        let best: { name: string; cloverItemId: string | null; category: string } | null = null;
        for (const row of rows) {
          const rowLower = row.name.toLowerCase();
          if (rowLower === nameLower) {
            best = row;
            break;
          }
          if (!best || row.name.length < best.name.length) {
            best = row;
          }
        }

        results[req.name] = best?.cloverItemId ?? null;
      }

      return results;
    }),

  /**
   * Create a new menu item. Admin only.
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        category: z.string().min(1).max(64),
        description: z.string().optional(),
        price: z.number().min(0),
        price2: z.number().min(0).optional(),
        price2Label: z.string().max(64).optional(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        printLabel: z.enum(PRINT_LABELS).default("Food"),
        isAvailable: z.boolean().default(true),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.insert(menuItems).values({
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        price: String(input.price),
        price2: input.price2 != null ? String(input.price2) : null,
        price2Label: input.price2Label ?? null,
        imageUrl: input.imageUrl ?? null,
        imageKey: input.imageKey ?? null,
        printLabel: input.printLabel,
        isAvailable: input.isAvailable,
        sortOrder: input.sortOrder,
      });

      const insertId = (result as unknown as { insertId: number }).insertId;
      const [created] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, insertId))
        .limit(1);

      return created;
    }),

  /**
   * Update an existing menu item. Admin only.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        category: z.string().min(1).max(64).optional(),
        description: z.string().nullable().optional(),
        price: z.number().min(0).optional(),
        price2: z.number().min(0).nullable().optional(),
        price2Label: z.string().max(64).nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        imageKey: z.string().nullable().optional(),
        printLabel: z.enum(PRINT_LABELS).optional(),
        isAvailable: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = {};

      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.category !== undefined) updateData.category = fields.category;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.price !== undefined) updateData.price = String(fields.price);
      if (fields.price2 !== undefined) updateData.price2 = fields.price2 != null ? String(fields.price2) : null;
      if (fields.price2Label !== undefined) updateData.price2Label = fields.price2Label;
      if (fields.imageUrl !== undefined) updateData.imageUrl = fields.imageUrl;
      if (fields.imageKey !== undefined) updateData.imageKey = fields.imageKey;
      if (fields.printLabel !== undefined) updateData.printLabel = fields.printLabel;
      if (fields.isAvailable !== undefined) updateData.isAvailable = fields.isAvailable;
      if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(menuItems).set(updateData).where(eq(menuItems.id, id));

      const [updated] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      return updated;
    }),

  /**
   * Delete a menu item. Admin only.
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(menuItems).where(eq(menuItems.id, input.id));
      return { success: true };
    }),

  /**
   * Upload a photo for a menu item.
   * Accepts base64-encoded image data and stores it in S3.
   * Admin only.
   */
  uploadPhoto: adminProcedure
    .input(
      z.object({
        itemId: z.number(),
        /** Base64-encoded image data (without data: prefix) */
        base64Data: z.string(),
        /** MIME type of the image, e.g. "image/jpeg" */
        mimeType: z.string().default("image/jpeg"),
        /** Original filename for key generation */
        filename: z.string().default("photo.jpg"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Decode base64 to buffer
      const buffer = Buffer.from(input.base64Data, "base64");
      const ext = input.filename.split(".").pop() ?? "jpg";
      const key = `menu-items/${input.itemId}-${Date.now()}.${ext}`;

      const { url } = await storagePut(key, buffer, input.mimeType);

      // Update the item's imageUrl and imageKey
      await db
        .update(menuItems)
        .set({ imageUrl: url, imageKey: key })
        .where(eq(menuItems.id, input.itemId));

      return { url, key };
    }),

  /**
   * Toggle availability of a menu item. Admin only.
   */
  toggleAvailability: adminProcedure
    .input(z.object({ id: z.number(), isAvailable: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(menuItems)
        .set({ isAvailable: input.isAvailable })
        .where(eq(menuItems.id, input.id));
      return { success: true };
    }),

  /**
   * Bulk update category and/or printLabel for multiple items at once. Admin only.
   */
  bulkUpdate: adminProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1),
        category: z.string().min(1).max(64).optional(),
        printLabel: z.enum(PRINT_LABELS).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!input.category && !input.printLabel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provide at least one field to update" });
      }
      const updateData: Record<string, unknown> = {};
      if (input.category) updateData.category = input.category;
      if (input.printLabel) updateData.printLabel = input.printLabel;

      // Update each item individually (MySQL doesn't support WHERE id IN with Drizzle easily)
      await Promise.all(
        input.ids.map((id) =>
          db.update(menuItems).set(updateData).where(eq(menuItems.id, id))
        )
      );
      return { updated: input.ids.length };
    }),

  /**
   * Reorder items within a category. Admin only.
   * Accepts an array of { id, sortOrder } pairs.
   */
  reorder: adminProcedure
    .input(
      z.array(z.object({ id: z.number(), sortOrder: z.number() }))
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await Promise.all(
        input.map(({ id, sortOrder }) =>
          db.update(menuItems).set({ sortOrder }).where(eq(menuItems.id, id))
        )
      );
      return { success: true };
    }),
});
