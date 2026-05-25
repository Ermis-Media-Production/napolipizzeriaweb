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
