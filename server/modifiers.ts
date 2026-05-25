/**
 * Modifiers Router
 * CRUD for modifier groups and options, plus assignment to menu items.
 * Public: listGroupsForItem
 * Admin: all create/update/delete/assign operations
 */

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { itemModifierGroups, modifierGroups, modifierOptions } from "../drizzle/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireDb() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// ── Router ───────────────────────────────────────────────────────────────────

export const modifiersRouter = router({
  // ── Modifier Groups ──────────────────────────────────────────────────────

  /**
   * List all modifier groups with their options.
   * Admin only.
   */
  listGroups: adminProcedure.query(async () => {
    const db = await requireDb();
    const groups = await db
      .select()
      .from(modifierGroups)
      .orderBy(asc(modifierGroups.sortOrder), asc(modifierGroups.name));

    const options = await db
      .select()
      .from(modifierOptions)
      .orderBy(asc(modifierOptions.sortOrder), asc(modifierOptions.name));

    return groups.map((g) => ({
      ...g,
      options: options.filter((o) => o.groupId === g.id),
    }));
  }),

  /**
   * Get a single modifier group with its options.
   */
  getGroupById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [group] = await db
        .select()
        .from(modifierGroups)
        .where(eq(modifierGroups.id, input.id))
        .limit(1);

      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Modifier group not found" });

      const options = await db
        .select()
        .from(modifierOptions)
        .where(eq(modifierOptions.groupId, input.id))
        .orderBy(asc(modifierOptions.sortOrder), asc(modifierOptions.name));

      return { ...group, options };
    }),

  /**
   * Create a new modifier group. Admin only.
   */
  createGroup: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        required: z.boolean().default(false),
        minSelect: z.number().min(0).default(0),
        maxSelect: z.number().min(1).default(1),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.insert(modifierGroups).values({
        name: input.name,
        required: input.required,
        minSelect: input.minSelect,
        maxSelect: input.maxSelect,
        sortOrder: input.sortOrder,
      });

      const insertId = (result as unknown as { insertId: number }).insertId;
      const [created] = await db
        .select()
        .from(modifierGroups)
        .where(eq(modifierGroups.id, insertId))
        .limit(1);

      return { ...created, options: [] };
    }),

  /**
   * Update a modifier group. Admin only.
   */
  updateGroup: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        required: z.boolean().optional(),
        minSelect: z.number().min(0).optional(),
        maxSelect: z.number().min(1).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;

      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.required !== undefined) updateData.required = fields.required;
      if (fields.minSelect !== undefined) updateData.minSelect = fields.minSelect;
      if (fields.maxSelect !== undefined) updateData.maxSelect = fields.maxSelect;
      if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(modifierGroups).set(updateData).where(eq(modifierGroups.id, id));

      const [updated] = await db
        .select()
        .from(modifierGroups)
        .where(eq(modifierGroups.id, id))
        .limit(1);

      const options = await db
        .select()
        .from(modifierOptions)
        .where(eq(modifierOptions.groupId, id))
        .orderBy(asc(modifierOptions.sortOrder));

      return { ...updated, options };
    }),

  /**
   * Delete a modifier group and all its options. Admin only.
   */
  deleteGroup: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Remove all options first
      await db.delete(modifierOptions).where(eq(modifierOptions.groupId, input.id));
      // Remove all item assignments
      await db.delete(itemModifierGroups).where(eq(itemModifierGroups.groupId, input.id));
      // Remove the group
      await db.delete(modifierGroups).where(eq(modifierGroups.id, input.id));
      return { success: true };
    }),

  // ── Modifier Options ─────────────────────────────────────────────────────

  /**
   * Create a new option within a modifier group. Admin only.
   */
  createOption: adminProcedure
    .input(
      z.object({
        groupId: z.number(),
        name: z.string().min(1).max(128),
        priceAdjustment: z.number().default(0),
        isDefault: z.boolean().default(false),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.insert(modifierOptions).values({
        groupId: input.groupId,
        name: input.name,
        priceAdjustment: String(input.priceAdjustment),
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
      });

      const insertId = (result as unknown as { insertId: number }).insertId;
      const [created] = await db
        .select()
        .from(modifierOptions)
        .where(eq(modifierOptions.id, insertId))
        .limit(1);

      return created;
    }),

  /**
   * Update a modifier option. Admin only.
   */
  updateOption: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        priceAdjustment: z.number().optional(),
        isDefault: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;

      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.priceAdjustment !== undefined) updateData.priceAdjustment = String(fields.priceAdjustment);
      if (fields.isDefault !== undefined) updateData.isDefault = fields.isDefault;
      if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(modifierOptions).set(updateData).where(eq(modifierOptions.id, id));

      const [updated] = await db
        .select()
        .from(modifierOptions)
        .where(eq(modifierOptions.id, id))
        .limit(1);

      return updated;
    }),

  /**
   * Delete a modifier option. Admin only.
   */
  deleteOption: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(modifierOptions).where(eq(modifierOptions.id, input.id));
      return { success: true };
    }),

  // ── Item ↔ Modifier Group Assignments ────────────────────────────────────

  /**
   * List all modifier groups assigned to a specific menu item.
   * Public — used by the ordering flow.
   */
  listGroupsForItem: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const assignments = await db
        .select()
        .from(itemModifierGroups)
        .where(eq(itemModifierGroups.itemId, input.itemId))
        .orderBy(asc(itemModifierGroups.sortOrder));

      if (assignments.length === 0) return [];

      const groupIds = assignments.map((a) => a.groupId);

      const groups = await db
        .select()
        .from(modifierGroups)
        .orderBy(asc(modifierGroups.sortOrder));

      const options = await db
        .select()
        .from(modifierOptions)
        .orderBy(asc(modifierOptions.sortOrder));

      return groupIds
        .map((gid) => {
          const group = groups.find((g) => g.id === gid);
          if (!group) return null;
          return {
            ...group,
            options: options.filter((o) => o.groupId === gid),
          };
        })
        .filter(Boolean);
    }),

  /**
   * List all menu items that have a specific modifier group assigned.
   * Admin only.
   */
  listItemsForGroup: adminProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const assignments = await db
        .select()
        .from(itemModifierGroups)
        .where(eq(itemModifierGroups.groupId, input.groupId));

      return assignments;
    }),

  /**
   * Assign a modifier group to a menu item. Admin only.
   */
  assignGroupToItem: adminProcedure
    .input(
      z.object({
        itemId: z.number(),
        groupId: z.number(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Check if already assigned
      const [existing] = await db
        .select()
        .from(itemModifierGroups)
        .where(
          and(
            eq(itemModifierGroups.itemId, input.itemId),
            eq(itemModifierGroups.groupId, input.groupId)
          )
        )
        .limit(1);

      if (existing) {
        return existing; // Already assigned, idempotent
      }

      const [result] = await db.insert(itemModifierGroups).values({
        itemId: input.itemId,
        groupId: input.groupId,
        sortOrder: input.sortOrder,
      });

      const insertId = (result as unknown as { insertId: number }).insertId;
      const [created] = await db
        .select()
        .from(itemModifierGroups)
        .where(eq(itemModifierGroups.id, insertId))
        .limit(1);

      return created;
    }),

  /**
   * Unassign a modifier group from a menu item. Admin only.
   */
  unassignGroupFromItem: adminProcedure
    .input(z.object({ itemId: z.number(), groupId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .delete(itemModifierGroups)
        .where(
          and(
            eq(itemModifierGroups.itemId, input.itemId),
            eq(itemModifierGroups.groupId, input.groupId)
          )
        );
      return { success: true };
    }),

  /**
   * Replace all modifier group assignments for a menu item. Admin only.
   * Useful when saving the full list from the UI.
   */
  setGroupsForItem: adminProcedure
    .input(
      z.object({
        itemId: z.number(),
        groupIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Remove all existing assignments
      await db
        .delete(itemModifierGroups)
        .where(eq(itemModifierGroups.itemId, input.itemId));

      // Insert new assignments
      if (input.groupIds.length > 0) {
        await db.insert(itemModifierGroups).values(
          input.groupIds.map((groupId, idx) => ({
            itemId: input.itemId,
            groupId,
            sortOrder: idx,
          }))
        );
      }

      return { success: true };
    }),
});
