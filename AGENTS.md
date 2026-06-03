# AGENTS.md — Napoli Pizzeria Project Rules

This file defines **mandatory architectural rules** for all future development on this project.
These rules were discovered through real-world integration work and **must be followed even when making purely aesthetic or design changes**.

---

## 🔴 RULE 1 — Every cart item MUST carry `cloverItemId`

**Why:** The `cloverItemId` is the only way Clover POS can route an item to the correct kitchen printer. Without it, orders appear in Clover but may not print in the kitchen.

**How it works:**
- The DB table `menuItems` has a `cloverItemId` column populated by the Clover sync (`/admin/items → Sync from Clover`).
- Every wizard modal (Pizza, Wings, Burgers, Subs, Wraps, etc.) must resolve the `cloverItemId` **before** calling `addItem()`.
- Use the tRPC procedure `menuItems.resolveCloverIds` with a fuzzy LIKE search by name + category.
- The resolution is **non-blocking** — if it fails (network timeout, item not found), the order still goes through. But the attempt must always be made.

**Pattern to follow in every wizard `handleAddToCart`:**
```ts
// Always make this async
const handleAddToCart = async () => {
  let cloverItemId: string | undefined;
  try {
    const results = await utils.client.menuItems.resolveCloverIds.query({
      items: [{ name: itemName, category: "pizza" }], // use correct category slug
    });
    cloverItemId = (results[0] as { cloverItemId?: string })?.cloverItemId ?? undefined;
  } catch {
    // Non-blocking — order still goes through without cloverItemId
  }

  addItem({
    id: `...-${Date.now()}`,
    name: itemName,
    price: totalPrice,
    quantity: 1,
    category: "...",
    description: "...",
    cloverItemId,  // ← ALWAYS include this field
  });
};
```

**For Wings specifically** — the DB has only 3 items with stable IDs. Use the hardcoded map:
```ts
const WINGS_CLOVER_IDS: Record<string, string> = {
  "Bone-In":          "KQXZYE71T0EME",
  "Boneless":         "5Y7Y3AQ23XFPG",
  "Chicken Fingers":  "R71JXR9M68JNJ",
};
```

