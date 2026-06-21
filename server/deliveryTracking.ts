/**
 * Delivery Tracking Router
 *
 * Provides the admin delivery tracking panel with:
 *  - getActiveDeliveries: list all orders with a dispatched courier
 *  - refreshDeliveryStatus: poll provider API and update DB status
 *  - cancelDelivery: cancel a delivery (before pickup)
 *
 * Supports both DoorDash Drive and Uber Direct.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getActiveDeliveries, updateDeliveryStatus } from "./db";
import { ddRequest } from "./doordash";
import { getUberAccessToken } from "./uberdirect";
import { UBER_ENV } from "./_core/env";
import axios from "axios";

const UBER_API_BASE = "https://api.uber.com/v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDoorDashStatus(externalDeliveryId: string): Promise<{ status: string; trackingUrl?: string; dasher?: { name: string; phone?: string; vehicle?: string } | null }> {
  const data = await ddRequest<{
    status: string;
    tracking_url?: string;
    dasher_name?: string;
    dasher_phone_number_for_customer?: string;
    dasher_vehicle_make?: string;
    dasher_vehicle_model?: string;
    dasher_vehicle_color?: string;
  }>("GET", `/drive/v2/deliveries/${externalDeliveryId}`);

  return {
    status: data.status,
    trackingUrl: data.tracking_url,
    dasher: data.dasher_name
      ? {
          name: data.dasher_name,
          phone: data.dasher_phone_number_for_customer,
          vehicle: [data.dasher_vehicle_color, data.dasher_vehicle_make, data.dasher_vehicle_model]
            .filter(Boolean)
            .join(" "),
        }
      : null,
  };
}

async function getUberStatus(deliveryId: string): Promise<{ status: string; trackingUrl?: string; courier?: { name: string; phone?: string; vehicleType?: string } | null }> {
  const token = await getUberAccessToken();
  const res = await axios.get(
    `${UBER_API_BASE}/customers/${UBER_ENV.customerId}/deliveries/${deliveryId}`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  const d = res.data;
  return {
    status: d.status as string,
    trackingUrl: d.tracking_url as string | undefined,
    courier: d.courier
      ? {
          name: d.courier.name as string,
          phone: d.courier.phone_number as string | undefined,
          vehicleType: d.courier.vehicle_type as string | undefined,
        }
      : null,
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const deliveryTrackingRouter = router({
  /**
   * List all orders that have a dispatched courier (from DB).
   * Includes latest cached status from DB — use refreshDeliveryStatus to update.
   */
  getActiveDeliveries: publicProcedure.query(async () => {
    const rows = await getActiveDeliveries();
    return rows.map((r) => ({
      ...r,
      total: r.total ? String(r.total) : "0.00",
      createdAt: r.createdAt ? r.createdAt.getTime() : Date.now(),
    }));
  }),

  /**
   * Poll the provider API for the latest status of a single delivery and update DB.
   */
  refreshDeliveryStatus: publicProcedure
    .input(z.object({ orderRef: z.string(), provider: z.enum(["doordash", "uber"]), externalId: z.string() }))
    .mutation(async ({ input }) => {
      let status = "unknown";
      let trackingUrl: string | undefined;
      let courier: { name: string; phone?: string; vehicle?: string; vehicleType?: string } | null = null;

      if (input.provider === "doordash") {
        const result = await getDoorDashStatus(input.externalId);
        status = result.status;
        trackingUrl = result.trackingUrl;
        courier = result.dasher ?? null;
      } else {
        const result = await getUberStatus(input.externalId);
        status = result.status;
        trackingUrl = result.trackingUrl;
        courier = result.courier ?? null;
      }

      await updateDeliveryStatus(input.orderRef, status);

      return { status, trackingUrl, courier };
    }),

  /**
   * Cancel a delivery via the provider API.
   */
  cancelDelivery: publicProcedure
    .input(z.object({ provider: z.enum(["doordash", "uber"]), externalId: z.string(), orderRef: z.string() }))
    .mutation(async ({ input }) => {
      if (input.provider === "doordash") {
        await ddRequest("PUT", `/drive/v2/deliveries/${input.externalId}/cancel`);
      } else {
        const token = await getUberAccessToken();
        await axios.post(
          `${UBER_API_BASE}/customers/${UBER_ENV.customerId}/deliveries/${input.externalId}/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
      }

      await updateDeliveryStatus(input.orderRef, "cancelled");
      return { success: true };
    }),
});
