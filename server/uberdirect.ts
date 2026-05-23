/**
 * Uber Direct Integration — Napoli Pizzeria
 *
 * Flow:
 *  1. getQuote  — estimate delivery fee & ETA for a given dropoff address
 *  2. createDelivery — dispatch a real courier after payment is confirmed
 *  3. getDelivery — poll delivery status + tracking URL
 *  4. cancelDelivery — cancel before courier picks up
 *
 * Auth: OAuth2 client_credentials, token cached in memory for 30 days.
 * Docs: https://developer.uber.com/docs/deliveries
 */

import axios from "axios";
import { z } from "zod";
import { UBER_ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";

// ─── Constants ───────────────────────────────────────────────────────────────

const UBER_AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const UBER_API_BASE = "https://api.uber.com/v1";

// Napoli Pizzeria pickup address (hardcoded — always the same origin)
const PICKUP = {
  address: JSON.stringify({
    street_address: ["3131 W Craig Rd"],
    city: "North Las Vegas",
    state: "NV",
    zip_code: "89032",
    country: "US",
  }),
  name: "The Original Napoli Pizzeria",
  phone_number: "+17252040379",
  latitude: 36.2627,
  longitude: -115.1978,
  notes: "Restaurant entrance on W Craig Rd side",
};

// ─── Token cache ─────────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

/** Test-only helper — resets the in-memory token cache so tests always fetch a fresh token. */
export function _resetTokenCache() {
  _cachedToken = null;
  _tokenExpiresAt = 0;
}

export async function getUberAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt - 60_000) {
    return _cachedToken;
  }

  const params = new URLSearchParams({
    client_id: UBER_ENV.clientId,
    client_secret: UBER_ENV.clientSecret,
    grant_type: "client_credentials",
    scope: "eats.deliveries",
  });

  const res = await axios.post(UBER_AUTH_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  _cachedToken = res.data.access_token as string;
  _tokenExpiresAt = now + (res.data.expires_in as number) * 1000;
  return _cachedToken;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uberApi() {
  return `${UBER_API_BASE}/customers/${UBER_ENV.customerId}`;
}

async function uberHeaders() {
  const token = await getUberAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const uberDirectRouter = router({
  /**
   * Get a delivery quote — returns fee (cents), ETA, and quote_id.
   * Call this before showing the delivery option to the customer.
   */
  getQuote: publicProcedure
    .input(
      z.object({
        dropoffAddress: z.string().min(5),
        dropoffCity: z.string().default("North Las Vegas"),
        dropoffState: z.string().default("NV"),
        dropoffZip: z.string().default("89032"),
      })
    )
    .mutation(async ({ input }) => {
      const headers = await uberHeaders();

      const body = {
        pickup_address: PICKUP.address,
        dropoff_address: JSON.stringify({
          street_address: [input.dropoffAddress],
          city: input.dropoffCity,
          state: input.dropoffState,
          zip_code: input.dropoffZip,
          country: "US",
        }),
      };

      const res = await axios.post(`${uberApi()}/delivery_quotes`, body, {
        headers,
      });

      return {
        quoteId: res.data.id as string,
        fee: res.data.fee as number, // in cents
        currency: (res.data.currency as string) ?? "usd",
        dropoffEta: res.data.dropoff_eta as string,
        duration: res.data.duration as number, // minutes
        pickupDuration: res.data.pickup_duration as number,
        expires: res.data.expires as string,
      };
    }),

  /**
   * Create a real delivery after payment is confirmed.
   * Returns delivery ID, status, and tracking URL.
   */
  createDelivery: publicProcedure
    .input(
      z.object({
        quoteId: z.string(),
        dropoffAddress: z.string(),
        dropoffCity: z.string().default("North Las Vegas"),
        dropoffState: z.string().default("NV"),
        dropoffZip: z.string().default("89032"),
        dropoffName: z.string(),
        dropoffPhone: z.string(),
        dropoffNotes: z.string().optional(),
        orderItems: z.array(
          z.object({
            name: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
        externalId: z.string().optional(), // your order ID for reference
      })
    )
    .mutation(async ({ input }) => {
      const headers = await uberHeaders();

      const manifestItems = input.orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        size: "small" as const,
      }));

      const body = {
        quote_id: input.quoteId,
        pickup_address: PICKUP.address,
        pickup_name: PICKUP.name,
        pickup_phone_number: PICKUP.phone_number,
        pickup_latitude: PICKUP.latitude,
        pickup_longitude: PICKUP.longitude,
        pickup_notes: PICKUP.notes,
        dropoff_address: JSON.stringify({
          street_address: [input.dropoffAddress],
          city: input.dropoffCity,
          state: input.dropoffState,
          zip_code: input.dropoffZip,
          country: "US",
        }),
        dropoff_name: input.dropoffName,
        dropoff_phone_number: input.dropoffPhone,
        dropoff_notes: input.dropoffNotes ?? "",
        manifest_items: manifestItems,
        manifest_reference: input.externalId ?? "",
        external_id: input.externalId ?? "",
      };

      const res = await axios.post(`${uberApi()}/deliveries`, body, {
        headers,
      });

      return {
        deliveryId: res.data.id as string,
        status: res.data.status as string,
        trackingUrl: res.data.tracking_url as string,
        fee: res.data.fee as number,
        currency: (res.data.currency as string) ?? "usd",
        pickupEta: res.data.pickup_eta as string,
        dropoffEta: res.data.dropoff_eta as string,
        liveMode: res.data.live_mode as boolean,
      };
    }),

  /**
   * Get current delivery status + courier info + tracking URL.
   */
  getDelivery: publicProcedure
    .input(z.object({ deliveryId: z.string() }))
    .query(async ({ input }) => {
      const headers = await uberHeaders();

      const res = await axios.get(
        `${uberApi()}/deliveries/${input.deliveryId}`,
        { headers }
      );

      const d = res.data;
      return {
        deliveryId: d.id as string,
        status: d.status as string,
        complete: d.complete as boolean,
        trackingUrl: d.tracking_url as string,
        fee: d.fee as number,
        pickupEta: d.pickup_eta as string | null,
        dropoffEta: d.dropoff_eta as string | null,
        courier: d.courier
          ? {
              name: d.courier.name as string,
              rating: d.courier.rating as number,
              vehicleType: d.courier.vehicle_type as string,
              imgHref: d.courier.img_href as string | null,
              phone: d.courier.phone_number as string | null,
            }
          : null,
        liveMode: d.live_mode as boolean,
      };
    }),

  /**
   * Cancel a delivery (only possible before courier picks up).
   */
  cancelDelivery: publicProcedure
    .input(z.object({ deliveryId: z.string() }))
    .mutation(async ({ input }) => {
      const headers = await uberHeaders();

      await axios.post(
        `${uberApi()}/deliveries/${input.deliveryId}/cancel`,
        {},
        { headers }
      );

      return { success: true, deliveryId: input.deliveryId };
    }),
});
