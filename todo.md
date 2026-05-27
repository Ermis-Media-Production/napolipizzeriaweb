# Napoli Pizzeria — TODO

## Core Pages
- [x] Home page with hero, services bar, pizza showcase, menu highlights, CTA
- [x] Full Menu page with all categories and sticky tab navigation
- [x] Specials page (Lunch Specials + Anytime Specials)
- [x] Order page with phone/website ordering options

## Design System
- [x] Italian trattoria color palette (red, cream, dark green, gold)
- [x] Playfair Display + Oswald + Lato typography
- [x] Responsive navbar with mobile hamburger menu
- [x] Footer with address, hours, social links

## Stripe Payment Integration
- [x] Upgrade project to full-stack (db, server, user)
- [x] Install Stripe Node.js SDK
- [x] Create Stripe checkout session server procedure
- [x] Create get session procedure for order confirmation
- [x] Stripe webhook handler with raw body middleware
- [x] Cart context (CartProvider) with add/remove/update/clear
- [x] CartDrawer component with order type selector and customer info
- [x] Cart button with item count badge in Navbar
- [x] Add to Cart (+) buttons on all menu items with price
- [x] OrderSuccess page showing payment confirmation and order details
- [x] Vitest tests for Stripe router (3 tests passing)

## Authorize.net Payment Integration
- [x] Install authorize-net Node.js SDK
- [x] Create chargeCard server procedure (opaque data / Accept.js)
- [x] Authorize.net payment form in CartDrawer with Accept.js
- [x] Vitest tests for Authorize.net router (8 tests passing)

## Uber Direct Delivery Integration
- [x] Set Uber Direct credentials as project secrets (Customer ID, Client ID, Client Secret)
- [x] Create uberDirectRouter with getQuote, createDelivery, getDelivery, cancelDelivery procedures
- [x] Export _resetTokenCache helper for test isolation
- [x] OrderSuccess page: show Uber Direct tracking card with real-time tracking URL when delivery_id & tracking_url present in URL params
- [x] Vitest tests for Uber Direct router (11 tests passing)

## Clover POS Integration
- [x] Store Clover API token and Merchant ID as project secrets
- [x] Create cloverSync.ts shared helper (pushOrderToClover)
- [x] Create cloverRouter with createOrder, getOrder, and listOrders procedures
- [x] Register cloverRouter in routers.ts
- [x] Wire Clover sync into Authorize.net chargeCard (fire-and-forget after payment)
- [x] Wire Clover sync into Stripe webhook checkout.session.completed
- [x] Add Clover env config (CLOVER_ENV) to env.ts
- [x] Vitest tests for Clover router (15 tests passing)

