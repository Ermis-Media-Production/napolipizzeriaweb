# Clover Order Integration Guide — Napoli Pizzeria
**Generated from live API analysis — June 2026**

---

## Merchant Info

| Field | Value |
|---|---|
| Merchant ID | `MRWSQWMCDSHQ1` |
| API Token | `1f1dc027-8644-7f11-666d-08053fecb46b` |
| Base URL | `https://api.clover.com/v3/merchants/MRWSQWMCDSHQ1` |

---

## Devices (3 registered)

| ID | Product | Serial | Terminal Prefix | Role |
|---|---|---|---|---|
| `1cca370b-f6a2-70ff-2e40-35a38a246183` | Station Duo 2nd Gen | C055UG52262800 | 0 (PRIMARY) | Main POS — used by cashiers |
| `09615cdb-7801-4261-a70d-3bf94816f51a` | Station Duo 2nd Gen | C055UG52262471 | 1 | Secondary POS |
| `22fd5fc9-0d29-29b8-3466-98e504fdb7c3` | Kiosk | C056UG54030297 | 2 | Self-service kiosk |

**For `print_event`:** Clover always routes to `09615CDB78014261A70D3BF94816F51A` regardless of which `deviceRef` we send. This is the device configured as the default print target in Clover's backend.

---

## Printers (4 network printers)

| ID | Name | Model | IP | Use |
|---|---|---|---|---|
| `65QB994H6Z44W` | Pizza | Star TSP100 | 192.168.192.11 | Pizza station |
| `MCWCF8204E7QM` | Food | Star TSP100 | 192.168.192.12 | Hot food station |
| `WBSHK4762NS76` | Pizzeria | TM-U220 | 192.168.192.8 | Desserts & beverages |
| `3G6ZRDPRYV8B6` | Food-Old | TM-U220 | 192.168.192.168 | **RETIRED — do not use** |
| `HKDA65SAH3648` | (local) | MY_LOCAL | — | Local device printer |

---

## Order Types

| ID | Label | Default | Hidden | Use |
|---|---|---|---|---|
| `CYNNEQA3ABD8Y` | Pick up | ✅ Yes | No | Online pickup orders |
| `KKKWXJB30FE6R` | Delivery | No | No | Online delivery orders |
| `ATSAYYBGKK8B0` | Dine In | No | No | Dine-in orders |
| `F3SBCET0T7RVC` | Kiosk - Dine-in | No | Hidden | Kiosk only |
| `G2WKV2T44R9RR` | Kiosk - Takeout | No | Hidden | Kiosk only |

---

## Employees

| ID | Name | Role |
|---|---|---|
| `DW4J35FH3R9B0` | online | ADMIN — used for all web orders |
| `R8E4T1RWDT7FG` | ALISA ALAVERDYAN | ADMIN (owner) |
| `JAQG25TJN781A` | Henys | ADMIN |
| `VFMQP6GS2BQKA` | Hak | MANAGER |
| `A837VAF6PEQQW` | Silvy | EMPLOYEE |
| `WJQA9EKXZVTSG` | Carlos | EMPLOYEE |
| `0BT7H3HZ93RAC` | Pedro | EMPLOYEE |
| `1N8NYKT4V3NVT` | Gabriela | EMPLOYEE |
| `VFBQW5CNJ1Z58` | Alisa | EMPLOYEE |

---

## Tenders (relevant)

| ID | Label | Visible |
|---|---|---|
| `T416DFP49C7BJ` | **Online** | ✅ Yes — use for web orders |
| `5GTBAGS8HWNFR` | Cash | Yes |
| `R04VSZ9DE9B6J` | Credit Card | Yes |
| `JT983Y02Z7JQ0` | External Payment | No |

---

## How to Send a Web Order to Clover (Correct Flow)

### Step 1 — Create the order shell

```http
POST /v3/merchants/{mid}/orders
```

```json
{
  "currency": "USD",
  "title": "Online Pick-Up — John Smith",
  "note": "Customer: John Smith | Phone: 7025551234 | Ref: NPZ-20260603-0001",
  "employee": { "id": "DW4J35FH3R9B0" },
  "orderType": { "id": "CYNNEQA3ABD8Y" },
  "manualTransaction": false,
  "testMode": false
}
```

> **Do NOT set `state`** — Clover will set it automatically. Setting `state: "Open"` has no effect; Clover locks the order after payment regardless.

**Response:** `{ "id": "ABCD1234EFGH5", "state": undefined, ... }`

---

### Step 2 — Add line items via bulk_line_items

```http
POST /v3/merchants/{mid}/orders/{orderId}/bulk_line_items
```

```json
{
  "items": [
    {
      "name": "Hand Tossed 16\" Pizza",
      "price": 1499,
      "unitQty": 1,
      "printerLabel": { "id": "65QB994H6Z44W" },
      "note": "Extra Cheese\nPepperoni"
    },
    {
      "name": "Greek Salad",
      "price": 1400,
      "unitQty": 1,
      "printerLabel": { "id": "MCWCF8204E7QM" }
    }
  ]
}
```

