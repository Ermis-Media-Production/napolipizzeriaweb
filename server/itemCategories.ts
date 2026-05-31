/**
 * Item Categories Router
 * CRUD for admin-managed item categories used in the Items Dashboard.
 * Public: list (for menu display)
 * Admin: create, update, delete, seed defaults
 */

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { itemCategories } from "../drizzle/schema";

async function requireDb() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// Default categories matching napoliData.ts categories
const DEFAULT_CATEGORIES = [
  { name: "Pizza", slug: "pizza", color: "#e53e3e", sortOrder: 0 },
  { name: "Burgers", slug: "burger", color: "#dd6b20", sortOrder: 1 },
  { name: "Pasta", slug: "pasta", color: "#d69e2e", sortOrder: 2 },
  { name: "Salads", slug: "salad", color: "#38a169", sortOrder: 3 },
  { name: "Soups", slug: "soup", color: "#3182ce", sortOrder: 4 },
  { name: "Sandwiches", slug: "sandwich", color: "#805ad5", sortOrder: 5 },
  { name: "Wraps", slug: "wrap", color: "#d53f8c", sortOrder: 6 },
  { name: "Wings", slug: "wings", color: "#e53e3e", sortOrder: 7 },
  { name: "Appetizers", slug: "appetizer", color: "#dd6b20", sortOrder: 8 },
  { name: "Kids Menu", slug: "kids", color: "#3182ce", sortOrder: 9 },
  { name: "Beverages", slug: "beverage", color: "#0bc5ea", sortOrder: 10 },
  { name: "Desserts", slug: "dessert", color: "#b7791f", sortOrder: 11 },
  { name: "Specials", slug: "special", color: "#6b46c1", sortOrder: 12 },
  { name: "Catering", slug: "catering", color: "#2d3748", sortOrder: 13 },
];

export const itemCategoriesRouter = router({
  /**
   * List all categories ordered by sortOrder.
   * Public — used by menu and admin pages.
   */
  list: publicProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select()
      .from(itemCategories)
      .orderBy(asc(itemCategories.sortOrder), asc(itemCategories.name));
  }),

  /**
   * Seed default categories if the table is empty. Admin only.
   */
  seedDefaults: adminProcedure.mutation(async () => {
    const db = await requireDb();
    const existing = await db.select().from(itemCategories).limit(1);
    if (existing.length > 0) {
      return { seeded: false, message: "Categories already exist" };
    }
    await db.insert(itemCategories).values(DEFAULT_CATEGORIES);
    return { seeded: true, message: `Seeded ${DEFAULT_CATEGORIES.length} default categories` };
  }),

  /**
   * Create a new category. Admin only.
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens"),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").default("#6b7280"),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.insert(itemCategories).values({
        name: input.name,
        slug: input.slug,
        color: input.color,
        sortOrder: input.sortOrder,
      });
      const insertId = (result as unknown as { insertId: number }).insertId;
      const [created] = await db
        .select()
        .from(itemCategories)
        .where(eq(itemCategories.id, insertId))
        .limit(1);
      return created;
    }),

  /**
   * Update a category. Admin only.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.slug !== undefined) updateData.slug = fields.slug;
      if (fields.color !== undefined) updateData.color = fields.color;
      if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(itemCategories).set(updateData).where(eq(itemCategories.id, id));
      const [updated] = await db
        .select()
        .from(itemCategories)
        .where(eq(itemCategories.id, id))
        .limit(1);
      return updated;
    }),

  /**
   * Delete a category. Admin only.
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(itemCategories).where(eq(itemCategories.id, input.id));
      return { success: true };
    }),
});