## Follow-Up Features (Round 3)
- [x] Admin Orders panel (/admin/orders) — list Clover orders with status, customer, items, total
- [x] Admin route guard (role=admin) in App.tsx for /admin/* routes
- [x] Owner notification via notifyOwner inside pushOrderToClover on every new order
- [x] Uber Direct quote in CartDrawer — show delivery fee before checkout when order type is delivery
- [x] Auto-dispatch Uber Direct createDelivery after successful Authorize.net payment
- [x] Auto-dispatch Uber Direct createDelivery after Stripe payment (via OrderSuccess + session metadata)
- [x] All 38 Vitest tests passing (Stripe 3, Authorize.net 8, Uber Direct 11, Clover 15, Auth 1)

## Coupon / Discount System
- [x] Add `coupons` table to drizzle schema (code, discountPercent, isActive, usageLimit, usageCount)
- [x] Seed 98% discount coupon (code: NAPOLI98) in DB migration
- [x] Create couponRouter with validateCoupon procedure (public) and createCoupon procedure (admin)
- [x] Add coupon input field to CartDrawer with "Apply" button
- [x] Show discount line in CartDrawer order summary when coupon is applied
- [x] Pass discounted total to Stripe createCheckoutSession
- [x] Apply discount to Authorize.net chargeCard amount
- [x] Call coupon.redeem after successful Authorize.net payment
- [x] Vitest tests for coupon router (15 dedicated coupon tests)
- [x] Include delivery fee as Stripe line item so charged total matches CartDrawer grand total
- [x] All 62 Vitest tests passing (Stripe 3, Authorize.net 8, Uber Direct 11, Clover 15, DoorDash 7, Coupon 15, Auth 1 + Doordash 2)

## DoorDash Drive Integration + Dual Delivery Provider
- [x] Research DoorDash Drive API (JWT auth, quote, create delivery)
- [x] Store DoorDash credentials as secrets (DOORDASH_DEVELOPER_ID, DOORDASH_KEY_ID, DOORDASH_SIGNING_SECRET)
- [x] Create doordash.ts server router (getQuote, createDelivery, getDelivery)
- [x] Register doordashRouter in routers.ts
- [x] Update CartDrawer: address input field triggers real-time quotes from both Uber Direct and DoorDash
- [x] CartDrawer: show both provider cards with logos, ETA, and cost — let customer select one
- [x] Wire DoorDash createDelivery into Authorize.net chargeCard flow
- [x] Wire DoorDash createDelivery into Stripe webhook + OrderSuccess flow
- [x] Update OrderSuccess to show DoorDash tracking URL when DoorDash was selected
- [x] Vitest tests for DoorDash router (47 total tests passing)

## Convenience Fee + Nevada Sales Tax
- [x] Add CONVENIENCE_FEE_RATE (3%) and NV_SALES_TAX_RATE (8.375%) constants to shared/const.ts
- [x] CartDrawer: compute convenienceFee (3% of subtotal) and salesTax (8.375% of subtotal) and display as separate line items in order summary
- [x] CartDrawer: grand total = subtotal + convenienceFee + salesTax + deliveryFee - discount
- [x] Stripe: add Convenience Fee and Sales Tax as separate Stripe line items in createCheckoutSession
- [x] Authorize.net: include convenienceFee and salesTax in the charged amount
- [x] All 62 Vitest tests still passing after changes

## Convenience Fee Settings Panel
- [x] Add `store_settings` table to drizzle schema (key, value, updatedAt)
- [x] Seed default row: convenience_fee_enabled=true, convenience_fee_percent=3
- [x] Run pnpm db:push to apply schema
- [x] Create settingsRouter: getConvenienceFee (public), updateConvenienceFee (admin-only)
- [x] Build admin Settings page (/admin/settings) with enable/disable toggle and % input
- [x] Add Settings nav item to admin sidebar (AdminOrders header)
- [x] CartDrawer: fetch live fee config via trpc.settings.getConvenienceFee instead of hardcoded constant
- [x] CartDrawer: re-compute convenienceFee reactively when config loads
- [x] All 62 Vitest tests still passing after changes

## Delivery Simplification
- [x] Remove DoorDash from CartDrawer — Uber Direct only
- [x] Auto-trigger Uber Direct quote on address input (debounced 800ms, no button needed)

## Pizza Customizer Modal
- [x] Build PizzaCustomizerModal: Step 1 size (10"-36"), Step 2 crust (Regular/Thin/Stuffed), Step 3 toppings (+$1.50 each), Step 4 notes + add to cart
- [x] Wire modal into pizza section in Menu.tsx (specialty pizzas + build-your-own)
- [x] Show toppings count badge and total price update in real time

## Children's Menu & Beverages Visual Redesign
- [x] Children's Menu: distinct blue/playful background with kid-friendly icons
- [x] Beverages: dark/cool background with drink icons, separated from food sections

## Admin Orders — Order Details Visibility
- [x] Show item description (flavor, Half & Half, toppings, notes) under each line item in AdminOrders
- [x] Highlight special notes in a distinct color/badge so kitchen staff sees them clearly

## Catering Page
- [x] Research Las Vegas catering market — 3 niches identified: Corporate, Private Events, Sports/Game Day
- [x] Create cateringRouter with submitInquiry procedure (notifyOwner + email to info@napolipizzeria.net)
- [x] Build Catering.tsx page with hero, market stats, 3 packages, contact form, and Why Napoli section
- [x] Add /catering route in App.tsx
- [x] Add "Catering" nav link in NapoliNavbar (green button, between Specials and Order Online)

## Scheduled Orders System (Phase 5-9)
- [x] Add scheduledOrders and orderItems tables to drizzle schema
- [x] Run pnpm db:push to apply schema migration
- [x] Create ordersRouter: storeStatus, availableSlots, createOrder, getOrder, listOrders procedures
- [x] Create orderRefundsRouter: cancelItem (partial refund), cancelOrder (full refund) with 1-hour cutoff
- [x] Register ordersRouter and orderRefundsRouter in routers.ts
- [x] CartDrawer: store-closed banner with next opening time countdown
- [x] CartDrawer: OrderScheduler component (date picker + time slot grid with capacity)
- [x] CartDrawer: OrderPoliciesNote (cancellation/modification policy shown before payment)
- [x] CartDrawer: createOrder mutation called after successful Authorize.net payment
- [x] My Order page (/my-order/:orderRef): view order details, cancel items, cancel full order
- [x] My Order page: enforce 1-hour cancellation cutoff with clear error message
- [x] OrderSuccess: show "Track & Manage Your Order" link when orderRef is available
- [x] Admin Orders panel: tabs for Clover POS orders and Scheduled Orders
- [x] Admin Orders: capacity visualization by hour slot
- [x] Admin Orders: update order status (preparing, ready, completed)
- [x] Re-enable Stripe as payment option in CartDrawer (alongside Authorize.net)
- [x] Stripe createCheckoutSession: accept and store scheduling metadata
- [x] Stripe webhook: create scheduledOrders row after payment.session.completed
- [x] Stripe getOrderRefBySession: lookup orderRef by Stripe session ID
- [x] OrderSuccess: poll getOrderRefBySession every 3s until orderRef is available (Stripe flow)
- [x] Restaurant cancellation policy: cancellations/modifications only accepted up to 1 hour before scheduled time; otherwise call the restaurant

## Stripe Re-enabled (alongside Clover)
- [x] CartDrawer: payment method selector (Stripe vs Clover) with visual toggle
- [x] CartDrawer: Stripe checkout flow calls trpc.stripe.createCheckoutSession
- [x] CartDrawer: Clover checkout flow calls trpc.cloverCheckout.createSession
- [x] OrderSuccess: detect payment=stripe in URL params, set stripeSessionId
- [x] OrderSuccess: poll trpc.stripe.getOrderRefBySession until orderRef available
- [x] OrderSuccess: load trpc.stripe.getSession for display data (name, total, orderType)
- [x] OrderSuccess: auto-dispatch Uber Direct for Stripe delivery orders
- [x] OrderSuccess: show correct payment label (Paid via Stripe / Clover / Authorize.net)
- [x] TypeScript check passing (0 errors)
- [x] DB schema migration applied (menuItems, modifierGroups, modifierOptions, itemModifierGroups tables)

## Admin Panel — Full CRUD + Login
- [x] Server: menuItems CRUD procedures (list, create, update, delete, uploadPhoto)
- [x] Server: modifierGroups + modifierOptions CRUD + assign/unassign to items
- [x] Admin login page with Manus OAuth + role guard (admin only) via AdminLayout
- [x] Admin dashboard: stats, recent orders, quick actions (/admin/dashboard)
- [x] Admin menu manager: list by category, add/edit/delete items, photo upload, print label selector (/admin/menu)
- [x] Admin modifier manager: create groups, add options with price, assign to items (/admin/modifiers)
- [x] Wire admin routes in App.tsx: /admin, /admin/dashboard, /admin/orders, /admin/menu, /admin/modifiers, /admin/settings
- [x] Wrap AdminOrders and AdminSettings with AdminLayout (remove old custom headers)
- [x] TypeScript check passing (0 errors)
- [x] 66/67 tests passing (1 legacy Authorize.net prod test fails due to DNS in sandbox)

## Burger Modifiers & Interactive Menu
- [x] napoliData: separate BURGER_EXTRAS (Cheese $1, Bacon $1, Avocado $1) from BURGER_BREAD_OPTIONS (Regular / Gluten Free — both free)
- [x] BurgerCustomizerModal: added Step 3 (Bread selection) between Size and Sauces
- [x] BurgerCustomizerModal: Gluten Free Bread shown as free option with GF badge
- [x] BurgerCustomizerModal: extras redesigned as 3-column grid with emoji icons (🧀🥓🥑)
- [x] BurgerCustomizerModal: supports preselectedBurger + preselectedSize to skip steps 1-2
- [x] BurgerCustomizerModal: price breakdown shown in footer (base + fries + extras)
- [x] Menu.tsx BurgerRow: buttons now open BurgerCustomizerModal with pre-selected burger+size instead of direct add-to-cart
- [x] Menu.tsx burger section header: shows GF badge + add-on chips (Cheese $1, Bacon $1, Avocado $1)
- [x] server/stripe.ts: CartItemSchema now includes description field
- [x] server/stripe.ts: description preserved in metadata serialization, getSession, and orderItems insertion
- [x] TypeScript check: 0 errors
- [x] Tests: 66/67 passing

## Stripe-Only Payment (Clover & Authorize.net removed from checkout)
- [x] CartDrawer: removed payment method selector, Stripe is the only checkout path
- [x] CartDrawer: removed all Clover checkout mutation and handleCloverCheckout logic
- [x] CartDrawer: payment info note updated to "Stripe only" (cards, Apple Pay, Google Pay)
- [x] CartDrawer: checkout button always blue (Stripe color), no conditional Clover green
- [x] server/routers.ts: removed authorizeNetRouter and cloverCheckoutRouter from app router
- [x] server/_core/index.ts: removed Clover webhook route and import
- [x] OrderSuccess: rewritten Stripe-only — removed Clover polling, Clover Uber dispatch, Authorize.net legacy state
- [x] OrderSuccess: "Paid via Stripe" badge, clean Stripe-only display logic
- [x] orderRefunds router kept (used by MyOrder page for customer cancellations)
- [x] TypeScript: 0 errors
- [x] Tests: 66/67 passing (only legacy Authorize.net prod test fails — not related to changes)

## Embedded Stripe Card Form (Payment Element in CartDrawer)
- [x] Fix Stripe webhook URL to production domain (tradevault-brxvwswy.manus.space)
- [x] Install @stripe/react-stripe-js and @stripe/stripe-js
- [x] Server: createPaymentIntent procedure (returns clientSecret + paymentIntentId)
- [x] Server: webhook handles payment_intent.succeeded to create scheduledOrders row
- [x] Server: getPaymentIntentDetails procedure (returns same shape as getSession for OrderSuccess)
- [x] CartDrawer: embedded Stripe Payment Element (card number, expiry, CVC) — no redirect
- [x] CartDrawer: 20-mile radius geo-validation for delivery addresses (Manus Maps proxy)
- [x] CartDrawer: block orders from outside Las Vegas metro area with friendly error message
- [x] OrderSuccess: support ?payment=stripe&payment_intent=pi_xxx param (embedded flow)
- [x] OrderSuccess: poll getOrderRefByPaymentIntent for embedded flow
- [x] OrderSuccess: getPaymentIntentDetails for display (name, total, orderType)
- [x] TypeScript: 0 errors, 66/67 tests passing
- [x] Checkpoint saved: 8e6cbf3f

## Address Autocomplete in Checkout
- [x] Build AddressAutocomplete component using Google Places API (Manus proxy)
- [x] Load Google Maps JS SDK with places library (singleton loader, no duplicate scripts)
- [x] Show dropdown suggestions as user types (debounced 300ms, min 3 chars)
- [x] Bias suggestions toward Las Vegas metro (50km radius bias)
- [x] On selection: auto-fill city, state, ZIP from place geometry components
- [x] Trigger 20-mile radius check immediately using precise lat/lng (no extra geocode call)
- [x] Trigger Uber Direct quote immediately after valid address selection
- [x] Visual feedback: MapPin icon → CheckCircle2 when address confirmed
- [x] "Powered by Google" attribution in dropdown (required by ToS)
- [x] TypeScript: 0 errors, 66/67 tests passing

## Elavon Payment Gateway Integration (Sandbox Mode)
- [x] Add ELAVON_ENV to server/_core/env.ts (merchantAlias, secretKey, publicKey, baseUrl)
- [x] Set Elavon sandbox credentials as project secrets
- [x] Update drizzle schema: add "elavon" to paymentMethod enum + elavonSessionId + elavonTransactionId columns
- [x] Run pnpm db:push to apply schema migration
- [x] Create server/elavon.ts: createPaymentSession (POST to Elavon /orders + /payment-sessions), getOrderRefBySession, getOrderDetails procedures
- [x] Register elavonRouter in server/routers.ts
- [x] CartDrawer: add Elavon as payment option alongside Stripe (payment method selector)
- [x] CartDrawer: Elavon flow calls trpc.elavon.createPaymentSession and redirects to Elavon hosted page
- [x] OrderSuccess: detect payment=elavon in URL params, poll trpc.elavon.getOrderRefBySession
- [x] OrderSuccess: show "Paid via Elavon" badge for Elavon payments
- [x] TypeScript: 0 errors after integration
- [x] Tests: 66/67 passing (1 legacy Authorize.net prod test unrelated to Elavon)

## Anytime Specials Interactive Customizer
- [x] Research Clover soda can flavors and existing pizza customizer logic
- [x] Build SpecialCustomizerModal: multi-step flow for all 19 specials
  - [x] Multi-pizza step: size/crust/cut/toppings/half-&-half per pizza (1 free topping, extras priced by size)
  - [x] Soda step: 2L bottle flavors (Coca Cola, Sprite, Diet Coke, Dr Pepper) and can flavors from Clover
  - [x] Wings/fingers step: sauce selector + half & half for ≥10pc orders
  - [x] Other combo components: extras auto-added to order description
- [x] Wire SpecialCustomizerModal into Menu.tsx AnytimeSpecialRow (replace + button with modal trigger)
- [x] TypeScript: 0 errors after changes
- [x] Checkpoint saved

## Anytime Specials — Follow-up Improvements
- [x] Fix Special #12: already correct (10" pizza) — no change needed
- [x] Wire SpecialCustomizerModal into /specials page (Specials.tsx) so customers can order from there too
- [x] Add header photo to Anytime Specials section in Menu.tsx (pizza + wings combo photo)
- [x] TypeScript: 0 errors after changes
- [x] Checkpoint saved

## Daily Special Rotating Banner (Home Page)
- [x] Define list of featured specials (top picks from ANYTIME_SPECIALS) with emoji/icon
- [x] Build DailySpecialBanner component: auto-rotates every 5s, smooth slide/fade transition, shows special number, name, price, and "Order Now" CTA
- [x] Add prev/next arrow controls and dot indicators for manual navigation
- [x] Clicking "Order Now" links to /specials page
- [x] Place banner at the very top of Home.tsx (below NapoliNavbar, above hero)
- [x] TypeScript: 0 errors
- [x] Checkpoint saved

## Reservations System (Rename Catering → Reservations)
- [x] Read existing Catering page, schema, and routers
- [x] Add reservations table to drizzle schema (id, type: dine-in/pickup/delivery, date, time, partySize, name, phone, email, notes, status, createdAt)
- [x] Run pnpm db:push to apply migration
- [x] Build server/reservations.ts: createReservation, listReservations (admin), updateStatus, getAvailableSlots procedures
- [x] Register reservationsRouter in server/routers.ts
- [x] Build Reservations page: two-tab layout (Today's Order / Future Reservation)
  - [x] Today tab: same-day order with time picker (10 AM–9:30 PM Las Vegas time), service type, contact info
  - [x] Future tab: calendar date picker + time picker, party size, service type, full contact form, notes
  - [x] Las Vegas timezone validation (America/Los_Angeles), cutoff 9:30 PM for same-day
  - [x] Owner notification on new reservation submission
- [x] Rename Catering → Reservations in NapoliNavbar.tsx
- [x] Update App.tsx route: added /reservations route (kept /catering for backward compat)
- [x] TypeScript: 0 errors
- [x] Checkpoint saved

## Home Page Follow-up Fixes
- [x] Add rotating Daily Special banner at the top of the Home page
- [x] Update "CATERING" icon/label in the services strip on Home to "RESERVATIONS" (link to /reservations)
- [x] Checkpoint saved

## Follow-up Suggestions (from last delivery)
- [x] Add interactive customizer (LunchCustomizerModal) to Lunch Specials so customers can order from /menu and /specials
- [x] Add Anytime Specials featured section on Home page with top specials, prices, and "Order" button linking to /specials
- [x] Checkpoint saved

## Stripe-Only Payment Cleanup
- [x] Read CartDrawer, stripe.ts, OrderSuccess, schema to understand current state
- [x] Remove Elavon payment option from CartDrawer (Stripe only)
- [x] Remove Clover POS tab from AdminOrders (replaced with Stripe-only view)
- [x] Remove pushOrderToClover calls from stripe.ts webhook handler
- [x] Remove clover and elavon router registrations from routers.ts
- [x] Verify STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY are set (confirmed)
- [x] Stripe webhook configured for production domain (napolipizzerianorthlasvegas.com)
- [x] TypeScript: 0 errors
- [x] Checkpoint saved

## Restaurant Hours Text Fix
- [x] OrderScheduler.tsx: removed "9:30 PM" from all customer-facing text — restaurant hours shown as 10:00 AM – 10:00 PM
- [x] Reservations.tsx: removed "9:30 PM" from all customer-facing text — internal cutoff kept as code constant only
- [x] All public-facing text consistently shows 10:00 AM – 10:00 PM as restaurant hours

## Store Hours Enforcement in CartDrawer
- [x] CartDrawer: query storeStatus (Las Vegas time) and show closed-store banner for pickup/delivery/dine-in when restaurant is closed
- [x] Closed banner shows: "We're Currently Closed", restaurant hours 10 AM – 10 PM, next opening time
- [x] Closed banner CTA: "Schedule Order for [next open time]" button switches to scheduled order type
- [x] Closed banner secondary CTA: link to Reservations page for events outside hours
- [x] Proceed to Payment button is disabled when store is closed and order type is not "scheduled"
- [x] Scheduled order type bypasses closed-store check (customers can always schedule for future)