> **Important:** `printerLabel` is accepted by the API but **does NOT appear in line item responses** when using custom items (no catalog ID). This is a Clover limitation — the label is stored internally but not exposed via REST. It still routes correctly to the printer when the device is online.

---

### Step 3 — Apply the payment tender

```http
POST /v3/merchants/{mid}/orders/{orderId}/payments
```

```json
{
  "tender": { "id": "T416DFP49C7BJ" },
  "amount": 1699,
  "tipAmount": 0,
  "externalPaymentId": "AUTH_NET_TRANSACTION_ID"
}
```

> After this step, Clover automatically sets `state: "locked"` on the order. This is normal and expected for externally-paid orders.

---

### Step 4 — Fire the print_event

```http
POST /v3/merchants/{mid}/print_event
```

```json
{
  "orderRef": { "id": "ABCD1234EFGH5" },
  "deviceRef": { "id": "1cca370b-f6a2-70ff-2e40-35a38a246183" }
}
```

> **Note:** Clover ignores the `deviceRef` we send and always routes to `09615CDB78014261A70D3BF94816F51A` (the device configured as the default print target). The `deviceRef` in the response will always be `09615CDB...` regardless of what you send.

**Expected response:**
```json
{
  "id": "PRINT_EVENT_ID",
  "state": "CREATED",
  "orderRef": { "id": "ABCD1234EFGH5" },
  "deviceRef": { "id": "09615CDB78014261A70D3BF94816F51A" }
}
```

---

## Why Orders Are Not Printing — Root Cause Analysis

After live testing against the production API, the following was confirmed:

### Finding 1: `printerLabel` is NOT the printing mechanism

The `printerLabel` field on line items is **not what triggers printing**. POS orders that print successfully also have `printerLabel: undefined` in the API response. The routing to specific kitchen printers is handled **internally by the Clover device app** based on the printer configuration in the Clover dashboard, not by the REST API field.

### Finding 2: `print_event` state stays at "CREATED" — never "DELIVERED"

Every `print_event` we fire returns `state: "CREATED"` and the order's `device` field remains `null`. For POS orders that print, the order has `device: "1cca370b..."` set automatically when a cashier opens it on the POS.

**This means the print_event is being received by Clover's server but NOT delivered to the physical device.**

### Finding 3: The device `09615CDB` (Station Duo #1) may be offline or misconfigured

Clover always routes our print events to device `09615CDB` (terminal prefix 1, serial C055UG52262471). If this device is:
- Powered off
- Not connected to the network
- Missing the "Print Orders" app permission
- Not configured for "Auto-Print" of external orders

...then the print job will be queued but never executed.

### Finding 4: `state: "locked"` is normal, not a problem

All externally-paid orders (web, Slice, Uber Eats) have `state: "locked"`. The Slice app orders also have `state: "locked"` and `device: none`. The locked state does NOT prevent printing — it only prevents editing from the POS screen.

---

## Action Items to Fix Kitchen Printing

### Action 1 (REQUIRED — Physical): Check Station Duo device `09615CDB`

On the Clover Station Duo with serial **C055UG52262471** (terminal prefix 1):

1. Verify it is **powered on** and connected to the network
2. Open the **Order Manager** app → Settings → verify "Auto-Print" is enabled
3. Open **Setup** → **Printers** → verify Pizza, Food, and Pizzeria printers are assigned
4. Check that the device is showing as **online** in the Clover dashboard

### Action 2 (REQUIRED — Clover Dashboard): Enable "Print New Orders" for external orders

In Clover web dashboard → **Setup** → **Order Manager** → **Print Settings**:
- Enable **"Automatically print new orders"**
- Enable **"Print orders from all devices"** (not just local device)
- This setting must be enabled on the device that receives the print_event

### Action 3 (OPTIONAL — Code): Try using device `1cca370b` instead

The PRIMARY Station Duo (`1cca370b`, terminal prefix 0, serial C055UG52262800) is the one cashiers actively use. If it has Auto-Print enabled, try sending `deviceRef` pointing to it. Though Clover currently overrides our deviceRef, this may change if the primary device is configured as the print target.

### Action 4 (OPTIONAL — Code): Remove `state: "Open"` from order creation

Currently our code sends `state: "Open"`. This has no effect (Clover ignores it and sets locked after payment), but removing it makes the payload cleaner and more aligned with Clover's expected behavior for external orders.

---

## Current Code Status (cloverSync.ts)

The current implementation is **structurally correct**:

| Step | Status |
|---|---|
| Create order with correct employee, orderType, note | ✅ Correct |
| `bulk_line_items` with `printerLabel` | ✅ Correct (field accepted, routing internal) |
| Apply tender `T416DFP49C7BJ` (Online) | ✅ Correct |
| Fire `print_event` | ✅ Correct (HTTP 200, state=CREATED) |
| Verify `printed` status after 6s | ✅ Correct |
| Notify owner on print failure | ✅ Correct |

**The code is correct. The issue is a physical/configuration problem on the Clover device, not a code bug.**
