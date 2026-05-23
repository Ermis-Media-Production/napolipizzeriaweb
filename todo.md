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
