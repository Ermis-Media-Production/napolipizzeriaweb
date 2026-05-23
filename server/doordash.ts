/**
 * DoorDash Drive router
 * Handles delivery quotes, creation, tracking, and cancellation via DoorDash Drive API.
 * Authentication: JWT signed with HS256 using the signing_secret from developer portal.
 */
import { z } from "zod";
import { SignJWT } from "jose";
import { publicProcedure, router } from "./_core/trpc";
import { DOORDASH_ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

// ── JWT generation ─────────────────────────────────────────────────────────────

async function generateDoorDashJWT(): Promise<string> {
  const { developerId, keyId, signingSecret } = DOORDASH_ENV;

  if (!developerId || !keyId || !signingSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DoorDash credentials not configured",
    });
  }

  const now = Math.floor(Date.now() / 1000);

  // DoorDash requires the signing secret to be base64url-decoded
  const secretBytes = Buffer.from(signingSecret, "base64url");

  const token = await new SignJWT({
    aud: "doordash",
    iss: developerId,
    kid: keyId,
    exp: now + 300, // 5 minutes
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256", dd_ver: "DD-JWT-V1" })
    .sign(secretBytes);

  return token;
}

// ── Shared request helper ──────────────────────────────────────────────────────

async function ddRequest<T>(
  method: "GET" | "POST" | "PATCH" | "PUT",
  path: string,
  body?: unknown
): Promise<T> {
  const jwt = await generateDoorDashJWT();
  const url = `${DOORDASH_ENV.baseUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: (data as { message?: string }).message ?? `DoorDash error ${res.status}`,
    });
  }

  return data as T;
}

// ── Restaurant pickup address ─────────────────────────────────────────────────

const RESTAURANT_PICKUP = {
  address: "3640 N 5th St, North Las Vegas, NV 89032",
  businessName: "Napoli Pizzeria",
  phoneNumber: "+17252040379",
  instructions: "Pick up at the front counter",
};

// ── Zod schemas ───────────────────────────────────────────────────────────────

const DeliveryItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  description: z.string().optional(),
  price: z.number().int().nonnegative(), // cents
  external_id: z.string().optional(),
});

const QuoteInputSchema = z.object({
  externalDeliveryId: z.string(),
  dropoffAddress: z.string(),
  dropoffContactName: z.string(),
  dropoffPhone: z.string(),
  orderValue: z.number().int().nonnegative(), // cents
  items: z.array(DeliveryItemSchema).optional(),
});

const CreateDeliveryInputSchema = z.object({
  externalDeliveryId: z.string(),
  dropoffAddress: z.string(),
  dropoffContactGivenName: z.string(),
  dropoffContactFamilyName: z.string().optional(),
  dropoffPhone: z.string(),
  dropoffInstructions: z.string().optional(),
  orderValue: z.number().int().nonnegative(), // cents
  tip: z.number().int().nonnegative().optional(), // cents
  items: z.array(DeliveryItemSchema).optional(),
  contactlessDropoff: z.boolean().optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const doordashRouter = router({
  /**
   * Get a delivery quote (fee + ETA) before committing to a delivery.
   */
  getQuote: publicProcedure
    .input(QuoteInputSchema)
    .mutation(async ({ input }) => {
      const data = await ddRequest<{
        external_delivery_id: string;
        fee: number;
        currency: string;
        pickup_time_estimated: string;
        dropoff_time_estimated: string;
        duration: number;
      }>("POST", "/drive/v2/quotes", {
        external_delivery_id: input.externalDeliveryId,
        locale: "en-US",
        pickup_address: RESTAURANT_PICKUP.address,
        pickup_business_name: RESTAURANT_PICKUP.businessName,
        pickup_phone_number: RESTAURANT_PICKUP.phoneNumber,
        pickup_instructions: RESTAURANT_PICKUP.instructions,
        dropoff_address: input.dropoffAddress,
        dropoff_phone_number: input.dropoffPhone,
        dropoff_contact_given_name: input.dropoffContactName,
        order_value: input.orderValue,
        items: input.items?.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          description: item.description ?? "",
          price: item.price,
          external_id: item.external_id ?? item.name,
        })),
      });

      return {
        externalDeliveryId: data.external_delivery_id,
        fee: data.fee, // cents
        feeDollars: (data.fee / 100).toFixed(2),
        currency: data.currency ?? "USD",
        pickupTimeEstimated: data.pickup_time_estimated,
        dropoffTimeEstimated: data.dropoff_time_estimated,
        durationMinutes: data.duration,
      };
    }),

  /**
   * Create a delivery (dispatches a Dasher).
   */
  createDelivery: publicProcedure
    .input(CreateDeliveryInputSchema)
    .mutation(async ({ input }) => {
      const data = await ddRequest<{
        external_delivery_id: string;
        delivery_id: string;
        fee: number;
        currency: string;
        pickup_time_estimated: string;
        dropoff_time_estimated: string;
        tracking_url: string;
        dasher_name?: string;
        dasher_phone_number_for_customer?: string;
        dasher_vehicle_make?: string;
        dasher_vehicle_model?: string;
        dasher_vehicle_color?: string;
        status: string;
      }>("POST", "/drive/v2/deliveries", {
        external_delivery_id: input.externalDeliveryId,
        locale: "en-US",
        pickup_address: RESTAURANT_PICKUP.address,
        pickup_business_name: RESTAURANT_PICKUP.businessName,
        pickup_phone_number: RESTAURANT_PICKUP.phoneNumber,
        pickup_instructions: RESTAURANT_PICKUP.instructions,
        dropoff_address: input.dropoffAddress,
        dropoff_phone_number: input.dropoffPhone,
        dropoff_contact_given_name: input.dropoffContactGivenName,
        dropoff_contact_family_name: input.dropoffContactFamilyName ?? "",
        dropoff_instructions: input.dropoffInstructions ?? "",
        order_value: input.orderValue,
        tip: input.tip ?? 0,
        contactless_dropoff: input.contactlessDropoff ?? false,
        items: input.items?.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          description: item.description ?? "",
          price: item.price,
          external_id: item.external_id ?? item.name,
        })),
      });

      return {
        externalDeliveryId: data.external_delivery_id,
        deliveryId: data.delivery_id,
        fee: data.fee,
        feeDollars: (data.fee / 100).toFixed(2),
        currency: data.currency ?? "USD",
        status: data.status,
        trackingUrl: data.tracking_url,
        pickupTimeEstimated: data.pickup_time_estimated,
        dropoffTimeEstimated: data.dropoff_time_estimated,
        dasher: data.dasher_name
          ? {
              name: data.dasher_name,
              phone: data.dasher_phone_number_for_customer,
              vehicle: [
                data.dasher_vehicle_color,
                data.dasher_vehicle_make,
                data.dasher_vehicle_model,
              ]
                .filter(Boolean)
                .join(" "),
            }
          : null,
      };
    }),

  /**
   * Get the current status and tracking info for a delivery.
   */
  getDelivery: publicProcedure
    .input(z.object({ externalDeliveryId: z.string() }))
    .query(async ({ input }) => {
      const data = await ddRequest<{
        external_delivery_id: string;
        delivery_id: string;
        status: string;
        tracking_url: string;
        fee: number;
        pickup_time_estimated: string;
        dropoff_time_estimated: string;
        dasher_name?: string;
        dasher_phone_number_for_customer?: string;
        dasher_vehicle_make?: string;
        dasher_vehicle_model?: string;
        dasher_vehicle_color?: string;
        dasher_location?: { lat: number; lng: number };
      }>("GET", `/drive/v2/deliveries/${input.externalDeliveryId}`);

      return {
        externalDeliveryId: data.external_delivery_id,
        deliveryId: data.delivery_id,
        status: data.status,
        trackingUrl: data.tracking_url,
        fee: data.fee,
        feeDollars: (data.fee / 100).toFixed(2),
        pickupTimeEstimated: data.pickup_time_estimated,
        dropoffTimeEstimated: data.dropoff_time_estimated,
        dasher: data.dasher_name
          ? {
              name: data.dasher_name,
              phone: data.dasher_phone_number_for_customer,
              vehicle: [
                data.dasher_vehicle_color,
                data.dasher_vehicle_make,
                data.dasher_vehicle_model,
              ]
                .filter(Boolean)
                .join(" "),
              location: data.dasher_location ?? null,
            }
          : null,
      };
    }),

  /**
   * Cancel a delivery.
   */
  cancelDelivery: publicProcedure
    .input(z.object({ externalDeliveryId: z.string() }))
    .mutation(async ({ input }) => {
      await ddRequest("PUT", `/drive/v2/deliveries/${input.externalDeliveryId}/cancel`);
      return { success: true };
    }),
});