**Category slugs used in the DB:**
- `pizza` — all pizza items
- `wings` — Wings, Boneless Wings, Tenders
- `burger` — all burger items (named as "1/2 Bacon Burger", "Full pound Bacon Burger", etc.)
- `sandwich` — all subs, wraps, triple deckers
- `appetizer` — appetizers
- `salad` — salads
- `pasta` — pasta dishes
- `special` — Anytime Specials (#1–#19) and Lunch Specials

---

## 🔴 RULE 2 — Burger DB naming convention

Burgers in the DB are named with a size prefix:
- `"1/2 Bacon Burger"` → half pound
- `"Full pound Bacon Burger"` → full pound

When resolving `cloverItemId` for a burger, construct the search name as:
- Half pound: `"1/2 ${burgerName}"` (e.g., `"1/2 Bacon Burger"`)
- Full pound: `"Full pound ${burgerName}"` (e.g., `"Full pound Bacon Burger"`)

---

## 🔴 RULE 3 — Pizza DB naming convention

Pizza items in the DB are named as `"{PizzaName} {Size}" Pizza"`:
- `"BBQ Chicken 16\" Pizza"`
- `"Buffalo Chicken 10\" Pizza"`

When resolving `cloverItemId` for a pizza, search with `"${pizzaName} ${size}"` in category `"pizza"`.

---

## 🔴 RULE 4 — Sandwich/Sub DB naming convention

Sub items in the DB include the side in the name:
- `"Hot Pastrami + salad"`
- `"Triple Decker Chicken And Bacon + salad"`

Use a LIKE search with just the base name (e.g., `"Hot Pastrami"`) — `resolveCloverIds` does fuzzy matching.

---

## 🔴 RULE 5 — Kitchen printer routing uses `getPrinterLabel()`

The function `getPrinterLabel(itemName, category)` in `server/cloverSync.ts` routes items to the correct printer based on keywords in the item name and category. This is separate from `cloverItemId`.

- `cloverItemId` = identifies the item in Clover's catalog
- `getPrinterLabel()` = determines which physical printer receives the ticket

Both must be correct for the order to print in the right kitchen station.

**Current printer label routing:**
- `"pizza"` category → Pizza printer
- `"wings"` category → Wings/Food printer
- `"burger"` category → Food printer
- `"sandwich"` category → Food printer
- `"appetizer"` category → Kitchen printer
- `"salad"` category → Kitchen printer
- `"pasta"` category → Kitchen printer
- `"special"` category → Kitchen printer (Anytime Specials) or Food printer (Lunch Specials)

---

## 🟡 RULE 6 — Wizard modals are the source of truth for menu categories

The menu is organized into interactive wizards, not flat item lists. When redesigning a category:

| Category | Wizard Modal | Entry point in Menu.tsx |
|---|---|---|
| Pizza | `PizzaCustomizerModal` | Single "Build My Pizza" banner + specialty shortcuts |
| Wings | `WingsCustomizerModal` | 3 cards: Wings / Boneless Wings / Tenders |
| Burgers | `BurgerCustomizerModal` | One card per burger type (no size duplication) |
| Subs/Sandwiches | `SubsCustomizerModal` | One card per sub type |
| Wraps | `WrapCustomizerModal` | One card per wrap type |
| Gluten Free Pizza | `GlutenFreePizzaModal` | Separate shortcut in pizza section |
| Appetizers | `AppetizersCustomizerModal` | Per item (only for items in `APPETIZER_MODAL_ITEMS`) |
| Salads | `SaladsCustomizerModal` | Per item (only for items in `SALAD_MODAL_ITEMS`) |
| Pasta | `PastaCustomizerModal` | Per item (only for items in `PASTA_MODAL_ITEMS`) |
| Specials | `SpecialCustomizerModal` | Per item (Anytime Specials #1–#19) |
| Lunch Specials | `LunchCustomizerModal` | Per item (items in `LUNCH_NEEDS_CUSTOMIZER` set) |

**Never replace a wizard with a direct `addItem()` call** — the wizard collects customization data that appears on the kitchen ticket.

---

## 🟡 RULE 7 — Pizza wizard step order (5 steps)

1. **Pizza type** — Plain Cheese, 4 Topping Combo, or any of 17 specialty pizzas
2. **Size** — 10" to 36" with live price update
3. **Whole or Half & Half** — only shown for pizzas with 2+ included toppings
4. **Extra toppings** — included toppings shown as fixed green chips; extras charged by size
5. **Cut style** — Triangle, Square, Strips, Uncut + special notes

---

## 🟡 RULE 8 — Wings wizard step order (3 steps)

1. **Type + Quantity** — Wings / Boneless / Tenders; 6pc / 10pc / 20pc / 30pc / 50pc / 100pc
2. **One flavor or Half & Half** — Half & Half only available for 10pc+
3. **Flavor selector + add-ons** — grouped by Heat Level / Specialty / Dry Rub; Fries optional; Ranch 2oz/6oz

---

## 🟡 RULE 9 — Burger wizard step order (7 steps)

1. **Burger type** — one of the named burgers (Hamburger, Cheese Burger, Bacon Burger, etc.)
2. **Size** — ½ lb ($11.49–$13.49) or Full lb ($14.49–$16.49)
3. **Doneness** — Rare / Medium Rare / Medium / Medium Well / Well Done
4. **Bread** — Regular / Brioche / Gluten Free
5. **Remove items** — No Onion / No Pickles / No Mustard / No Jalapeño / No Mayo / No Lettuce / No Tomato
6. **Sauces** — Ketchup, Mustard, Mayo, BBQ, Ranch, Chipotle, Sriracha, 1000 Island, Blue Cheese
7. **Extras + Allergy Note** — Cheese +$1 / Bacon +$1 / Avocado +$1 / Fries; allergy note with legal disclaimer

---

## 🟡 RULE 10 — Allergen legal disclaimer

Every wizard that handles food must show an allergen note in the final step. The note must state:
> "If you have a food allergy, please note it above. By placing this order without disclosing an allergy, you acknowledge that Napoli Pizzeria is not liable for allergic reactions."

The full Terms & Conditions are at `/terms`. The footer also contains an `ALLERGEN NOTICE` bar linking to `/terms`.

---

## 🟡 RULE 11 — Clover sync must be run after any menu change

After adding, removing, or renaming items in Clover POS, always run:
1. Go to `/admin/items`
2. Click **"Sync from Clover"**
3. This repopulates the `menuItems` table with fresh `cloverItemId` values

Without this sync, the `resolveCloverIds` queries will return no matches and orders will be sent to Clover without item IDs.

---

## 🟡 RULE 12 — Store hours and Force Open

- Normal store hours: **10:00 AM – 10:00 PM** (configured in `server/scheduledOrders.ts`)
- Force Open override: available in Admin Settings panel — use only for testing
- The midnight-force-open-reset cron job has been **permanently deleted** (task UID `mMd38AwNrVSpQoLhTZKi59`)
- Do NOT re-create a midnight reset cron job

---

## 🟡 RULE 13 — Payment flow

- **Only Stripe** is used for online payments (Authorize.net and Clover checkout have been removed from the customer-facing flow)
- Stripe uses the **embedded Payment Element** (no redirect) — `createPaymentIntent` → `payment_intent.succeeded` webhook → `scheduledOrders` row created
- The Stripe webhook URL is: `https://tradevault-brxvwswy.manus.space/api/stripe/webhook`
- Convenience fee: 3% (configurable in Admin Settings)
- Sales tax: 8.375% (Nevada)
- Delivery fee: starting at $1.99 (Uber Direct quote)
- Credit card fee: $1.00

---

## 🟡 RULE 14 — Database schema notes

Key tables:
- `menuItems` — synced from Clover; has `cloverItemId`, `category`, `name`, `price`, `isActive`
- `scheduledOrders` — customer orders with scheduling, payment, and delivery info
- `orderItems` — line items per order; has `cloverItemId` column (migration 0014 applied)
- `coupons` — discount codes; NAPOLI98 = 98% off (for testing)
- `store_settings` — key/value store for convenience fee toggle and percent

---

## 🟡 RULE 15 — Physical setup required (manual)

These steps require physical access to the Clover Station Duo:
1. **Setup → Order Manager → Print Settings → enable "Automatically print new orders" + "Print orders from all devices"**
2. Run a test order during normal store hours (10 AM–10 PM) with Force Open disabled

---

*Last updated: June 2025 — maintained by the Manus AI agent*
